# Railway Persistent Volume - Quick Checklist

## ✅ Setup Steps (5 minutes)

- [ ] **Step 1:** Go to Railway Dashboard → Your Project
- [ ] **Step 2:** Click "New" → "Volume"
  - Name: `database-storage`
  - Mount Path: `/data`
  - Size: 1GB
- [ ] **Step 3:** Attach volume to your backend service
  - Service Settings → Volumes → Attach `database-storage` to `/data`
- [ ] **Step 4:** Add environment variable
  - Service Settings → Variables
  - Add: `DATABASE_PATH=/data/database.sqlite`
- [ ] **Step 5:** Redeploy service
  - Railway should auto-redeploy, or manually trigger redeploy
- [ ] **Step 6:** Verify in logs
  - Look for: `Connected to SQLite database at: /data/database.sqlite`

## ✅ Test Persistence

- [ ] Create a test booking/slot
- [ ] Trigger a new deployment
- [ ] Verify test data still exists after deployment

## 🎯 Key Values

- **Volume Mount Path:** `/data`
- **Environment Variable:** `DATABASE_PATH=/data/database.sqlite`
- **Database File:** `/data/database.sqlite`

---

**Detailed instructions:** See `RAILWAY_PERSISTENT_VOLUME_SETUP.md`

