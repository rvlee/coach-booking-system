import express from 'express';
import { get, all, run } from '../database.js';
import { getAuthorizedClient, ensureDedicatedCalendar, updateEventWithBooking, updateEvent } from '../google.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper function to push subsequent slots by minutes
async function pushSubsequentSlots(slotId, minutesToPush, coachId) {
  const slot = await get('SELECT * FROM slots WHERE id = ?', [slotId]);
  if (!slot) return;

  const slotEndTime = new Date(slot.end_time);
  
  // Get all subsequent slots for this coach that start after this slot
  const subsequentSlots = await all(
    `SELECT * FROM slots 
     WHERE coach_id = ? 
     AND start_time >= ? 
     AND id != ?
     ORDER BY start_time ASC`,
    [coachId, slot.end_time.toISOString(), slotId]
  );

  // Update each subsequent slot
  for (const subSlot of subsequentSlots) {
    const newStart = new Date(subSlot.start_time);
    newStart.setMinutes(newStart.getMinutes() + minutesToPush);
    const newEnd = new Date(subSlot.end_time);
    newEnd.setMinutes(newEnd.getMinutes() + minutesToPush);

    await run(
      'UPDATE slots SET start_time = ?, end_time = ? WHERE id = ?',
      [newStart.toISOString(), newEnd.toISOString(), subSlot.id]
    );

    // Update Google Calendar event if exists
    try {
      if (subSlot.google_event_id) {
        const auth = await getAuthorizedClient(coachId);
        if (auth) {
          const { client, tokenRow } = auth;
          const calendarId = tokenRow.calendar_id;
          if (calendarId) {
            const origin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
            await updateEvent(client, calendarId, subSlot.google_event_id, {
              start_time: newStart.toISOString(),
              end_time: newEnd.toISOString(),
              duration_minutes: subSlot.duration_minutes,
              id: subSlot.id
            }, `${origin}/book/${subSlot.booking_link}`);
          }
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar update failed for pushed slot:', syncErr);
    }
  }
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

    // Check booking availability based on willing_to_share
    if (existingBookings.length > 0) {
      const existingBooking = existingBookings[0];
      
      // If user is willing to share, check if there's already a booking with willing_to_share that's not yet shared
      if (willing_to_share && existingBooking.willing_to_share && !existingBooking.is_shared) {
        // Pair this booking with the existing one
        isShared = true;
        sharedWithBookingId = existingBooking.id;
        
        // Mark the existing booking as shared too
        await run(
          'UPDATE bookings SET is_shared = 1, shared_with_booking_id = ? WHERE id = ?',
          [null, existingBooking.id] // We'll update this booking's shared_with_booking_id after creating the new one
        );
      } else if (!willing_to_share) {
        // User doesn't want to share, but slot is already booked
        return res.status(400).json({ error: 'This slot is already booked' });
      } else if (willing_to_share && existingBooking.is_shared) {
        // Slot is already fully booked as a shared class
        return res.status(400).json({ error: 'This slot is already fully booked as a shared class' });
      } else if (willing_to_share && !existingBooking.willing_to_share) {
        // User wants to share, but existing booking doesn't
        return res.status(400).json({ error: 'This slot is already booked by someone who does not want to share' });
      }
    }

    // Only extend slot to 90 minutes if this is the second booking (shared class)
    let updatedSlot = slot;
    if (isShared && slot.duration_minutes === 60) {
      // This is the second booking, so extend the slot to 90 minutes
      const newEndTime = new Date(slot.end_time);
      newEndTime.setMinutes(newEndTime.getMinutes() + 30); // Add 30 minutes

      await run(
        'UPDATE slots SET end_time = ?, duration_minutes = 90 WHERE id = ?',
        [newEndTime.toISOString(), slot_id]
      );

      updatedSlot = await get('SELECT * FROM slots WHERE id = ?', [slot_id]);

      // Push all subsequent slots by 30 minutes
      await pushSubsequentSlots(slot_id, 30, slot.coach_id);
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
          const calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow));
          
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

    // If this was a shared booking and slot was 90 minutes, check if we need to revert the slot duration
    if (wasShared && slotDuration === 90) {
      // Check remaining bookings for this slot
      const remainingBookings = await all(
        'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
        [slotId]
      );

      // If only one booking remains (or none), revert slot to 60 minutes
      // IMPORTANT: Do NOT push subsequent slots forward - they stay where they are
      if (remainingBookings.length <= 1) {
        const slot = await get('SELECT * FROM slots WHERE id = ?', [slotId]);
        if (!slot) {
          return res.status(404).json({ error: 'Slot not found' });
        }
        
        // Revert to 60 minutes (from original start time)
        const originalEndTime = new Date(slot.start_time);
        originalEndTime.setMinutes(originalEndTime.getMinutes() + 60);

        await run(
          'UPDATE slots SET end_time = ?, duration_minutes = 60 WHERE id = ?',
          [originalEndTime.toISOString(), slotId]
        );

        // If there's a remaining booking, mark it as no longer shared
        if (remainingBookings.length === 1) {
          const remainingBooking = remainingBookings[0];
          await run(
            'UPDATE bookings SET is_shared = 0, shared_with_booking_id = NULL WHERE id = ?',
            [remainingBooking.id]
          );
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

