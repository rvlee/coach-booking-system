import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAuthUrl,
  storeTokens,
  getAuthorizedClient,
  ensureDedicatedCalendar,
  getBusy,
  createOAuthClient,
  getLoginAuthUrl
} from '../google.js';
import { run, get } from '../database.js';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Start OAuth flow for authentication (login/register)
router.get('/auth/login', (req, res) => {
  try {
    const url = getLoginAuthUrl();
    res.json({ url });
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate Google OAuth URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start OAuth flow for calendar connection (existing)
router.get('/auth', authenticateToken, async (req, res) => {
  const url = getAuthUrl(String(req.user.id));
  res.json({ url });
});

// OAuth callback for authentication (login/register)
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    // Use backend redirect URI for login (must match Google Cloud Console)
    // This should be /api/google/auth/callback (different from calendar callback)
    // Convert GOOGLE_REDIRECT_URI from calendar callback to auth callback
    let loginRedirectUri;
    if (process.env.GOOGLE_REDIRECT_URI) {
      // Convert calendar callback URI to auth callback URI
      // e.g., https://backend.railway.app/api/google/callback -> https://backend.railway.app/api/google/auth/callback
      loginRedirectUri = process.env.GOOGLE_REDIRECT_URI.replace('/api/google/callback', '/api/google/auth/callback');
    } else {
      loginRedirectUri = 'http://localhost:3001/api/google/auth/callback';
    }
    
    console.log('Login callback redirect URI:', loginRedirectUri);
    
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
    const loginClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, loginRedirectUri);
    const { tokens } = await loginClient.getToken(code);
    loginClient.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: loginClient });
    const { data } = await oauth2.userinfo.get();
    
    const googleEmail = data.email;
    const googleName = data.name || data.email?.split('@')[0] || 'User';

    if (!googleEmail) {
      return res.status(400).send('Could not get email from Google account');
    }

    // Find or create coach account
    let coach = await get('SELECT id, email, name FROM coaches WHERE email = ?', [googleEmail]);
    
    if (!coach) {
      // Create new coach account
      const result = await run(
        'INSERT INTO coaches (email, name, password) VALUES (?, ?, ?)',
        [googleEmail, googleName, null] // No password for Google auth
      );
      coach = await get('SELECT id, email, name FROM coaches WHERE id = ?', [result.lastID]);
    }

    // Generate JWT token (60 days expiration)
    const token = jwt.sign(
      { id: coach.id, email: coach.email },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    // Store Google tokens for calendar access
    try {
      const calendarId = await ensureDedicatedCalendar(loginClient, {});
      await storeTokens(coach.id, tokens, calendarId);
      console.log('Google Calendar connected successfully for coach:', coach.id);
    } catch (calendarErr) {
      console.error('Error connecting Google Calendar (non-fatal):', calendarErr);
      // Don't fail the login if calendar connection fails
    }

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('Redirecting to frontend:', `${frontendUrl}/auth/callback`);
    console.log('Coach data:', { id: coach.id, email: coach.email, name: coach.name });
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}&coach=${encodeURIComponent(JSON.stringify(coach))}`);
  } catch (err) {
    console.error('Google OAuth auth callback error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      response: err.response?.data
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// OAuth callback for calendar connection (existing flow)
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


