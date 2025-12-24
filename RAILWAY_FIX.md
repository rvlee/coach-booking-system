# Fixing Railway dotenv Error

## The Problem

You're getting this error:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dotenv' imported from /app/server/index.js
```

This means Railway isn't installing dependencies in the `server` directory.

## Solution

### Option 1: Verify Railway Settings (Recommended)

1. **Go to Railway Dashboard**
   - Open your project
   - Click on your service

2. **Check Settings Tab:**
   - **Root Directory**: Should be `server`
   - **Build Command**: Should be empty or `npm install` (Railway auto-detects)
   - **Start Command**: Should be `node index.js` or `npm start`

3. **Verify Variables Tab:**
   - Make sure all environment variables are set
   - Railway should auto-install when it detects `package.json`

4. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger redeploy

### Option 2: Add Explicit Build Command

If Option 1 doesn't work:

1. **Go to Railway Settings**
2. **Add Build Command:**
   ```
   npm install
   ```
3. **Start Command:**
   ```
   node index.js
   ```
4. **Redeploy**

### Option 3: Check Root Directory

Make sure Railway is looking in the right place:

1. **Settings → Root Directory**
2. Should be exactly: `server` (not `./server` or `/server`)
3. **Save** and **Redeploy**

### Option 4: Verify package.json is Committed

Make sure `server/package.json` is in your Git repository:

1. Check if file exists: `server/package.json`
2. Make sure it's committed:
   ```bash
   git add server/package.json
   git commit -m "Ensure package.json is committed"
   git push
   ```
3. Railway will redeploy automatically

## Quick Checklist

- [ ] Root Directory is set to `server`
- [ ] `server/package.json` exists and is committed to Git
- [ ] Environment variables are set in Railway
- [ ] Build command is set (or left empty for auto-detect)
- [ ] Start command is `node index.js` or `npm start`
- [ ] Redeployed after making changes

## Verify Installation

After redeploying, check the build logs:

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Check the logs for:
   ```
   npm install
   ```
   Should see packages being installed, including `dotenv`

## If Still Not Working

### Check Build Logs

Look for these in the deployment logs:
- `Installing dependencies...`
- `added X packages`
- Any errors during `npm install`

### Manual Fix

If Railway still isn't installing dependencies:

1. **Add this to Railway Settings:**
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && node index.js`

2. **Or create a Railway-specific script:**

   Create `server/railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install"
     }
   }
   ```

## Most Common Issue

**Root Directory not set correctly:**
- ❌ Wrong: `.` (root)
- ✅ Correct: `server`

Make sure it's exactly `server` (no leading slash, no trailing slash).

## After Fixing

Once fixed, you should see in the logs:
```
✓ Installed dependencies
✓ Starting server
Server running on port 3001
```

And the health endpoint should work:
```
https://your-app.railway.app/api/health
```




