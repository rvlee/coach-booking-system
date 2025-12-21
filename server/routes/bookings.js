import express from 'express';
import { get, all, run } from '../database.js';
import { getAuthorizedClient, ensureDedicatedCalendar, updateEventWithBooking, updateEvent } from '../google.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper function to find the immediate next slot (slot that starts when current slot ends)
async function findNextSlot(currentSlot) {
  const nextSlot = await get(
    `SELECT s.*, 
     COUNT(b.id) as booking_count
     FROM slots s
     LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'confirmed'
     WHERE s.coach_id = ? 
     AND s.is_available = 1
     AND s.start_time = ?
     GROUP BY s.id`,
    [currentSlot.coach_id, currentSlot.end_time]
  );
  return nextSlot;
}

// Create a booking (public endpoint - no auth required)
router.post('/', async (req, res) => {
  try {
    const { slot_id, client_name, client_email, client_phone, notes, willing_to_share } = req.body;

    if (!slot_id || !client_name || !client_email) {
      return res.status(400).json({ error: 'Slot ID, client name, and email are required' });
    }

    // Check if slot exists and is available
    const slot = await get('SELECT * FROM slots WHERE id = ? AND is_available = 1', [slot_id]);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found or not available' });
    }

    // Check daily booking limit
    const coach = await get('SELECT daily_booking_limit, timezone FROM coaches WHERE id = ?', [slot.coach_id]);
    if (coach && coach.daily_booking_limit !== null) {
      // Get the date of the slot in the coach's timezone
      const slotDate = new Date(slot.start_time);
      const coachTimezone = coach.timezone || 'UTC';
      
      // Convert slot date to coach's timezone for day calculation
      // Get the date string in the coach's timezone (YYYY-MM-DD format)
      const slotDateInTz = slotDate.toLocaleString('en-US', { 
        timeZone: coachTimezone, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const [month, day, year] = slotDateInTz.split('/');
      const dateStr = `${year}-${month}-${day}`;
      
      // Create start and end of day in coach's timezone
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999`);
      
      // Convert to UTC for database query
      // We need to account for timezone offset
      const tzOffset = slotDate.getTimezoneOffset() * 60000; // offset in milliseconds
      const startUTC = new Date(startOfDay.getTime() - tzOffset);
      const endUTC = new Date(endOfDay.getTime() - tzOffset);
      
      // Count bookings for this coach on this day (in coach's timezone)
      // We'll count all bookings where the slot start_time falls within the day in coach's timezone
      const allBookings = await all(
        `SELECT b.*, s.start_time
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         WHERE b.coach_id = ? 
         AND b.status = 'confirmed'`,
        [slot.coach_id]
      );
      
      // Filter bookings that fall on the same day in coach's timezone
      const dayBookings = allBookings.filter((booking) => {
        const bookingDate = new Date(booking.start_time);
        const bookingDateInTz = bookingDate.toLocaleString('en-US', { 
          timeZone: coachTimezone, 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
        const [bMonth, bDay, bYear] = bookingDateInTz.split('/');
        const bDateStr = `${bYear}-${bMonth}-${bDay}`;
        return bDateStr === dateStr;
      });
      
      const bookingCount = dayBookings.length;
      if (bookingCount >= coach.daily_booking_limit) {
        return res.status(400).json({ 
          error: `Daily booking limit reached. Maximum ${coach.daily_booking_limit} bookings per day.` 
        });
      }
    }

    // Check if slot is already booked
    const existingBookings = await all(
      'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
      [slot_id]
    );

    let isShared = false;
    let sharedWithBookingId = null;
    const MAX_SHARED_BOOKINGS = 4; // Maximum 4 people can share a slot

    // Check booking availability based on willing_to_share
    if (existingBookings.length > 0) {
      // Check if all existing bookings are willing to share
      const allWillingToShare = existingBookings.every(b => b.willing_to_share === 1);
      const hasSharedBookings = existingBookings.some(b => b.is_shared === 1);
      const currentSharedCount = existingBookings.length;
      
      if (!willing_to_share) {
        // User doesn't want to share, but slot is already booked
        return res.status(400).json({ error: 'This slot is already booked' });
      }
      
      if (!allWillingToShare) {
        // Some existing bookings don't want to share
        return res.status(400).json({ error: 'This slot is already booked by someone who does not want to share' });
      }
      
      if (currentSharedCount >= MAX_SHARED_BOOKINGS) {
        // Slot is already fully booked (4 people)
        return res.status(400).json({ error: 'This slot is already fully booked as a shared class (4 people)' });
      }
      
      // User is willing to share and slot has space (less than 4 bookings)
      // Check if next slot is available (for requirement #2)
      const nextSlot = await findNextSlot(slot);
      
      if (nextSlot) {
        // Next slot exists - check if it's booked
        const nextSlotBookings = await all(
          'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
          [nextSlot.id]
        );
        
        if (nextSlotBookings.length > 0) {
          // Next slot is already booked - cannot make this a shared class
          return res.status(400).json({ error: 'Cannot create shared class: the following slot is already booked' });
        }
        
        // Next slot exists and is empty - we'll delete it after creating the booking
      }
      
      // Mark this as a shared booking
      isShared = true;
      // Link to the first existing booking (they're all in the same shared group)
      sharedWithBookingId = existingBookings[0].id;
      
      // Mark all existing bookings as shared
      for (const existingBooking of existingBookings) {
        await run(
          'UPDATE bookings SET is_shared = 1 WHERE id = ?',
          [existingBooking.id]
        );
      }
    }

    // Extend slot duration to 90 minutes when it becomes a shared class (2+ people)
    // Duration stays at 90 minutes for 2, 3, or 4 people
    let updatedSlot = slot;
    if (isShared && slot.duration_minutes === 60) {
      // First time becoming shared - extend to 90 minutes
      const newEndTime = new Date(slot.start_time);
      newEndTime.setMinutes(newEndTime.getMinutes() + 90);

      await run(
        'UPDATE slots SET end_time = ?, duration_minutes = 90 WHERE id = ?',
        [newEndTime.toISOString(), slot_id]
      );

      updatedSlot = await get('SELECT * FROM slots WHERE id = ?', [slot_id]);
    }
      
      // Requirement #2: If next slot exists and is empty, delete it
      const nextSlot = await findNextSlot(slot);
      if (nextSlot) {
        const nextSlotBookings = await all(
          'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
          [nextSlot.id]
        );
        
        if (nextSlotBookings.length === 0) {
          // Next slot is empty - delete it
          try {
            // Delete from Google Calendar if it has an event
            if (nextSlot.google_event_id) {
              const auth = await getAuthorizedClient(slot.coach_id);
              if (auth) {
                const { client, tokenRow } = auth;
                const calendarId = tokenRow.calendar_id;
                if (calendarId) {
                  const { deleteEvent } = await import('../google.js');
                  await deleteEvent(client, calendarId, nextSlot.google_event_id);
                }
              }
            }
            // Delete the slot
            await run('DELETE FROM slots WHERE id = ?', [nextSlot.id]);
            console.log(`Deleted next slot ${nextSlot.id} because shared booking was created`);
          } catch (deleteErr) {
            console.error('Error deleting next slot:', deleteErr);
            // Don't fail the booking if slot deletion fails
          }
        }
      }
    }

    // Create booking
    const result = await run(
      'INSERT INTO bookings (slot_id, coach_id, client_name, client_email, client_phone, notes, willing_to_share, is_shared, shared_with_booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [slot_id, slot.coach_id, client_name, client_email, client_phone || null, notes || null, willing_to_share ? 1 : 0, isShared ? 1 : 0, sharedWithBookingId]
    );

    const booking = await get('SELECT * FROM bookings WHERE id = ?', [result.lastID]);

    // If this is paired with an existing booking, update the existing booking's shared_with_booking_id
    if (isShared && sharedWithBookingId) {
      await run(
        'UPDATE bookings SET shared_with_booking_id = ? WHERE id = ?',
        [booking.id, sharedWithBookingId]
      );
    }

    // Update Google Calendar event if exists - add all clients as attendees and send updates to everyone
    // The event is on the coach's calendar, so the coach is automatically the organizer/host
    // When second person books (shared class), this will update the event with both clients
    try {
      if (updatedSlot.google_event_id) {
        const auth = await getAuthorizedClient(slot.coach_id);
        if (auth) {
          const { client, tokenRow } = auth;
          const calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow, slot.coach_id));
          
          // Get coach email to verify organizer
          const coach = await get('SELECT email FROM coaches WHERE id = ?', [slot.coach_id]);
          
          // Get all bookings for this slot to include all attendees (for shared classes)
          // This will include both clients when the second person books
          const allSlotBookings = await all(
            'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
            [slot_id]
          );
          
          console.log(`Updating Google Calendar event for slot ${slot_id} with ${allSlotBookings.length} booking(s):`, 
            allSlotBookings.map(b => `${b.client_name} (${b.client_email})`).join(', '));
          
          // If this is a shared class (second booking), also update the event time to 90 minutes
          const needsTimeUpdate = isShared && updatedSlot.duration_minutes === 90;
          
          // Update event with all bookings so all clients receive invites
          // For shared classes, this will:
          // 1. Add both clients as attendees
          // 2. Update event title to show both names
          // 3. Update end time to 90 minutes (if needed)
          // 4. Send updates to all attendees (both clients) AND the coach
          // The coach remains the organizer since the event is on their calendar
          await updateEventWithBooking(
            client, 
            calendarId, 
            updatedSlot.google_event_id, 
            booking, 
            allSlotBookings, 
            coach?.email,
            needsTimeUpdate ? { start_time: updatedSlot.start_time, end_time: updatedSlot.end_time } : null
          );
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar update failed on booking:', syncErr);
      // Don't fail the booking if calendar update fails
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await get(
      `SELECT b.*, s.start_time, s.end_time, s.duration_minutes, c.name as coach_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN coaches c ON b.coach_id = c.id
       WHERE b.id = ?`,
      [id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete/Cancel booking
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the booking with slot info
    const booking = await get(
      `SELECT b.*, s.start_time, s.end_time, s.duration_minutes, s.google_event_id, s.coach_id
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       WHERE b.id = ? AND b.coach_id = ?`,
      [id, req.user.id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const slotId = booking.slot_id;
    const wasShared = booking.is_shared === 1;
    const sharedWithBookingId = booking.shared_with_booking_id;
    const slotDuration = booking.duration_minutes; // Get from booking query result

    // Delete the booking
    await run('DELETE FROM bookings WHERE id = ?', [id]);

    // If this was a shared booking, check if we need to adjust the slot duration
    if (wasShared) {
      // Check remaining bookings for this slot
      const remainingBookings = await all(
        'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
        [slotId]
      );

      const slot = await get('SELECT * FROM slots WHERE id = ?', [slotId]);
      if (!slot) {
        return res.status(404).json({ error: 'Slot not found' });
      }
      
      // Revert to 60 minutes only if no shared bookings remain (0 or 1 booking)
      // If 2+ bookings remain, keep at 90 minutes
      if (remainingBookings.length <= 1 && slot.duration_minutes === 90) {
        // Revert to 60 minutes (from original start time)
        const originalEndTime = new Date(slot.start_time);
        originalEndTime.setMinutes(originalEndTime.getMinutes() + 60);

        await run(
          'UPDATE slots SET end_time = ?, duration_minutes = 60 WHERE id = ?',
          [originalEndTime.toISOString(), slotId]
        );
      }

      // If only one booking remains (or none), mark it as no longer shared
      if (remainingBookings.length <= 1) {
        if (remainingBookings.length === 1) {
          const remainingBooking = remainingBookings[0];
          await run(
            'UPDATE bookings SET is_shared = 0, shared_with_booking_id = NULL WHERE id = ?',
            [remainingBooking.id]
          );
        }
      } else {
        // Update shared_with_booking_id references for remaining bookings
        // All remaining bookings should still be marked as shared
        for (let i = 0; i < remainingBookings.length; i++) {
          const booking = remainingBookings[i];
          // Link to the first booking in the group (or next one if this is the first)
          const linkToId = i === 0 ? remainingBookings[1]?.id : remainingBookings[0].id;
          if (linkToId) {
            await run(
              'UPDATE bookings SET is_shared = 1, shared_with_booking_id = ? WHERE id = ?',
              [linkToId, booking.id]
            );
          }
        }
      }

          // Update Google Calendar event
          try {
            const updatedSlot = await get('SELECT * FROM slots WHERE id = ?', [slotId]);
            if (updatedSlot && updatedSlot.google_event_id) {
              const auth = await getAuthorizedClient(booking.coach_id);
              if (auth) {
                const { client, tokenRow } = auth;
                const calendarId = tokenRow.calendar_id;
                if (calendarId) {
                  // Get all remaining bookings for the event
                  const allRemainingBookings = await all(
                    'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
                    [slotId]
                  );
                  
                  const coach = await get('SELECT email FROM coaches WHERE id = ?', [booking.coach_id]);
                  
                  // Update event with remaining bookings (or no bookings if all cancelled)
                  // Event duration reverts to 60 minutes, but subsequent slots stay pushed
                  await updateEventWithBooking(
                    client,
                    calendarId,
                    updatedSlot.google_event_id,
                    remainingBookings.length > 0 ? remainingBookings[0] : null,
                    allRemainingBookings,
                    coach?.email,
                    { start_time: updatedSlot.start_time, end_time: updatedSlot.end_time }
                  );
                }
              }
            }
          } catch (syncErr) {
            console.error('Google Calendar update failed on booking cancellation:', syncErr);
          }
      } else if (remainingBookings.length === 2) {
        // Still two bookings remain, but need to update shared_with_booking_id references
        // The cancelled booking's partner needs to point to the other remaining booking
        const cancelledId = parseInt(id);
        const otherBooking = remainingBookings.find(b => b.id !== cancelledId);
        const otherOtherBooking = remainingBookings.find(b => b.id !== cancelledId && b.id !== otherBooking?.id);
        
        if (otherBooking && sharedWithBookingId) {
          // If the cancelled booking was paired with sharedWithBookingId, update that booking
          if (otherOtherBooking && otherBooking.id === sharedWithBookingId) {
            // Update the other booking to point to the remaining one
            await run(
              'UPDATE bookings SET shared_with_booking_id = ? WHERE id = ?',
              [otherOtherBooking.id, otherBooking.id]
            );
            await run(
              'UPDATE bookings SET shared_with_booking_id = ? WHERE id = ?',
              [otherBooking.id, otherOtherBooking.id]
            );
          }
        }
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

