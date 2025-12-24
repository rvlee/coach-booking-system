# Production Deployment Guide

This guide covers everything you need to deploy the Coach Booking System to production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Google OAuth Production Setup](#google-oauth-production-setup)
3. [Code Changes for Production](#code-changes-for-production)
4. [Environment Variables](#environment-variables)
5. [Build and Deploy](#build-and-deploy)
6. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Checklist

### Code Changes Required

#### 1. Remove Auto-Login (CRITICAL)
**File:** `client/src/context/AuthContext.tsx`

**Remove:**
- Lines 6-7: `DEFAULT_EMAIL` and `DEFAULT_PASSWORD` constants
- Lines 35-52: Auto-login logic in `useEffect`

**Replace with:**
```typescript
useEffect(() => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (token && userData) {
    setUser(JSON.parse(userData) as Coach);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  setLoading(false);
}, []);
```

#### 2. Replace Hardcoded localhost URLs

**Files to update:**
- `server/routes/bookings.js` (line 44)
- `server/routes/slots.js` (lines 75, 127, 250)
- `server/google.js` (line 7 - default redirect URI)

**Change from:**
```javascript
const origin = 'http://localhost:3000';
```

**Change to:**
```javascript
const origin = process.env.FRONTEND_URL || req.headers.origin || 'https://yourdomain.com';
```

#### 3. Update Vite Config for Production

**File:** `client/vite.config.ts`

**For production build, remove or update proxy:**
```typescript
export default defineConfig({
  plugins: [react()],
  // Remove server config for production build
  // Server config is only for development
});
```

#### 4. Update CORS Settings

**File:** `server/index.js`

**Change from:**
```javascript
app.use(cors());
```

**Change to:**
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

#### 5. Remove Development Console Logs (Optional but Recommended)

Search for and remove or conditionally log:
- `console.log()` statements (keep `console.error()` for production)
- Or wrap in: `if (process.env.NODE_ENV !== 'production') { console.log(...) }`

---

## Google OAuth Production Setup

### Step 1: Google Cloud Console Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click "Select a project" → "New Project"
   - Name: "Coach Booking System" (or your preferred name)
   - Click "Create"

3. **Enable Google Calendar API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - **User Type**: Select "External" (unless you have Google Workspace)
   - Click "Create"
   - **App Information**:
     - App name: "Coach Booking System" (or your app name)
     - User support email: Your email
     - Developer contact: Your email
   - **Scopes**: Click "Add or Remove Scopes"
     - Add: `https://www.googleapis.com/auth/calendar`
     - Click "Update" → "Save and Continue"
   - **Test Users** (for testing):
     - Add test user emails (your email, coaches' emails)
     - Click "Save and Continue"
   - **Summary**: Review and click "Back to Dashboard"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - **Application type**: "Web application"
   - **Name**: "Coach Booking System Web Client"
   - **Authorized JavaScript origins**:
     - Add: `https://yourdomain.com`
     - Add: `https://www.yourdomain.com` (if using www)
   - **Authorized redirect URIs**:
     - Add: `https://yourdomain.com/api/google/callback`
     - Add: `https://api.yourdomain.com/api/google/callback` (if using subdomain)
   - Click "Create"
   - **IMPORTANT**: Copy the Client ID and Client Secret immediately
     - You won't be able to see the secret again!

6. **Publish Your App** (Required for Production)
   - Go to "OAuth consent screen"
   - Click "PUBLISH APP" button
   - Confirm publishing
   - **Note**: This may take a few days for Google to review
   - For testing, you can use "Test" mode with test users

### Step 2: Update Environment Variables

Update your production `.env` file with:
```
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback
```

---

## Environment Variables

### Production `.env` File

Create `server/.env` with:

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Frontend URL (for CORS and redirects)
FRONTEND_URL=https://yourdomain.com

# JWT Secret (USE A STRONG RANDOM STRING)
JWT_SECRET=your-very-strong-random-secret-key-min-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback

# Database (if using different database)
# DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Generate Secure JWT Secret

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Build and Deploy

### 1. Build Frontend

```bash
cd client
npm install
npm run build
```

This creates a `client/dist` folder with production-ready files.

### 2. Prepare Backend

```bash
cd server
npm install --production
```

### 3. Deployment Options

#### Option A: Single Server (Recommended for Small Scale)

**Using PM2 (Process Manager):**
```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd server
pm2 start index.js --name coach-booking-api

# Serve frontend (using serve or nginx)
cd ../client
npx serve -s dist -l 3000
# Or use PM2:
pm2 serve dist 3000 --name coach-booking-frontend --spa
```

**Using Nginx:**
```nginx
# /etc/nginx/sites-available/coach-booking
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/coach-booking-system/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Option B: Separate Frontend/Backend

**Frontend (Vercel/Netlify):**
- Connect your GitHub repo
- Build command: `cd client && npm install && npm run build`
- Output directory: `client/dist`
- Environment variables: Set `VITE_API_URL=https://api.yourdomain.com`

**Backend (Railway/Heroku/Render):**
- Connect your GitHub repo
- Build command: `cd server && npm install`
- Start command: `node index.js`
- Set environment variables in platform dashboard

### 4. SSL/HTTPS Setup

**Required for Google OAuth!**

- Use Let's Encrypt (free SSL):
  ```bash
  sudo apt-get install certbot python3-certbot-nginx
  sudo certbot --nginx -d yourdomain.com
  ```

- Or use your hosting provider's SSL (most platforms provide free SSL)

---

## Code Changes Summary

### Files to Modify:

1. **`client/src/context/AuthContext.tsx`**
   - Remove auto-login code (lines 6-7, 35-52)

2. **`server/routes/bookings.js`**
   - Line 44: Use `process.env.FRONTEND_URL` instead of hardcoded localhost

3. **`server/routes/slots.js`**
   - Lines 75, 127, 250: Use `process.env.FRONTEND_URL` instead of hardcoded localhost

4. **`server/google.js`**
   - Line 7: Use `process.env.GOOGLE_REDIRECT_URI` instead of hardcoded localhost

5. **`server/index.js`**
   - Update CORS to use `process.env.FRONTEND_URL`
   - Update console.log to use environment check

6. **`client/vite.config.ts`**
   - Remove or conditionally include server config (only needed for dev)

---

## Post-Deployment Verification

### 1. Test Authentication
- [ ] Can register new coach account
- [ ] Can log in with credentials
- [ ] No auto-login occurs
- [ ] JWT tokens work correctly

### 2. Test Google Calendar
- [ ] Can connect Google Calendar
- [ ] OAuth redirect works correctly
- [ ] Busy times load from Google Calendar
- [ ] Events are created in Google Calendar
- [ ] Calendar invites are sent to clients

### 3. Test Booking Flow
- [ ] Coach can create slots
- [ ] Booking link is accessible
- [ ] Client can book slots
- [ ] Shared class booking works
- [ ] Calendar events update correctly

### 4. Test Settings
- [ ] Timezone setting works
- [ ] Daily booking limit is enforced
- [ ] Language switching works

### 5. Security Checks
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] JWT secret is strong and secure
- [ ] Environment variables are not exposed
- [ ] Database is not publicly accessible

---

## Google OAuth Verification Checklist

- [ ] OAuth consent screen is published (or in testing mode)
- [ ] Authorized redirect URI matches production URL exactly
- [ ] Authorized JavaScript origins include your domain
- [ ] Google Calendar API is enabled
- [ ] Test users are added (if in testing mode)
- [ ] Production credentials are in `.env` file
- [ ] Redirect URI in `.env` matches Google Console

---

## Common Issues

### Issue: "redirect_uri_mismatch"
**Solution:**
- Verify redirect URI in Google Console matches exactly (including https://)
- Check `GOOGLE_REDIRECT_URI` in `.env` matches
- No trailing slashes

### Issue: "Access blocked: This app's request is invalid"
**Solution:**
- App needs to be published (or use test mode)
- Add user as test user in OAuth consent screen
- Wait for Google review (can take 1-7 days)

### Issue: CORS errors
**Solution:**
- Verify `FRONTEND_URL` in `.env` matches your domain
- Check CORS configuration in `server/index.js`
- Ensure both http and https are handled if needed

### Issue: Calendar invites not sending
**Solution:**
- Verify `sendUpdates: 'all'` is in the API call
- Check Google Calendar API quota limits
- Verify OAuth scopes include calendar access

---

## Production Database Considerations

**Current:** SQLite (fine for small scale)

**For Production (Recommended):**
- **PostgreSQL** (recommended)
- **MySQL**
- **MongoDB**

**Migration Steps:**
1. Export data from SQLite
2. Set up production database
3. Update `server/database.js` to use production DB
4. Import data

---

## Monitoring and Maintenance

### Recommended Tools:
- **Error Tracking**: Sentry, Rollbar
- **Logging**: Winston, Pino
- **Monitoring**: PM2 Plus, New Relic
- **Uptime**: UptimeRobot, Pingdom

### Regular Tasks:
- Monitor error logs
- Check Google Calendar API quota
- Backup database regularly
- Update dependencies
- Review security patches

---

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong JWT secrets** - Minimum 32 characters, random
3. **Enable HTTPS** - Required for OAuth
4. **Rate limiting** - Consider adding rate limits to API
5. **Input validation** - Validate all user inputs
6. **SQL injection protection** - Use parameterized queries (already done)
7. **XSS protection** - React automatically escapes, but be careful with user content

---

## Support

If you encounter issues:
1. Check server logs
2. Check browser console
3. Verify environment variables
4. Test Google OAuth in Google Cloud Console
5. Review this guide's troubleshooting section





