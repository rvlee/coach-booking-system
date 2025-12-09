import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAuthUrl,
  storeTokens,
  getAuthorizedClient,
  ensureDedicatedCalendar,
  getBusy,
  createOAuthClient
} from '../google.js';
import { run, get } from '../database.js';

const router = express.Router();

// Start OAuth flow
router.get('/auth', authenticateToken, async (req, res) => {
  const url = getAuthUrl(String(req.user.id));
  res.json({ url });
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const coachId = req.query.state || req.query.coachId || req.query.coach_id;
    const client = createOAuthClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Log the granted scopes to verify permissions
    console.log('Google OAuth tokens received');
    console.log('Granted scopes:', tokens.scope);
    console.log('Has refresh token:', !!tokens.refresh_token);

    // We can't get user id directly; expect coach_id in query for simplicity
    const coach_id = coachId || req.query.coach_id;
    if (!coach_id) {
      return res.status(400).send('Missing coach_id to link tokens.');
    }

    const calendarId = await ensureDedicatedCalendar(client, {});
    await storeTokens(coach_id, tokens, calendarId);
    
    console.log('Google Calendar connected for coach:', coach_id);
    console.log('Dedicated calendar ID:', calendarId);

    res.send(
      `<html><body><script>window.close();</script><p>Google Calendar connected. You can close this window.</p></body></html>`
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send('OAuth failed');
  }
});

// Status for UI
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const row = await get('SELECT calendar_id, expiry_date FROM google_tokens WHERE coach_id = ?', [req.user.id]);
    res.json({ connected: !!row, calendar_id: row?.calendar_id || null });
  } catch (err) {
    console.error('Google status error:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Busy blocks for a given day
router.get('/busy', authenticateToken, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  try {
    const auth = await getAuthorizedClient(req.user.id);
    if (!auth) return res.status(400).json({ error: 'Google Calendar not connected' });
    const { client, tokenRow } = auth;
    const busy = await getBusy(client, tokenRow.calendar_id, date);
    console.log(`Fetched busy times for ${date}:`, busy.length, 'periods');
    res.json({ busy });
  } catch (err) {
    console.error('Google busy error:', err);
    res.status(500).json({ error: 'Failed to fetch busy times', details: err.message });
  }
});

export default router;


