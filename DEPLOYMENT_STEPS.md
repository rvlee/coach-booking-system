# Step-by-Step Deployment Guide: Vercel + Railway

This guide will walk you through deploying your Coach Booking System to production.

## Prerequisites

- ✅ GitHub repository is set up and pushed
- ✅ Google Cloud Console account
- ✅ Vercel account (free)
- ✅ Railway account (free tier available)

---

## Part 1: Deploy Backend to Railway

### Step 1: Sign up for Railway

1. Go to **https://railway.app/**
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with your **GitHub account** (recommended)
4. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select your **`coach-booking-system`** repository
4. Click **"Deploy Now"**

### Step 3: Configure Backend Service

1. Railway will detect your project
2. Click on the service that was created
3. Go to **"Settings"** tab
4. Configure:
   - **Root Directory**: `server`
   - **Start Command**: `node index.js`
   - **Watch Paths**: Leave default

### Step 4: Add Environment Variables

1. In Railway, go to your service
2. Click on **"Variables"** tab
3. Click **"New Variable"** and add each of these:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
JWT_SECRET=your-very-strong-random-secret-32-chars-minimum
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/google/callback
```

**Important Notes:**
- Replace `your-frontend.vercel.app` with your actual Vercel URL (we'll get this in Part 2)
- Replace `your-backend.railway.app` with your Railway URL (shown in Railway dashboard)
- Generate JWT_SECRET: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in terminal
- Get Google credentials from Google Cloud Console (see Part 3)

### Step 5: Get Your Backend URL

1. After deployment starts, Railway will assign a URL
2. Go to **"Settings"** → **"Domains"**
3. You'll see a URL like: `coach-booking-system-production.up.railway.app`
4. **Copy this URL** - you'll need it for:
   - Frontend environment variable
   - Google OAuth redirect URI

### Step 6: Verify Backend is Running

1. Wait for deployment to complete (green checkmark)
2. Test the health endpoint:
   - Open: `https://your-backend.railway.app/api/health`
   - Should return: `{"status":"ok"}`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Sign up for Vercel

1. Go to **https://vercel.com/**
2. Click **"Sign Up"**
3. Sign up with your **GitHub account** (recommended)
4. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find and select your **`coach-booking-system`** repository
3. Click **"Import"**

### Step 3: Configure Frontend Build

1. In the project configuration:
   - **Framework Preset**: Leave as "Other" or "Vite"
   - **Root Directory**: Click "Edit" → Set to `client`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: Leave default (`npm install`)

2. Click **"Deploy"**

### Step 4: Add Environment Variables

1. After initial deployment, go to **"Settings"** → **"Environment Variables"**
2. Add:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
   (Replace with your actual Railway backend URL from Part 1, Step 5)

3. Click **"Save"**

### Step 5: Redeploy with Environment Variable

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. This ensures the environment variable is included in the build

### Step 6: Get Your Frontend URL

1. After deployment, Vercel will assign a URL
2. You'll see it in the deployment page
3. It will be like: `coach-booking-system.vercel.app`
4. **Copy this URL** - you'll need it for:
   - Backend `FRONTEND_URL` environment variable
   - Google OAuth authorized origins

### Step 7: Update Backend Environment Variable

1. Go back to **Railway**
2. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
   (Use your actual Vercel URL)
3. Railway will automatically redeploy

---

## Part 3: Configure Google OAuth for Production

### Step 1: Go to Google Cloud Console

1. Go to **https://console.cloud.google.com/**
2. Select your project (or create a new one)

### Step 2: Update OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. If not already published:
   - Complete all required fields
   - Add scopes: `https://www.googleapis.com/auth/calendar`
   - Add test users (if in Testing mode)
   - Click **"PUBLISH APP"**

### Step 3: Create Production OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, select **"Web application"**
4. Configure:
   - **Name**: "Coach Booking System Production"
   - **Authorized JavaScript origins**:
     - `https://your-frontend.vercel.app`
     - `https://www.your-frontend.vercel.app` (if using www)
   - **Authorized redirect URIs**:
     - `https://your-backend.railway.app/api/google/callback`
5. Click **"Create"**
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - You won't be able to see the secret again!

