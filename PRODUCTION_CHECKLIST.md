# Production Readiness Checklist

## 🔴 CRITICAL - Must Remove Before Production

### 1. Auto-Login Feature
- [ ] **File:** `client/src/context/AuthContext.tsx`
- [ ] Remove `DEFAULT_EMAIL` and `DEFAULT_PASSWORD` constants
- [ ] Remove auto-login logic in `useEffect` (lines 35-52)
- [ ] Users must manually log in

### 2. Hardcoded localhost URLs
- [ ] **File:** `server/routes/bookings.js` (line 44)
- [ ] **File:** `server/routes/slots.js` (lines 75, 127, 250)
- [ ] **File:** `server/google.js` (line 7)
- [ ] Replace with `process.env.FRONTEND_URL` or `req.headers.origin`

### 3. CORS Configuration
- [ ] **File:** `server/index.js`
- [ ] Update CORS to only allow production domain
- [ ] Remove open CORS (`app.use(cors())`)

## 🟡 IMPORTANT - Should Update

### 4. Environment Variables
- [ ] Create production `.env` file
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Update Google OAuth credentials

### 5. Google OAuth Setup
- [ ] Create production OAuth credentials in Google Cloud Console
- [ ] Add production redirect URI: `https://yourdomain.com/api/google/callback`
- [ ] Add authorized JavaScript origins
- [ ] Publish OAuth app (or set to testing mode)
- [ ] Add test users if in testing mode

### 6. Security
- [ ] Verify `.env` is in `.gitignore`
- [ ] Remove console.log statements (or make conditional)
- [ ] Enable HTTPS/SSL
- [ ] Verify database is not publicly accessible

## 🟢 RECOMMENDED - Nice to Have

### 7. Database
- [ ] Consider migrating from SQLite to PostgreSQL for production
- [ ] Set up database backups
- [ ] Configure connection pooling

### 8. Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up logging service
- [ ] Configure uptime monitoring

### 9. Performance
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure caching headers

---

## Quick Code Changes

### Change 1: Remove Auto-Login
**File:** `client/src/context/AuthContext.tsx`

**Remove these lines:**
```typescript
const DEFAULT_EMAIL = 'roylee0628@gmail.com';
const DEFAULT_PASSWORD = 'kanjani8';
```

**Replace useEffect (lines 25-53) with:**
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

### Change 2: Update localhost URLs
**Files:** `server/routes/bookings.js`, `server/routes/slots.js`

**Replace:**
```javascript
const origin = 'http://localhost:3000';
```

**With:**
```javascript
const origin = process.env.FRONTEND_URL || req.headers.origin || 'https://yourdomain.com';
```

### Change 3: Update CORS
**File:** `server/index.js`

**Replace:**
```javascript
app.use(cors());
```

**With:**
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### Change 4: Update Google Redirect URI
**File:** `server/google.js`

**Line 7 already uses environment variable, just ensure `.env` has:**
```
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google/callback
```

---

## Google OAuth Production Steps

1. **Google Cloud Console** → Create/Select Project
2. **Enable Google Calendar API**
3. **OAuth Consent Screen** → Configure → Publish
4. **Credentials** → Create OAuth 2.0 Client ID
   - Type: Web application
   - Authorized redirect URIs: `https://yourdomain.com/api/google/callback`
   - Authorized JavaScript origins: `https://yourdomain.com`
5. **Copy credentials** to production `.env`

---

## Testing After Changes

1. Test registration/login (no auto-login)
2. Test booking flow
3. Test Google Calendar connection
4. Test shared class booking
5. Verify calendar invites are sent
6. Test on mobile device
7. Verify HTTPS works
8. Test all settings features





