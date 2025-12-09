import express from 'express';
import { get, all, run } from '../database.js';
import { getAuthorizedClient, ensureDedicatedCalendar, updateEventWithBooking } from '../google.js';

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
            const origin = 'http://localhost:3000';
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

      // Update Google Calendar event if exists
      try {
        if (slot.google_event_id) {
          const auth = await getAuthorizedClient(slot.coach_id);
          if (auth) {
            const { client, tokenRow } = auth;
            const calendarId = tokenRow.calendar_id;
            if (calendarId) {
              const origin = 'http://localhost:3000';
              await updateEvent(client, calendarId, slot.google_event_id, {
                start_time: updatedSlot.start_time,
                end_time: updatedSlot.end_time,
                duration_minutes: 90,
                id: updatedSlot.id
              }, `${origin}/book/${slot.booking_link}`);
            }
          }
        }
      } catch (syncErr) {
        console.error('Google Calendar update failed for extended slot:', syncErr);
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

    // Update Google Calendar event if exists
    try {
      if (updatedSlot.google_event_id) {
        const auth = await getAuthorizedClient(slot.coach_id);
        if (auth) {
          const { client, tokenRow } = auth;
          const calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow));
          await updateEventWithBooking(client, calendarId, updatedSlot.google_event_id, booking);
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar update failed on booking:', syncErr);
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

export default router;

