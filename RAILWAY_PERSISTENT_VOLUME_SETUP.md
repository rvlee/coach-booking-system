# Railway Persistent Volume Setup Guide

This guide will help you set up a persistent volume on Railway so your database survives deployments.

## Step-by-Step Instructions

### Step 1: Access Your Railway Project

1. Go to [Railway Dashboard](https://railway.app)
2. Log in to your account
3. Select your **Coach Booking System** project (or the project where your backend service is deployed)

### Step 2: Create a Persistent Volume

1. In your Railway project dashboard, click the **"New"** button (usually in the top right or left sidebar)
2. Select **"Volume"** from the dropdown menu
3. Configure the volume:
   - **Name**: `database-storage` (or any name you prefer)
   - **Mount Path**: `/data` (this is important - must be exactly `/data`)
   - **Size**: Start with 1GB (you can increase later if needed)
4. Click **"Create"** or **"Add"**

### Step 3: Attach Volume to Your Service

1. After creating the volume, you need to attach it to your backend service
2. Click on your **backend service** (the one running your Node.js server)
3. Go to the **"Settings"** tab
4. Scroll down to **"Volumes"** section
5. Click **"Add Volume"** or **"Attach Volume"**
6. Select the volume you just created (`database-storage`)
7. Set the **Mount Path** to: `/data`
8. Click **"Save"** or **"Attach"**

### Step 4: Set Environment Variable

1. Still in your backend service settings, go to the **"Variables"** tab
2. Click **"New Variable"** or **"Raw Editor"**
3. Add the following environment variable:
   ```
   DATABASE_PATH=/data/database.sqlite
   ```
4. Click **"Save"** or **"Add"**

### Step 5: Verify Environment Variables

Make sure you have all your other environment variables set:
- `NODE_ENV=production`
- `PORT=3001` (or your port)
- `JWT_SECRET=your-secret`
- `FRONTEND_URL=https://yourdomain.com`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=...`
- **`DATABASE_PATH=/data/database.sqlite`** ← New one!

### Step 6: Redeploy Your Service

1. After setting up the volume and environment variable, Railway should automatically redeploy
2. If not, you can manually trigger a redeploy:
   - Go to your service
   - Click the **"Deployments"** tab
   - Click **"Redeploy"** or push a new commit to trigger a deployment

### Step 7: Verify It's Working

1. **Check the logs:**
   - Go to your service → **"Deployments"** tab
   - Click on the latest deployment
   - Check the logs for: `Connected to SQLite database at: /data/database.sqlite`
   - This confirms the database is using the persistent volume

2. **Test persistence:**
   - Create a test booking or slot in your app
   - Trigger a new deployment (push a commit or manually redeploy)
   - After redeployment, check if your test booking/slot still exists
   - If it does, persistence is working! ✅

## Troubleshooting

### Issue: "Error opening database" in logs

**Solution:**
- Make sure the volume is attached to your service
- Verify `DATABASE_PATH=/data/database.sqlite` is set correctly
- Check that the mount path is exactly `/data` (not `/data/` or something else)

### Issue: Database still gets wiped on deployment

**Possible causes:**
1. Volume not attached to the service
   - **Fix**: Go to service settings → Volumes → Make sure volume is attached
2. Wrong mount path
   - **Fix**: Ensure mount path is `/data` (not `/tmp` or other paths)
3. Environment variable not set
   - **Fix**: Verify `DATABASE_PATH=/data/database.sqlite` is in your variables

### Issue: "Permission denied" errors

**Solution:**
- The code automatically creates the directory, but if you see permission errors:
- Check Railway logs for specific error messages
- You may need to adjust file permissions (though this is usually automatic)

## Visual Guide

```
Railway Project
├── Backend Service (Node.js)
│   ├── Settings
│   │   ├── Variables
│   │   │   └── DATABASE_PATH=/data/database.sqlite ✅
│   │   └── Volumes
│   │       └── database-storage → /data ✅
│   └── Deployments
└── Volume: database-storage
    └── Mounted at: /data
        └── database.sqlite (persists across deployments)
```

## What Happens Now

1. **First deployment with volume:**
   - Database file is created at `/data/database.sqlite`
   - All your data is stored there

2. **Subsequent deployments:**
   - Railway keeps the `/data` directory intact
   - Your database file persists
   - All bookings, slots, and user data remain

3. **If you need to reset:**
   - You can delete the volume and create a new one
   - Or manually delete the database file via Railway's console/terminal

## Next Steps

Once persistent volume is working:
- ✅ Your data will persist across deployments
- ✅ You can safely push new versions without losing data
- 🔄 Later, consider migrating to Railway Postgres for better scalability

## Quick Reference

**Volume Mount Path:** `/data`
**Database File Path:** `/data/database.sqlite`
**Environment Variable:** `DATABASE_PATH=/data/database.sqlite`

---

**Need help?** Check Railway's documentation: https://docs.railway.app/storage/volumes

