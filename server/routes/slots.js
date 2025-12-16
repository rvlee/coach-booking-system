import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { run, get, all } from '../database.js';
import { getAuthorizedClient, ensureDedicatedCalendar, createEvent, deleteEvent, updateEvent } from '../google.js';

const router = express.Router();

// Get all slots for a coach
router.get('/', authenticateToken, async (req, res) => {
  try {
    const slots = await all(
      `SELECT s.*, 
       COUNT(b.id) as booking_count,
       CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END as is_booked
       FROM slots s
       LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'confirmed'
       WHERE s.coach_id = ?
       GROUP BY s.id
       ORDER BY s.start_time ASC`,
      [req.user.id]
    );
    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch create slots (must come before single slot route)
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Slots array is required' });
    }
    if (slots.length > 100) {
      return res.status(400).json({ error: 'Too many slots (max 100 at once)' });
    }

    // Validate all slots have required fields
    for (const slot of slots) {
      if (!slot.start_time || !slot.end_time || !slot.duration_minutes) {
        return res.status(400).json({ 
          error: `Invalid slot: missing start_time, end_time, or duration_minutes` 
        });
      }
    }

    const created = [];
    const auth = await getAuthorizedClient(req.user.id);
    let calendarId = null;
    if (auth) {
      const { client, tokenRow } = auth;
      calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow));
      auth.calendarId = calendarId;
    }

    for (const slotReq of slots) {
      const { start_time, end_time, duration_minutes } = slotReq;
      if (!start_time || !end_time || !duration_minutes) {
        continue;
      }
      const bookingLink = uuidv4();
      const result = await run(
        'INSERT INTO slots (coach_id, start_time, end_time, duration_minutes, booking_link) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, start_time, end_time, duration_minutes, bookingLink]
      );
      let slot = await get('SELECT * FROM slots WHERE id = ?', [result.lastID]);

      // Sync to Google Calendar if connected
      try {
        if (auth && calendarId) {
          const { client } = auth;
          const origin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
          const eventId = await createEvent(client, calendarId, slot, `${origin}/book/${bookingLink}`);
          await run('UPDATE slots SET google_event_id = ? WHERE id = ?', [eventId, slot.id]);
          slot = await get('SELECT * FROM slots WHERE id = ?', [slot.id]);
        }
      } catch (syncErr) {
        console.error('Google Calendar sync failed for batch slot:', syncErr);
      }

      created.push(slot);
    }

    if (created.length === 0) {
      return res.status(400).json({ error: 'No valid slots were created' });
    }

    res.status(201).json({ slots: created });
  } catch (error) {
    console.error('Error batch creating slots:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create a new slot
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { start_time, end_time, duration_minutes } = req.body;

    if (!start_time || !end_time || !duration_minutes) {
      return res.status(400).json({ error: 'Start time, end time, and duration are required' });
    }

    // Generate unique booking link
    const bookingLink = uuidv4();

    const result = await run(
      'INSERT INTO slots (coach_id, start_time, end_time, duration_minutes, booking_link) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, start_time, end_time, duration_minutes, bookingLink]
    );

    let slot = await get('SELECT * FROM slots WHERE id = ?', [result.lastID]);

    // Sync to Google Calendar if connected
    try {
      const auth = await getAuthorizedClient(req.user.id);
      if (auth) {
        const { client, tokenRow } = auth;
        const calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow));
        const origin = req.headers.origin || 'http://localhost:3000';
        const eventId = await createEvent(client, calendarId, slot, `${origin}/book/${bookingLink}`);
        await run('UPDATE slots SET google_event_id = ? WHERE id = ?', [eventId, slot.id]);
        slot = await get('SELECT * FROM slots WHERE id = ?', [slot.id]);
      }
    } catch (syncErr) {
      console.error('Google Calendar sync failed for slot create:', syncErr);
    }

    res.status(201).json(slot);
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available slots for a coach by coach booking link (public endpoint)
router.get('/coach/:coachLink', async (req, res) => {
  try {
    const { coachLink } = req.params;
    const coach = await get(
      'SELECT id, name FROM coaches WHERE coach_booking_link = ?',
      [coachLink]
    );

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    // Get all available slots for this coach (no week restriction - clients can book any week)
    // A slot is available if:
    // 1. It has no bookings, OR
    // 2. It has one booking with willing_to_share=true and is_shared=false (can be paired)
    const slots = await all(
      `SELECT s.*, 
       COUNT(b.id) as booking_count,
       COALESCE(SUM(CASE WHEN b.willing_to_share = 1 AND b.is_shared = 0 THEN 1 ELSE 0 END), 0) as shareable_bookings,
       COALESCE(SUM(CASE WHEN b.is_shared = 1 THEN 1 ELSE 0 END), 0) as shared_bookings
       FROM slots s
       LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'confirmed'
       WHERE s.coach_id = ? AND s.is_available = 1
       GROUP BY s.id
       HAVING booking_count = 0 OR (booking_count = 1 AND shareable_bookings = 1 AND shared_bookings = 0)
       ORDER BY s.start_time ASC`,
      [coach.id]
    );

    // Filter out fully booked slots (2 bookings or 1 shared booking)
    const availableSlots = slots.filter(slot => {
      // Available if no bookings, or has 1 booking that's willing to share but not yet shared
      const bookingCount = slot.booking_count || 0;
      const shareable = slot.shareable_bookings || 0;
      const shared = slot.shared_bookings || 0;
      return bookingCount === 0 || (bookingCount === 1 && shareable === 1 && shared === 0);
    });

    res.json({
      coach_name: coach.name,
      slots: availableSlots
    });
  } catch (error) {
    console.error('Error fetching coach slots:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get slot by booking link (public endpoint) - kept for backward compatibility
router.get('/link/:bookingLink', async (req, res) => {
  try {
    const { bookingLink } = req.params;
    const slot = await get(
      `SELECT s.*, c.name as coach_name 
       FROM slots s 
       JOIN coaches c ON s.coach_id = c.id 
       WHERE s.booking_link = ? AND s.is_available = 1`,
      [bookingLink]
    );

    if (!slot) {
      return res.status(404).json({ error: 'Slot not found or not available' });
    }

    // Check if already booked
    const booking = await get(
      'SELECT * FROM bookings WHERE slot_id = ? AND status = "confirmed"',
      [slot.id]
    );

    slot.is_booked = !!booking;
    res.json(slot);
  } catch (error) {
    console.error('Error fetching slot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update slot
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, duration_minutes, is_available } = req.body;

    // Verify slot belongs to coach
    const slot = await get('SELECT * FROM slots WHERE id = ? AND coach_id = ?', [id, req.user.id]);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    await run(
      'UPDATE slots SET start_time = ?, end_time = ?, duration_minutes = ?, is_available = ? WHERE id = ?',
      [start_time || slot.start_time, end_time || slot.end_time, duration_minutes || slot.duration_minutes, is_available !== undefined ? is_available : slot.is_available, id]
    );

    let updatedSlot = await get('SELECT * FROM slots WHERE id = ?', [id]);

    // Sync to Google Calendar if connected and event exists
    try {
      if (updatedSlot.google_event_id) {
        const auth = await getAuthorizedClient(req.user.id);
        if (auth) {
          const { client, tokenRow } = auth;
          const calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow));
          const origin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
          await updateEvent(client, calendarId, updatedSlot.google_event_id, updatedSlot, `${origin}/book/${updatedSlot.booking_link}`);
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar sync failed for slot update:', syncErr);
    }

    res.json(updatedSlot);
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete slot
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify slot belongs to coach
    const slot = await get('SELECT * FROM slots WHERE id = ? AND coach_id = ?', [id, req.user.id]);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    await run('DELETE FROM slots WHERE id = ?', [id]);

    // Remove from Google Calendar if linked
    try {
      if (slot.google_event_id) {
        const auth = await getAuthorizedClient(req.user.id);
        if (auth) {
          const { client, tokenRow } = auth;
          const calendarId = tokenRow.calendar_id || (await ensureDedicatedCalendar(client, tokenRow));
          await deleteEvent(client, calendarId, slot.google_event_id);
        }
      }
    } catch (syncErr) {
      console.error('Google Calendar delete failed:', syncErr);
    }

    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

