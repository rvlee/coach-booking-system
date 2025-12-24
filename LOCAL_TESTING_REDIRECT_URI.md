# Local Testing: Add Localhost Redirect URI

## The Issue

When testing locally, Google OAuth needs a redirect URI that matches your local server.

## Solution: Add Localhost Redirect URI to Google Cloud Console

### Step 1: Add Localhost Redirect URI

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/
   - Select your project

2. **Navigate to Credentials**
   - Left sidebar → **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID

3. **Add Localhost Redirect URI**
   - Scroll to **"Authorized redirect URIs"**
   - Click **"+ ADD URI"**
   - Add **EXACTLY**:
     ```
     http://localhost:3001/api/google/auth/callback
     ```
   - **Important:**
     - Uses `http://` (not `https://`) for localhost
     - Port: `3001` (your backend port)
     - Exact path: `/api/google/auth/callback`
   - Click **"SAVE"**

### Step 2: Verify You Have All Redirect URIs

You should now have **THREE** redirect URIs:

1. ✅ `https://coach-booking-system-production.up.railway.app/api/google/callback` (production calendar)
2. ✅ `https://coach-booking-system-production.up.railway.app/api/google/auth/callback` (production login)
3. ✅ `http://localhost:3001/api/google/auth/callback` (local login) ← **NEW**

### Step 3: Test Locally

1. **Start your backend:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start your frontend:**
   ```bash
   cd client
   npm run dev
   ```

3. **Try logging in** at `http://localhost:3000`
   - Should redirect to Google
   - After authorizing, should redirect back to localhost

## Local vs Production

**For Local Testing:**
- Redirect URI: `http://localhost:3001/api/google/auth/callback`
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

**For Production:**
- Redirect URI: `https://coach-booking-system-production.up.railway.app/api/google/auth/callback`
- Frontend: Your Vercel URL
- Backend: `https://coach-booking-system-production.up.railway.app`

## Quick Checklist

- [ ] Added `http://localhost:3001/api/google/auth/callback` to Google Cloud Console
- [ ] Uses `http://` (not `https://`)
- [ ] Port is `3001`
- [ ] Exact path: `/api/google/auth/callback`
- [ ] Saved changes
- [ ] Waited 1-2 minutes
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Tried logging in locally

## Your Local Redirect URI

Add this **EXACTLY** to Google Cloud Console:

```
http://localhost:3001/api/google/auth/callback
```

**Note:** For localhost, you can also add the calendar callback if needed:
```
http://localhost:3001/api/google/callback
```

But the login callback is the one you need for Google OAuth login.




