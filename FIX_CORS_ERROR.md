# Fix: CORS Error in Production

## The Problem

The frontend (Vercel) can't call the backend (Railway) because CORS is blocking the request.

## Solution: Set FRONTEND_URL in Railway

### Step 1: Get Your Vercel URL

Your Vercel frontend URL should be something like:
- `https://your-app.vercel.app`
- Or your custom domain

### Step 2: Set FRONTEND_URL in Railway

**In Railway:**
1. Go to your service → **Variables** tab
2. Add/Update:
   - **Key:** `FRONTEND_URL`
   - **Value:** Your Vercel URL (e.g., `https://your-app.vercel.app`)
   - **No trailing slash!**

### Step 3: Redeploy

Railway will auto-redeploy after you save the variable.

## How CORS Works in Your Code

The server checks `FRONTEND_URL` environment variable:
```javascript
origin: process.env.FRONTEND_URL || ...
```

If `FRONTEND_URL` is not set, it defaults to `false` in production, which blocks all requests.

## Quick Fix Checklist

- [ ] `FRONTEND_URL` set in Railway = your Vercel URL
- [ ] No trailing slash in the URL
- [ ] Railway redeployed after setting variable
- [ ] Test login again

## Verify It's Working

After setting `FRONTEND_URL`:
1. Check Railway logs - should see no CORS errors
2. Try login again - should work
3. Check browser Network tab - request should succeed (not CORS error)

## Common Mistakes

❌ **Wrong:**
- `FRONTEND_URL=https://your-app.vercel.app/` (trailing slash)
- `FRONTEND_URL=http://your-app.vercel.app` (http instead of https)
- `FRONTEND_URL` not set at all

✅ **Correct:**
- `FRONTEND_URL=https://your-app.vercel.app` (exact match, no trailing slash)

## Still Not Working?

### Check Browser Console

Look for the exact CORS error:
- "Access to XMLHttpRequest blocked by CORS policy"
- "No 'Access-Control-Allow-Origin' header"

### Check Railway Logs

Look for:
- CORS errors
- Requests being blocked

### Verify Vercel URL

Make sure you're using the correct Vercel URL:
- Check Vercel dashboard → Your project → Settings → Domains
- Use the exact URL shown there




