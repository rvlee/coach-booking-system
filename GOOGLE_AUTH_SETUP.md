# Google OAuth Authentication Setup

The system now uses **Google OAuth for login and registration** instead of email/password.

## What Changed

✅ **Login/Registration**: Users sign in with Google  
✅ **Auto-registration**: New users are automatically created on first Google sign-in  
✅ **Calendar access**: Google Calendar is automatically connected during sign-in  

## Google Cloud Console Setup

### 1. Update OAuth Redirect URI

You need to add a **new redirect URI** for authentication:

1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, add:
   - **For production**: `https://your-backend.railway.app/api/google/auth/callback`
   - **For development**: `http://localhost:3001/api/google/auth/callback`

**You should now have TWO redirect URIs:**
- `https://your-backend.railway.app/api/google/callback` (for calendar connection)
- `https://your-backend.railway.app/api/google/auth/callback` (for login/registration)

### 2. Update OAuth Scopes

Make sure your OAuth consent screen includes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

These are automatically requested during sign-in.

## Railway Environment Variables

Update your Railway environment variables:

**Add/Update:**
```
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/google/auth/callback
```

**Note:** This is the redirect URI for login/registration. The calendar connection uses the same URI.

## How It Works

1. **User clicks "Sign in with Google"**
2. **Redirected to Google** for authentication
3. **Google redirects back** to `/api/google/auth/callback`
4. **Backend:**
   - Gets user info (email, name) from Google
   - Creates coach account if doesn't exist
   - Generates JWT token
   - Connects Google Calendar automatically
   - Redirects to frontend with token
5. **Frontend:**
   - Receives token and user info
   - Stores in localStorage
   - Redirects to dashboard

## Testing

1. **Start your servers**
2. **Go to login page**
3. **Click "Sign in with Google"**
4. **Authorize the app**
5. **Should redirect to dashboard**

## Troubleshooting

### "redirect_uri_mismatch" Error

**Solution:**
- Make sure redirect URI is added in Google Cloud Console
- Must match exactly (including https:// and /api/google/auth/callback)
- Check `GOOGLE_REDIRECT_URI` in Railway matches

### "Access blocked" Error

**Solution:**
- App needs to be published (see `GOOGLE_OAUTH_PUBLISH.md`)
- Or add your email as a test user

### User Not Created

**Check:**
- Backend logs for errors
- Database connection
- Google OAuth scopes include userinfo.email and userinfo.profile

### Calendar Not Connected

**Check:**
- Google OAuth scopes include calendar
- Backend logs for calendar creation errors
- `google_tokens` table in database

## Migration from Email/Password

**Existing users:**
- Can still use email/password (if you keep those routes)
- Or can switch to Google OAuth
- Google OAuth will create a new account if email doesn't exist

**To fully remove email/password:**
- Remove `/api/auth/login` and `/api/auth/register` routes
- Remove email/password fields from database (optional)

