import { google } from 'googleapis';
import { get, run, all } from './database.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/api/google/callback`
    : 'http://localhost:3001/api/google/callback',
  GOOGLE_AUTH_REDIRECT_URI // Separate redirect URI for login/authentication
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
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    prompt: 'consent',
    state
  });
}

export function getLoginAuthUrl() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  // Use separate redirect URI for login/authentication
  // This should be /api/google/auth/callback (different from calendar callback at /api/google/callback)
  // If GOOGLE_REDIRECT_URI is set, convert it to the auth callback URI
  let loginRedirectUri;
  if (process.env.GOOGLE_REDIRECT_URI) {
    // Convert calendar callback URI to auth callback URI
    // e.g., https://backend.railway.app/api/google/callback -> https://backend.railway.app/api/google/auth/callback
    loginRedirectUri = process.env.GOOGLE_REDIRECT_URI.replace('/api/google/callback', '/api/google/auth/callback');
  } else {
    // Default to localhost for development
    loginRedirectUri = 'http://localhost:3001/api/google/auth/callback';
  }
  
  console.log('Login OAuth redirect URI:', loginRedirectUri);
  
  const loginClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, loginRedirectUri);
  return loginClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    prompt: 'consent'
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

export async function ensureDedicatedCalendar(client, tokenRow, coachId = null) {
  // First, check if calendar_id exists in tokenRow
  if (tokenRow?.calendar_id) {
    console.log(`Using existing calendar_id from tokenRow: ${tokenRow.calendar_id}`);
    return tokenRow.calendar_id;
  }
  
  // If coachId is provided, check database for existing calendar_id
  if (coachId) {
    try {
      const existingTokens = await get('SELECT calendar_id FROM google_tokens WHERE coach_id = ?', [coachId]);
      if (existingTokens?.calendar_id) {
        console.log(`Found existing calendar_id in database: ${existingTokens.calendar_id}`);
        // Verify the calendar still exists in Google Calendar
        try {
          const calendar = google.calendar({ version: 'v3', auth: client });
          await calendar.calendars.get({ calendarId: existingTokens.calendar_id });
          console.log(`Verified calendar ${existingTokens.calendar_id} exists in Google Calendar`);
          return existingTokens.calendar_id;
        } catch (err) {
          console.warn(`Calendar ${existingTokens.calendar_id} not found in Google Calendar, will create new one`);
          // Calendar was deleted, continue to create a new one
        }
      }
    } catch (err) {
      console.error('Error checking database for existing calendar_id:', err);
    }
  }
  
  // Check if a "Coaching Slots" calendar already exists in Google Calendar
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const calendarList = await calendar.calendarList.list();
    
    // Look for existing "Coaching Slots" calendar
    const existingCalendar = calendarList.data.items?.find(
      cal => cal.summary === 'Coaching Slots' && cal.accessRole === 'owner'
    );
    
    if (existingCalendar) {
      const calendarId = existingCalendar.id;
      console.log(`Found existing "Coaching Slots" calendar: ${calendarId}`);
      
      // Save to database if coachId is provided
      if (coachId) {
        try {
          await run(
            'UPDATE google_tokens SET calendar_id = ? WHERE coach_id = ?',
            [calendarId, coachId]
          );
          console.log(`Saved existing calendar_id ${calendarId} to database for coach ${coachId}`);
        } catch (err) {
          console.error('Failed to save existing calendar_id to database:', err);
        }
      }
      
      return calendarId;
    }
  } catch (err) {
    console.warn('Error checking for existing calendar, will create new one:', err.message);
  }
  
  // Create new calendar if none exists
  const calendar = google.calendar({ version: 'v3', auth: client });
  const created = await calendar.calendars.insert({
    requestBody: {
      summary: 'Coaching Slots',
      description: 'Dedicated calendar for coaching slot availability'
    }
  });
  
  const calendarId = created.data.id;
  console.log(`Created new calendar: ${calendarId}`);
  
  // Save calendar_id to database if coachId is provided
  if (coachId) {
    try {
      await run(
        'UPDATE google_tokens SET calendar_id = ? WHERE coach_id = ?',
        [calendarId, coachId]
      );
      console.log(`Saved new calendar_id ${calendarId} to database for coach ${coachId}`);
    } catch (err) {
      console.error('Failed to save calendar_id to database:', err);
      // Continue anyway - the calendar was created successfully
    }
  }
  
  return calendarId;
}

