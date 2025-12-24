# Verify Redirect URI Configuration

## Step 1: Check What Redirect URI is Being Sent

The redirect URI being sent to Google is constructed from your Railway environment variables.

**Check Railway Logs:**
1. Go to Railway → Your Service → Deployments
2. Click latest deployment → View Logs
3. Look for: `Login OAuth redirect URI: ...`
4. Copy that EXACT URI

**OR check your Railway environment variable:**
- Variable: `GOOGLE_REDIRECT_URI`
- Current value: `https://coach-booking-system-production.up.railway.app/api/google/callback`
- Code converts it to: `https://coach-booking-system-production.up.railway.app/api/google/auth/callback`

## Step 2: Add to Google Cloud Console

**The redirect URI you need to add is:**
```
https://coach-booking-system-production.up.railway.app/api/google/auth/callback
```

### Detailed Steps:

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/
   - Select your project

2. **Navigate to Credentials**
   - Left sidebar → **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID

3. **Add Redirect URI**
   - Scroll to **"Authorized redirect URIs"**
   - Click **"+ ADD URI"**
   - **Copy and paste EXACTLY** (don't type manually):
     ```
     https://coach-booking-system-production.up.railway.app/api/google/auth/callback
     ```
   - **Important:** 
     - No trailing slash
     - Must be `https://` (not `http://`)
     - Exact path: `/api/google/auth/callback`
   - Click **"SAVE"**

4. **Verify You Have Both URIs**
   
   You should see:
   - ✅ `https://coach-booking-system-production.up.railway.app/api/google/callback` (calendar)
   - ✅ `https://coach-booking-system-production.up.railway.app/api/google/auth/callback` (login)

## Step 3: Wait and Test

1. **Wait 1-2 minutes** for Google to update
2. **Clear browser cache** (optional but recommended)
3. **Try logging in again**

## Common Mistakes

❌ **Wrong:**
- `https://coach-booking-system-production.up.railway.app/api/google/auth/callback/` (trailing slash)
- `http://coach-booking-system-production.up.railway.app/api/google/auth/callback` (http instead of https)
- `https://coach-booking-system-production.up.railway.app/api/google/callback` (wrong endpoint - missing /auth)
- Typing manually (typos)

✅ **Correct:**
- `https://coach-booking-system-production.up.railway.app/api/google/auth/callback` (exact match)

## Still Not Working?

### Option 1: Check Railway Logs

Check what redirect URI is actually being sent:
1. Railway → Deployments → Logs
2. Look for: "Login OAuth redirect URI: ..."
3. Copy that EXACT string
4. Make sure it matches EXACTLY in Google Cloud Console

### Option 2: Verify Railway Environment Variable

**In Railway:**
1. Go to Variables tab
2. Check `GOOGLE_REDIRECT_URI`
3. Should be: `https://coach-booking-system-production.up.railway.app/api/google/callback`
4. The code will convert it to `/api/google/auth/callback`

### Option 3: Set Direct Redirect URI

**In Railway, you can also set:**
- Variable: `GOOGLE_AUTH_REDIRECT_URI`
- Value: `https://coach-booking-system-production.up.railway.app/api/google/auth/callback`

This will be used directly for login (no conversion needed).

## Quick Checklist

- [ ] Added redirect URI in Google Cloud Console
- [ ] No trailing slash
- [ ] Uses `https://` (not `http://`)
- [ ] Exact path: `/api/google/auth/callback`
- [ ] Saved changes in Google Cloud Console
- [ ] Waited 1-2 minutes
- [ ] Cleared browser cache (optional)
- [ ] Tried logging in again

## Your Exact Redirect URI

Based on your Railway URL, add this **EXACTLY**:

```
https://coach-booking-system-production.up.railway.app/api/google/auth/callback
```

**Copy and paste it - don't type it manually!**