### Step 4: Update Railway Environment Variables

1. Go back to **Railway**
2. Update these environment variables:
   ```
   GOOGLE_CLIENT_ID=your-new-production-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-new-production-client-secret
   GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/google/callback
   ```
3. Railway will automatically redeploy

---

## Part 4: Update Frontend to Use Backend API

### Step 1: Configure Frontend API URL

The frontend is already configured to use the `VITE_API_URL` environment variable. 

1. In Vercel, go to **"Settings"** → **"Environment Variables"**
2. Ensure `VITE_API_URL` is set to your Railway backend URL:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
   (No trailing slash!)
3. After setting/updating, redeploy the frontend

### Step 2: Verify Configuration

The frontend code in `main.tsx` automatically uses `VITE_API_URL` when available. In development, it uses the Vite proxy. In production, it uses the environment variable.

---

## Part 5: Test Your Deployment

### Step 1: Test Frontend

1. Open your Vercel URL: `https://your-frontend.vercel.app`
2. You should see the login page
3. Try registering a new account

### Step 2: Test Backend API

1. Test health endpoint:
   ```
   https://your-backend.railway.app/api/health
   ```
   Should return: `{"status":"ok"}`

### Step 3: Test Full Flow

1. **Register/Login**: Create a coach account
2. **Connect Google Calendar**: 
   - Click "Connect Google Calendar"
   - Authorize access
   - Should see "Connected" status
3. **Create Slots**: Create some booking slots
4. **Test Booking**: Use the booking link to book a slot
5. **Test Shared Class**: Test the "willing to share" feature
6. **Check Google Calendar**: Verify events are created

### Step 4: Test on Mobile

1. Open your Vercel URL on your phone
2. Test the booking flow
3. Verify mobile responsiveness

---

## Part 6: Custom Domain (Optional)

### Vercel Custom Domain

1. In Vercel, go to **"Settings"** → **"Domains"**
2. Add your custom domain (e.g., `booking.yourdomain.com`)
3. Follow Vercel's DNS instructions
4. Update `FRONTEND_URL` in Railway

### Railway Custom Domain

1. In Railway, go to **"Settings"** → **"Domains"**
2. Add your custom domain
3. Follow Railway's DNS instructions
4. Update Google OAuth redirect URIs

---

## Troubleshooting

### Backend Not Starting

**Check:**
- Environment variables are set correctly
- `PORT` is set (Railway provides `PORT` automatically, but set it just in case)
- Check Railway logs: **"Deployments"** → Click deployment → **"View Logs"**

### Frontend Can't Connect to Backend

**Check:**
- `VITE_API_URL` is set in Vercel
- Backend URL is correct (no trailing slash)
- CORS is configured correctly in backend
- Backend is actually running (check Railway logs)

### Google OAuth Not Working

**Check:**
- Redirect URI matches exactly (including https://)
- Authorized JavaScript origins include your frontend URL
- OAuth app is published (or you're a test user)
- Environment variables are set correctly in Railway

### Database Issues

**Note:** SQLite file-based database may have issues with multiple instances.

**Solutions:**
- Railway provides persistent storage, but for production, consider:
  - Railway PostgreSQL addon
  - Supabase (free tier)
  - PlanetScale (free tier)

---

## Environment Variables Summary

### Railway (Backend) - Required Variables:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
JWT_SECRET=your-very-strong-random-secret-32-chars-minimum
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/google/callback
```

### Vercel (Frontend) - Required Variables:

```
VITE_API_URL=https://your-backend.railway.app
```

---

## Quick Reference URLs

After deployment, you'll have:

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.up.railway.app`
- **Health Check**: `https://your-app.up.railway.app/api/health`

---

## Next Steps After Deployment

1. ✅ Test all features
2. ✅ Set up monitoring (optional)
3. ✅ Configure custom domain (optional)
4. ✅ Set up database backups
5. ✅ Add error tracking (Sentry, etc.)

---

## Support

If you encounter issues:
1. Check Railway logs
2. Check Vercel deployment logs
3. Verify environment variables
4. Test API endpoints directly
5. Check browser console for frontend errors

