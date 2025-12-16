# Step-by-Step: Deploy Frontend to Vercel

This guide will walk you through deploying your Coach Booking System frontend to Vercel.

## Prerequisites

- ✅ GitHub repository is set up and pushed
- ✅ Vercel account (free)
- ✅ Frontend code is ready

---

## Step 1: Sign Up for Vercel

1. Go to **https://vercel.com/**
2. Click **"Sign Up"** (top right)
3. Choose **"Continue with GitHub"** (recommended)
   - This allows Vercel to access your repositories
   - Click **"Authorize Vercel"** when prompted
4. Complete the sign-up process

---

## Step 2: Create New Project

1. After signing in, you'll see the Vercel dashboard
2. Click **"Add New..."** button (top right)
3. Select **"Project"** from the dropdown
4. You'll see a list of your GitHub repositories
5. Find and click on **`coach-booking-system`**
6. Click **"Import"** button

---

## Step 3: Configure Project Settings

Vercel will try to auto-detect your project settings. You need to configure them:

### Root Directory
1. Click **"Edit"** next to "Root Directory"
2. Change from `.` (root) to **`client`**
3. Click **"Continue"**

### Framework Preset
- Leave as **"Other"** or **"Vite"** (Vercel should auto-detect Vite)

### Build Settings

Configure these settings:

1. **Root Directory**: `client` (should already be set)
2. **Build Command**: 
   ```
   npm install && npm run build
   ```
3. **Output Directory**: 
   ```
   dist
   ```
4. **Install Command**: 
   ```
   npm install
   ```
   (Leave as default)

### Environment Variables

**IMPORTANT:** You'll need to add your backend API URL here.

1. Click **"Environment Variables"** section
2. Click **"Add"** or **"Add Another"**
3. Add this variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.railway.app` 
     - (For now, use a placeholder like `https://placeholder.railway.app` - we'll update it after deploying the backend)
   - **Environment**: Select all three (Production, Preview, Development)
4. Click **"Save"**

---

## Step 4: Deploy

1. Review all settings:
   - ✅ Root Directory: `client`
   - ✅ Build Command: `npm install && npm run build`
   - ✅ Output Directory: `dist`
   - ✅ Environment Variable: `VITE_API_URL` set

2. Click **"Deploy"** button (bottom right)

3. Vercel will:
   - Clone your repository
   - Install dependencies
   - Build your frontend
   - Deploy to a URL

4. **Wait for deployment** (usually 1-3 minutes)
   - You'll see build logs in real-time
   - Watch for any errors

---

## Step 5: Verify Deployment

1. Once deployment completes, you'll see:
   - ✅ "Ready" status
   - A URL like: `coach-booking-system.vercel.app`

2. Click on the URL or the **"Visit"** button

3. **Test the frontend:**
   - You should see the login page
   - Try registering a new account
   - Note: API calls won't work yet until backend is deployed

---

## Step 6: Get Your Frontend URL

1. After successful deployment, note your Vercel URL:
   - It will be something like: `https://coach-booking-system.vercel.app`
   - Or: `https://coach-booking-system-[your-username].vercel.app`

2. **Copy this URL** - you'll need it for:
   - Backend `FRONTEND_URL` environment variable
   - Google OAuth authorized origins

---

## Step 7: Update Environment Variable (After Backend is Deployed)

Once you deploy your backend to Railway, you'll need to update the `VITE_API_URL`:

1. Go to your Vercel project dashboard
2. Click on **"Settings"** tab
3. Click **"Environment Variables"** in the left sidebar
4. Find `VITE_API_URL`
5. Click the **"..."** menu → **"Edit"**
6. Update the value to your actual Railway backend URL:
   ```
   https://your-backend.railway.app
   ```
7. Click **"Save"**

8. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"..."** on the latest deployment
   - Click **"Redeploy"**
   - This rebuilds with the new environment variable

---

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Check that `Root Directory` is set to `client`
- Verify `package.json` exists in the `client` folder

**Error: "Build command failed"**
- Check build logs for specific errors
- Verify `npm run build` works locally
- Make sure all dependencies are in `package.json`

**Error: "Output directory not found"**
- Verify `Output Directory` is set to `dist`
- Check that Vite builds to `dist` folder (check `vite.config.ts`)

### Frontend Loads But API Calls Fail

**CORS Errors:**
- Backend needs to have `FRONTEND_URL` set to your Vercel URL
- Check backend CORS configuration

**404 Errors on API Calls:**
- Verify `VITE_API_URL` is set correctly in Vercel
- Check that the environment variable is set for the correct environment (Production)
- Redeploy after updating environment variables

### Environment Variables Not Working

- Make sure variable name is exactly `VITE_API_URL` (case-sensitive)
- Vite environment variables must start with `VITE_`
- Redeploy after adding/updating environment variables
- Check that variable is set for "Production" environment

---

## Quick Reference

### Vercel Project Settings Summary:

```
Root Directory: client
Build Command: npm install && npm run build
Output Directory: dist
Install Command: npm install (default)
```

### Environment Variables:

```
VITE_API_URL=https://your-backend.railway.app
```

### Your Frontend URL:

After deployment, you'll get:
```
https://your-project.vercel.app
```

---

## Next Steps

After frontend is deployed:

1. ✅ **Deploy Backend to Railway** (see `DEPLOYMENT_STEPS.md`)
2. ✅ **Update `VITE_API_URL`** in Vercel with Railway backend URL
3. ✅ **Redeploy frontend** to pick up the new environment variable
4. ✅ **Configure Google OAuth** with your Vercel URL
5. ✅ **Test the full flow**

---

## Tips

- **Automatic Deployments**: Vercel automatically deploys when you push to GitHub
- **Preview Deployments**: Each pull request gets its own preview URL
- **Custom Domain**: You can add a custom domain in Settings → Domains
- **Analytics**: Vercel provides analytics on your deployments

---

## Support

If you encounter issues:
1. Check Vercel build logs for errors
2. Verify all settings match the guide above
3. Test `npm run build` locally first
4. Check Vercel documentation: https://vercel.com/docs

