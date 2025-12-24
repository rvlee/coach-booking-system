# Fix: "Failed to start Google authentication" in Production

## The Problem

The frontend can't reach the backend endpoint `/api/google/auth/login` in production.

## Common Causes

### 1. CORS Configuration

**Check Railway environment variable:**
- `FRONTEND_URL` must be set to your Vercel URL
- Example: `https://your-app.vercel.app`

**Check `server/index.js` CORS:**
```javascript
origin: process.env.FRONTEND_URL || ...
```

### 2. Frontend API URL Not Set

**Check Vercel environment variable:**
- `VITE_API_URL` must be set to your Railway backend URL
- Example: `https://coach-booking-system-production.up.railway.app`

**Without this, frontend tries to call `/api/google/auth/login` on Vercel (wrong!)**

### 3. Backend Endpoint Error

**Check Railway logs:**
1. Go to Railway → Deployments → View Logs
2. Look for errors when calling `/api/google/auth/login`
3. Common errors:
   - Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`
   - Error generating OAuth URL
   - Server crash

### 4. Network/CORS Blocking

**Check browser console (F12):**
- Network tab → Look for failed request to `/api/google/auth/login`
- Check error message (CORS, 404, 500, etc.)

## Step-by-Step Fix

### Step 1: Check Vercel Environment Variable

**In Vercel:**
1. Go to your project → Settings → Environment Variables
2. Check `VITE_API_URL`
3. Should be: `https://coach-booking-system-production.up.railway.app`
4. **No trailing slash!**

**If missing or wrong:**
- Add/Update: `VITE_API_URL` = `https://coach-booking-system-production.up.railway.app`
- Redeploy Vercel

### Step 2: Check Railway Environment Variables

**In Railway:**
1. Go to Variables tab
2. Verify these are set:
   - `GOOGLE_CLIENT_ID` = your production client ID
   - `GOOGLE_CLIENT_SECRET` = your production client secret
   - `FRONTEND_URL` = your Vercel URL (e.g., `https://your-app.vercel.app`)
   - `GOOGLE_REDIRECT_URI` = `https://coach-booking-system-production.up.railway.app/api/google/callback`

### Step 3: Check Railway Logs

**Check for errors:**
1. Railway → Deployments → Latest → Logs
2. Look for:
   - "Error generating Google OAuth URL: ..."
   - "Google OAuth credentials are missing"
   - Any stack traces

### Step 4: Test Backend Endpoint Directly

**In browser or Postman:**
```
GET https://coach-booking-system-production.up.railway.app/api/google/auth/login
```

**Should return:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**If error:**
- Check Railway logs for details
- Verify environment variables are set

### Step 5: Check Browser Console

**In browser (F12):**
1. Go to Console tab
2. Click "Sign in with Google"
3. Look for error message
4. Go to Network tab
5. Find the request to `/api/google/auth/login`
6. Check:
   - Status code (404, 500, CORS error?)
   - Response body
   - Request URL (should be Railway URL, not Vercel)

## Quick Checklist

- [ ] `VITE_API_URL` set in Vercel to Railway backend URL
- [ ] `FRONTEND_URL` set in Railway to Vercel URL
- [ ] `GOOGLE_CLIENT_ID` set in Railway
- [ ] `GOOGLE_CLIENT_SECRET` set in Railway
- [ ] `GOOGLE_REDIRECT_URI` set in Railway
- [ ] Vercel redeployed after setting `VITE_API_URL`
- [ ] Railway redeployed after setting variables
- [ ] Backend endpoint `/api/google/auth/login` works when tested directly
- [ ] No CORS errors in browser console
- [ ] No 404/500 errors in browser console

## Most Common Issue

**Missing `VITE_API_URL` in Vercel**

**Fix:**
1. Vercel → Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://coach-booking-system-production.up.railway.app`
3. Redeploy

## Debugging Commands

### Test Backend Health
```bash
curl https://coach-booking-system-production.up.railway.app/api/health
```
Should return: `{"status":"ok"}`

### Test Google Auth Endpoint
```bash
curl https://coach-booking-system-production.up.railway.app/api/google/auth/login
```
Should return OAuth URL or error message.

## Still Not Working?

**Check these in order:**
1. ✅ `VITE_API_URL` in Vercel points to Railway
2. ✅ `FRONTEND_URL` in Railway points to Vercel
3. ✅ Railway logs show no errors
4. ✅ Browser console shows actual error (not just "Failed to start")
5. ✅ Backend endpoint works when tested directly

**Share:**
- Browser console error message
- Railway logs around the time you clicked "Sign in"
- Whether `/api/google/auth/login` works when tested directly