// Get timezone from Google Calendar and sync to coach settings
export async function syncTimezoneFromGoogle(coachId) {
  try {
    const auth = await getAuthorizedClient(coachId);
    if (!auth) {
      console.log(`No Google Calendar connection for coach ${coachId}`);
      return null;
    }

    const { client, tokenRow } = auth;
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Try to get timezone from dedicated calendar first, then fall back to primary
    let googleTimezone = null;
    const calendarsToTry = [];
    
    if (tokenRow.calendar_id) {
      calendarsToTry.push(tokenRow.calendar_id);
    }
    calendarsToTry.push('primary'); // Always try primary as fallback
    
    for (const calendarId of calendarsToTry) {
      try {
        const calendarData = await calendar.calendars.get({
          calendarId: calendarId
        });
        
        googleTimezone = calendarData.data.timeZone;
        if (googleTimezone) {
          break; // Found timezone, exit loop
        }
      } catch (err) {
        // If dedicated calendar fails, try primary
        if (calendarId !== 'primary') {
          console.log(`Could not get timezone from calendar ${calendarId}, trying primary...`);
          continue;
        }
        throw err; // Re-throw if primary also fails
      }
    }
    
    if (googleTimezone) {
      // Validate timezone
      if (Intl.supportedValuesOf('timeZone').includes(googleTimezone)) {
        // Update coach timezone in database
        await run(
          'UPDATE coaches SET timezone = ? WHERE id = ?',
          [googleTimezone, coachId]
        );
        console.log(`Synced timezone ${googleTimezone} from Google Calendar for coach ${coachId}`);
        return googleTimezone;
      } else {
        console.warn(`Invalid timezone from Google Calendar: ${googleTimezone}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error syncing timezone from Google Calendar:', error);
    return null;
  }
}

export async function createEvent(client, calendarId, slot, bookingLink, timezone = null) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  
  // Get timezone from calendar if not provided
  let eventTimezone = timezone;
  if (!eventTimezone) {
    try {
      const calendarData = await calendar.calendars.get({ calendarId });
      eventTimezone = calendarData.data.timeZone;
    } catch (err) {
      console.warn('Could not get timezone from calendar, using UTC:', err.message);
      eventTimezone = 'UTC';
    }
  }
  
  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Available Slot`,
      description: `Booking link: ${bookingLink}`,
      start: { 
        dateTime: slot.start_time,
        timeZone: eventTimezone
      },
      end: { 
        dateTime: slot.end_time,
        timeZone: eventTimezone
      },
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

export async function updateEvent(client, calendarId, eventId, slot, bookingLink, timezone = null) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  
  // Get timezone from calendar if not provided
  let eventTimezone = timezone;
  if (!eventTimezone) {
    try {
      const calendarData = await calendar.calendars.get({ calendarId });
      eventTimezone = calendarData.data.timeZone;
    } catch (err) {
      console.warn('Could not get timezone from calendar, using UTC:', err.message);
      eventTimezone = 'UTC';
    }
  }
  
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: `Available Slot`,
      description: `Booking link: ${bookingLink}`,
      start: { 
        dateTime: slot.start_time,
        timeZone: eventTimezone
      },
      end: { 
        dateTime: slot.end_time,
        timeZone: eventTimezone
      },
      extendedProperties: {
        private: {
          slot_id: String(slot.id),
          booking_link: bookingLink
        }
      }
    }
  });
}

export async function updateEventWithBooking(client, calendarId, eventId, booking, allBookings = null, coachEmail = null, timeUpdate = null, timezone = null) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  
  // Get timezone from calendar if not provided
  let eventTimezone = timezone;
  if (!eventTimezone) {
    try {
      const calendarData = await calendar.calendars.get({ calendarId });
      eventTimezone = calendarData.data.timeZone;
    } catch (err) {
      console.warn('Could not get timezone from calendar, using UTC:', err.message);
      eventTimezone = 'UTC';
    }
  }
  
  // Use allBookings if provided (for shared classes), otherwise just use the single booking
  const bookings = allBookings || [booking];
  
  // Build attendees list from all bookings (clients only, not the coach)
  // The coach is automatically the organizer since the event is on their calendar
  const attendees = bookings
    .filter(b => b.client_email)
    .map(b => ({
      email: b.client_email,
      displayName: b.client_name,
      responseStatus: 'accepted'
    }));
  
  // Determine event title based on booking status
  let eventTitle;
  if (bookings.length > 1) {
    const names = bookings.map(b => b.client_name).join(' & ');
    eventTitle = `Booked: ${names} (Shared Class)`;
  } else {
    eventTitle = `Booked: ${booking.client_name}`;
  }
  
  // Build description with all booking details
  const bookingDetails = bookings.map(b => 
    `Client: ${b.client_name} (${b.client_email})${b.client_phone ? ` - ${b.client_phone}` : ''}${b.notes ? `\nNotes: ${b.notes}` : ''}`
  ).join('\n\n');
  
  // Get the current event to preserve organizer information
  let currentEvent;
  try {
    currentEvent = await calendar.events.get({
      calendarId,
      eventId
    });
  } catch (err) {
    console.error('Error fetching current event:', err);
  }
  
  // Prepare request body - ensure organizer is preserved
  const requestBody = {
    summary: eventTitle,
    description: bookingDetails,
    attendees: attendees.length > 0 ? attendees : undefined,
    // Update time if provided (for shared classes extended to 90 minutes)
    ...(timeUpdate ? {
      start: { 
        dateTime: timeUpdate.start_time,
        timeZone: eventTimezone
      },
      end: { 
        dateTime: timeUpdate.end_time,
        timeZone: eventTimezone
      }
    } : {}),
    // Preserve organizer if event already exists
    // Note: organizer cannot be changed via API, it's always the calendar owner
    // But we ensure the event stays on the coach's calendar
  };
  
  // If we have coach email and current event, ensure organizer email matches
  if (coachEmail && currentEvent?.data?.organizer?.email) {
    // Verify organizer is the coach (should always be true since event is on coach's calendar)
    if (currentEvent.data.organizer.email !== coachEmail) {
      console.warn(`Event organizer (${currentEvent.data.organizer.email}) does not match coach email (${coachEmail})`);
    }
  }
  
  // Update the event with all attendees and time (if needed)
  // sendUpdates: 'all' will send notifications to:
  // - All attendees (both clients for shared classes)
  // - The organizer (coach)
  // This ensures everyone gets notified when the second person books
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
    // Send updates to all attendees and the organizer
    // This is especially important for shared classes when the second person books
    // 'all' means: send updates to all attendees AND the organizer (coach)
    // Everyone will receive an email notification about the event update
    sendUpdates: attendees.length > 0 ? 'all' : undefined
  });
  
  if (attendees.length > 0) {
    const attendeeEmails = attendees.map(a => a.email).join(', ');
    console.log(`Updated Google Calendar event ${eventId} on coach's calendar (${calendarId}).`);
    console.log(`  - Event title: ${eventTitle}`);
    console.log(`  - Attendees (${attendees.length}): ${attendeeEmails}`);
    console.log(`  - Sent updates to all attendees and organizer (coach)`);
    
    if (bookings.length > 1) {
      console.log(`  - Shared class: Both clients have been added as attendees`);
    }
  }
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

