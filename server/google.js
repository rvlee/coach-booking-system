import { google } from 'googleapis';
import { get, run } from './database.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/google/callback'
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth env vars missing. Set GOOGLE_CLIENT_ID/SECRET.');
}

export function createOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function getAuthUrl(state = '') {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
    state
  });
}

export async function storeTokens(coachId, tokens, calendarId) {
  const existing = await get('SELECT id FROM google_tokens WHERE coach_id = ?', [coachId]);
  const expiryDate = tokens.expiry_date || tokens.expiry_date_ms || null;
  if (existing) {
    await run(
      `UPDATE google_tokens
       SET access_token = ?, refresh_token = COALESCE(?, refresh_token), scope = ?, token_type = ?, expiry_date = ?, calendar_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE coach_id = ?`,
      [tokens.access_token, tokens.refresh_token, tokens.scope, tokens.token_type, expiryDate, calendarId, coachId]
    );
  } else {
    await run(
      `INSERT INTO google_tokens (coach_id, access_token, refresh_token, scope, token_type, expiry_date, calendar_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [coachId, tokens.access_token, tokens.refresh_token, tokens.scope, tokens.token_type, expiryDate, calendarId]
    );
  }
}

export async function getTokens(coachId) {
  return get('SELECT * FROM google_tokens WHERE coach_id = ?', [coachId]);
}

export async function getAuthorizedClient(coachId) {
  const tokenRow = await getTokens(coachId);
  if (!tokenRow) {
    console.log(`No Google tokens found for coach ${coachId}`);
    return null;
  }
  
  console.log(`Getting authorized client for coach ${coachId}`);
  console.log(`Stored scope: ${tokenRow.scope}`);
  console.log(`Token expiry: ${tokenRow.expiry_date ? new Date(tokenRow.expiry_date).toISOString() : 'none'}`);
  
  const client = createOAuthClient();
  client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date
  });
  
  // Set up automatic token refresh
  client.on('tokens', async (tokens) => {
    console.log('Token refresh triggered for coach', coachId);
    if (tokens.refresh_token) {
      // Update stored tokens if we got a new refresh token
      await storeTokens(coachId, tokens, tokenRow.calendar_id);
    } else if (tokens.access_token) {
      // Just update the access token
      await run(
        'UPDATE google_tokens SET access_token = ?, expiry_date = ? WHERE coach_id = ?',
        [tokens.access_token, tokens.expiry_date || tokenRow.expiry_date, coachId]
      );
    }
  });
  
  return { client, tokenRow };
}

export async function ensureDedicatedCalendar(client, tokenRow) {
  if (tokenRow?.calendar_id) return tokenRow.calendar_id;
  const calendar = google.calendar({ version: 'v3', auth: client });
  const created = await calendar.calendars.insert({
    requestBody: {
      summary: 'Coaching Slots',
      description: 'Dedicated calendar for coaching slot availability'
    }
  });
  return created.data.id;
}

export async function createEvent(client, calendarId, slot, bookingLink) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Available Slot`,
      description: `Booking link: ${bookingLink}`,
      start: { dateTime: slot.start_time },
      end: { dateTime: slot.end_time },
      extendedProperties: {
        private: {
          slot_id: String(slot.id),
          booking_link: bookingLink
        }
      }
    }
  });
  return event.data.id;
}

export async function deleteEvent(client, calendarId, eventId) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.delete({ calendarId, eventId });
}

export async function updateEvent(client, calendarId, eventId, slot, bookingLink) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: `Available Slot`,
      description: `Booking link: ${bookingLink}`,
      start: { dateTime: slot.start_time },
      end: { dateTime: slot.end_time },
      extendedProperties: {
        private: {
          slot_id: String(slot.id),
          booking_link: bookingLink
        }
      }
    }
  });
}

export async function updateEventWithBooking(client, calendarId, eventId, booking) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: `Booked: ${booking.client_name}`,
      description: `Client: ${booking.client_name} (${booking.client_email})\nNotes: ${booking.notes || ''}`,
      attendees: booking.client_email
        ? [{ email: booking.client_email, displayName: booking.client_name }]
        : undefined
    }
  });
}

export async function getBusy(client, calendarId, dayIso) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  const start = new Date(dayIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // Query both the primary calendar and the dedicated calendar to get all busy times
  const items = [{ id: 'primary' }]; // Primary calendar where user's events are
  if (calendarId && calendarId !== 'primary') {
    items.push({ id: calendarId }); // Dedicated calendar if it exists
  }

  console.log(`Querying Google Calendar for ${dayIso}:`, items.map(i => i.id).join(', '));
  console.log(`Time range: ${start.toISOString()} to ${end.toISOString()}`);

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: items
    }
  });

  // Combine busy times from all calendars
  const allBusy = [];
  let hasInvalidCalendar = false;
  if (res.data.calendars) {
    Object.entries(res.data.calendars).forEach(([calId, calData]) => {
      // Check for errors first
      if (calData.errors && calData.errors.length > 0) {
        const notFoundError = calData.errors.find(err => err.reason === 'notFound');
        if (notFoundError) {
          console.warn(`Calendar ${calId} not found - it may have been deleted. Skipping.`);
          hasInvalidCalendar = true;
          return; // Skip this calendar
        }
        // Log other errors but continue
        console.error(`Errors for calendar ${calId}:`, calData.errors);
      }
      
      if (calData.busy && calData.busy.length > 0) {
        allBusy.push(...calData.busy);
      }
    });
  }
  
  // If dedicated calendar was not found, clear it from database to avoid future errors
  if (hasInvalidCalendar && calendarId && calendarId !== 'primary') {
    console.warn(`Dedicated calendar ${calendarId} not found. Clearing from database.`);
    try {
      await run(
        'UPDATE google_tokens SET calendar_id = NULL WHERE calendar_id = ?',
        [calendarId]
      );
    } catch (dbErr) {
      console.error('Failed to clear invalid calendar ID from database:', dbErr);
    }
  }

  // Sort and merge overlapping busy periods
  allBusy.sort((a, b) => new Date(a.start) - new Date(b.start));
  
  if (allBusy.length === 0) {
    console.log('No busy periods found for', dayIso);
    return [];
  }
  
  // Merge overlapping periods
  const merged = [allBusy[0]];
  for (let i = 1; i < allBusy.length; i++) {
    const last = merged[merged.length - 1];
    const current = allBusy[i];
    if (new Date(current.start) <= new Date(last.end)) {
      // Overlapping or adjacent, merge them
      if (new Date(current.end) > new Date(last.end)) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }

  console.log(`Merged to ${merged.length} busy periods`);
  return merged;
}


