import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { get, all, run } from '../database.js';

const router = express.Router();

// Get coach profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const coach = await get('SELECT id, email, name, created_at, coach_booking_link FROM coaches WHERE id = ?', [req.user.id]);
    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.json(coach);
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or create coach booking link
router.get('/booking-link', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching booking link for coach ID:', req.user.id);
    
    // First, try to get coach - handle case where column might not exist
    let coach;
    try {
      coach = await get('SELECT id, coach_booking_link FROM coaches WHERE id = ?', [req.user.id]);
      console.log('Coach found:', coach ? 'yes' : 'no');
      if (coach) {
        console.log('Current booking link:', coach.coach_booking_link || 'none');
      }
    } catch (queryError) {
      console.error('Query error:', queryError.message);
      // If column doesn't exist, try without it first
      if (queryError.message && queryError.message.includes('no such column')) {
        console.log('coach_booking_link column missing, adding it...');
        try {
          // SQLite doesn't support adding UNIQUE constraint directly
          // Uniqueness is handled by application (UUIDs are unique)
          await run('ALTER TABLE coaches ADD COLUMN coach_booking_link TEXT');
          console.log('Column added successfully');
          // Retry the query
          coach = await get('SELECT id FROM coaches WHERE id = ?', [req.user.id]);
          if (coach) {
            coach.coach_booking_link = null;
          }
        } catch (alterError) {
          console.error('Failed to add coach_booking_link column:', alterError);
          return res.status(500).json({ 
            error: 'Database schema error. Please restart the server.' 
          });
        }
      } else {
        throw queryError;
      }
    }
    
    if (!coach) {
      console.log('Coach not found for ID:', req.user.id);
      return res.status(404).json({ 
        error: 'Coach not found. Your session may be invalid. Please log out and log back in.' 
      });
    }

    // Generate booking link if it doesn't exist
    if (!coach.coach_booking_link) {
      const bookingLink = uuidv4();
      console.log('Generating new booking link:', bookingLink);
      try {
        await run('UPDATE coaches SET coach_booking_link = ? WHERE id = ?', [bookingLink, req.user.id]);
        coach.coach_booking_link = bookingLink;
        console.log('Booking link saved successfully');
      } catch (updateError) {
        console.error('Failed to update booking link:', updateError);
        throw updateError;
      }
    }

    console.log('Returning booking link:', coach.coach_booking_link);
    res.json({ booking_link: coach.coach_booking_link });
  } catch (error) {
    console.error('Error getting coach booking link:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Internal server error'
      });
    }
  }
});

// Get all bookings for coach (only confirmed bookings)
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await all(
      `SELECT b.*, s.start_time, s.end_time, s.duration_minutes, s.booking_link,
       b2.client_name as shared_with_name, b2.client_email as shared_with_email
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       LEFT JOIN bookings b2 ON b.shared_with_booking_id = b2.id OR b.id = b2.shared_with_booking_id
       WHERE b.coach_id = ? AND b.status = 'confirmed'
       ORDER BY s.start_time DESC`,
      [req.user.id]
    );
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coach settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const coach = await get(
      'SELECT timezone, daily_booking_limit, language FROM coaches WHERE id = ?',
      [req.user.id]
    );
    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.json({
      timezone: coach.timezone || null,
      daily_booking_limit: coach.daily_booking_limit,
      language: coach.language || 'en'
    });
  } catch (error) {
    console.error('Error fetching coach settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update coach settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { timezone, daily_booking_limit, language } = req.body;
    
    // Validate timezone
    if (timezone && !Intl.supportedValuesOf('timeZone').includes(timezone)) {
      return res.status(400).json({ error: 'Invalid timezone' });
    }
    
    // Validate language
    if (language && !['en', 'zh-TW'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language. Supported: en, zh-TW' });
    }
    
    // Validate daily limit
    if (daily_booking_limit !== null && daily_booking_limit !== undefined) {
      const limit = parseInt(daily_booking_limit, 10);
      if (isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'Daily booking limit must be a positive number' });
      }
    }
    
    await run(
      `UPDATE coaches 
       SET timezone = COALESCE(?, timezone),
           daily_booking_limit = ?,
           language = COALESCE(?, language)
       WHERE id = ?`,
      [timezone || null, daily_booking_limit !== undefined ? daily_booking_limit : null, language || null, req.user.id]
    );
    
    const updated = await get(
      'SELECT timezone, daily_booking_limit, language FROM coaches WHERE id = ?',
      [req.user.id]
    );
    
    res.json({
      timezone: updated.timezone || null,
      daily_booking_limit: updated.daily_booking_limit,
      language: updated.language || 'en'
    });
  } catch (error) {
    console.error('Error updating coach settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

