# Fix: Railway "Cannot find package 'dotenv'" Error

## The Problem

Railway can't find the `dotenv` package, which means dependencies aren't being installed.

## Root Causes

1. **Root Directory not set to `server`**
2. **Build command not running**
3. **package.json not found**
4. **Dependencies not installing**

## Solution

### Step 1: Check Railway Settings

**In Railway Dashboard:**
1. Go to your service
2. Click **Settings** tab
3. Check these settings:

**Root Directory:**
- Should be: `server`
- NOT: `.` (root of repo)

**Build Command:**
- Should be: `npm install`
- OR: Leave empty (Railway auto-detects)

**Start Command:**
- Should be: `node index.js`
- NOT: `npm run dev` (that's for development)

### Step 2: Verify package.json Exists

**Check that `server/package.json` exists and includes `dotenv`:**

The file should be at:
```
coach-booking-system/server/package.json
```

And should include:
```json
{
  "dependencies": {
    "dotenv": "^16.0.0",
    ...
  }
}
```

### Step 3: Force Rebuild

**In Railway:**
1. Go to your service
2. Click **Deployments** tab
3. Click **"..."** on latest deployment
4. Click **"Redeploy"**
5. Watch the logs to see if `npm install` runs

### Step 4: Check Build Logs

**In Railway logs, look for:**
- "Installing dependencies..."
- "added X packages"
- "npm install" output
- Any errors during installation

**If you DON'T see "Installing dependencies":**
- Build command isn't running
- Set Build Command to: `npm install`

## Quick Fix Checklist

- [ ] Root Directory = `server` (not `.`)
- [ ] Build Command = `npm install` (or empty)
- [ ] Start Command = `node index.js`
- [ ] `server/package.json` exists and is committed to Git
- [ ] `dotenv` is in `package.json` dependencies
- [ ] Redeployed after fixing settings

## Most Common Issue

**Root Directory is set to `.` instead of `server`**

**Fix:**
1. Railway → Settings → Root Directory
2. Change from `.` to `server`
3. Save
4. Railway will auto-redeploy

## Verify package.json

**Check `server/package.json` includes:**
```json
{
  "name": "coach-booking-server",
  "type": "module",
  "dependencies": {
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "googleapis": "^126.0.0",
    "jsonwebtoken": "^9.0.0",
    "sqlite3": "^5.1.6",
    "uuid": "^9.0.0"
  }
}
```

## If Still Not Working

### Option 1: Add Explicit Build Command

**In Railway Settings:**
- Build Command: `cd server && npm install`
- This ensures it runs in the server directory

### Option 2: Check Git Repository

**Verify `server/package.json` is committed:**
```bash
git ls-files server/package.json
```

Should show: `server/package.json`

If not, commit it:
```bash
git add server/package.json
git commit -m "Add server package.json"
git push
```

### Option 3: Check Railway Logs

**Look for these in logs:**
- "Installing dependencies..."
- "added X packages"
- "npm install" command output

**If missing:**
- Build command isn't running
- Set it explicitly: `npm install`

## Your Railway Settings Should Be:

```
Root Directory: server
Build Command: npm install (or empty)
Start Command: node index.js
```

## After Fixing

1. **Redeploy** (Railway will auto-redeploy after saving settings)
2. **Watch logs** - Should see "Installing dependencies..."
3. **Wait for deployment** to complete
4. **Test** - Should work now