// Sync bookings with Google Calendar - check for deleted events
export async function syncBookingsWithCalendar(coachId) {
  try {
    const auth = await getAuthorizedClient(coachId);
    if (!auth) {
      console.log(`No Google Calendar connection for coach ${coachId}`);
      return { synced: false, reason: 'No Google Calendar connection' };
    }

    const { client, tokenRow } = auth;
    const calendarId = tokenRow.calendar_id;
    
    if (!calendarId) {
      console.log(`No calendar_id for coach ${coachId}`);
      return { synced: false, reason: 'No calendar_id' };
    }

    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Fetch all events from the calendar (up to 2500, which should be enough)
    // We'll fetch events from the past 30 days to future 1 year
    const now = new Date();
    const timeMin = new Date(now);
    timeMin.setDate(timeMin.getDate() - 30); // 30 days ago
    const timeMax = new Date(now);
    timeMax.setFullYear(timeMax.getFullYear() + 1); // 1 year from now

    console.log(`Syncing bookings for coach ${coachId} from calendar ${calendarId}`);
    console.log(`Time range: ${timeMin.toISOString()} to ${timeMax.toISOString()}`);

    let allEvents = [];
    let nextPageToken = null;
    
    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 2500,
        pageToken: nextPageToken,
        singleEvents: true,
        orderBy: 'startTime'
      });

      if (response.data.items) {
        allEvents.push(...response.data.items);
      }
      
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allEvents.length} events in Google Calendar`);

    // Get all slots with google_event_id for this coach
    const slotsWithEvents = await all(
      `SELECT id, google_event_id FROM slots WHERE coach_id = ? AND google_event_id IS NOT NULL`,
      [coachId]
    );

    console.log(`Found ${slotsWithEvents.length} slots with google_event_id in database`);

    // Create a set of event IDs from Google Calendar
    const calendarEventIds = new Set(allEvents.map(e => e.id));

    // Find slots whose events are missing from Google Calendar
    const missingEventSlots = slotsWithEvents.filter(
      slot => !calendarEventIds.has(slot.google_event_id)
    );

    console.log(`Found ${missingEventSlots.length} slots with missing events in Google Calendar`);

    if (missingEventSlots.length === 0) {
      return { synced: true, cancelled: 0, message: 'All bookings are in sync' };
    }

    // Cancel bookings for slots with missing events
    let cancelledCount = 0;

    for (const slot of missingEventSlots) {
      // Get all confirmed bookings for this slot
      const bookings = await all(
        `SELECT id FROM bookings WHERE slot_id = ? AND status = 'confirmed'`,
        [slot.id]
      );

      if (bookings.length > 0) {
        // Mark bookings as cancelled (don't delete, just update status)
        for (const booking of bookings) {
          await run(
            `UPDATE bookings SET status = 'cancelled' WHERE id = ?`,
            [booking.id]
          );
          cancelledCount++;
        }

        // Check if slot needs duration reversion (for shared bookings)
        const slotDetails = await get(
          `SELECT duration_minutes FROM slots WHERE id = ?`,
          [slot.id]
        );

        if (slotDetails && slotDetails.duration_minutes === 90) {
          // Revert to 60 minutes
          const slotFull = await get(
            `SELECT * FROM slots WHERE id = ?`,
            [slot.id]
          );
          if (slotFull) {
            const originalEndTime = new Date(slotFull.start_time);
            originalEndTime.setMinutes(originalEndTime.getMinutes() + 60);
            await run(
              'UPDATE slots SET end_time = ?, duration_minutes = 60 WHERE id = ?',
              [originalEndTime.toISOString(), slot.id]
            );
          }
        }

        // Clear google_event_id from slot since event no longer exists
        await run(
          `UPDATE slots SET google_event_id = NULL WHERE id = ?`,
          [slot.id]
        );

        console.log(`Cancelled ${bookings.length} booking(s) for slot ${slot.id} (event ${slot.google_event_id} was deleted from Google Calendar)`);
      }
    }

    return {
      synced: true,
      cancelled: cancelledCount,
      message: `Synced ${cancelledCount} booking(s) cancelled from Google Calendar`
    };
  } catch (error) {
    console.error('Error syncing bookings with Google Calendar:', error);
    return { synced: false, error: error.message };
  }
}


