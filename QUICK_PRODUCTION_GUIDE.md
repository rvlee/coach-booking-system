# Quick Production Deployment Guide

## 🚨 CRITICAL: What I've Already Changed

I've already updated your code to be production-ready:

1. ✅ **Removed auto-login** from `AuthContext.tsx`
2. ✅ **Updated hardcoded localhost URLs** to use environment variables
3. ✅ **Updated CORS** to respect `FRONTEND_URL` environment variable
4. ✅ **Updated Google redirect URI** to use environment variable

## 📋 What You Still Need to Do

### 1. Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Create/Select a project
3. Enable **Google Calendar API**
4. Configure **OAuth consent screen**:
   - App name: Your app name
   - User support email: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
   - **Publish the app** (or set to Testing mode)
5. Create **OAuth 2.0 Client ID**:
   - Type: Web application
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/google/callback`
   - Copy Client ID and Secret

### 2. Environment Variables

Create `server/.env` with:

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=your-very-strong-random-secret-32-chars-minimum
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Build Frontend

```bash
cd client
npm run build
```

### 4. Deploy

Choose your platform:
- **Vercel/Netlify** (Frontend) + **Railway/Render** (Backend)
- **Single server** with Nginx
- **Docker** containers

### 5. SSL/HTTPS

**Required for Google OAuth!**
- Use Let's Encrypt (free)
- Or your hosting provider's SSL

## ✅ Verification

After deployment, test:
- [ ] Can register/login (no auto-login)
- [ ] Google Calendar connection works
- [ ] Booking flow works
- [ ] Calendar invites are sent
- [ ] HTTPS is enabled

## 📚 Full Details

See `PRODUCTION_DEPLOYMENT.md` for complete instructions.





