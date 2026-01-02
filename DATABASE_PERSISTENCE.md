# Database Persistence Guide

## Problem

When deploying to platforms like Vercel or Railway, the filesystem is **ephemeral** (temporary). This means:
- Each deployment wipes the database file
- All bookings, slots, and user data are lost on every deployment
- SQLite files stored in the project directory are deleted

## Solution Options

### Option 1: Use Persistent Volume (Railway/Render)

If you're using **Railway** or **Render**, you can use persistent volumes:

#### Railway Setup:

1. **Add a Persistent Volume:**
   - Go to your Railway project
   - Click "New" → "Volume"
   - Name it: `database-storage`
   - Mount path: `/data`

2. **Set Environment Variable:**
   - In Railway project settings, add:
   ```
   DATABASE_PATH=/data/database.sqlite
   ```

3. **Deploy:**
   - The database will now persist in `/data/database.sqlite` across deployments

#### Render Setup:

1. **Add a Disk:**
   - Go to your Render service settings
   - Add a "Persistent Disk"
   - Mount path: `/data`

2. **Set Environment Variable:**
   ```
   DATABASE_PATH=/data/database.sqlite
   ```

### Option 2: Migrate to Cloud Database (Recommended for Production)

For production, consider migrating to a managed database service:

#### A. Railway PostgreSQL (Easiest Migration)

1. **Create PostgreSQL Database:**
   - In Railway dashboard: "New" → "Database" → "PostgreSQL"
   - Copy the connection string

2. **Install PostgreSQL Driver:**
   ```bash
   cd server
   npm install pg
   ```

3. **Update `database.js`:**
   - Replace SQLite with PostgreSQL connection
   - Update SQL queries (SQLite → PostgreSQL syntax)

#### B. Vercel Postgres

1. **Create Vercel Postgres:**
   - In Vercel dashboard: "Storage" → "Create Database" → "Postgres"
   - Copy connection string

2. **Set Environment Variable:**
   ```
   DATABASE_URL=postgresql://...
   ```

#### C. Supabase (Free Tier Available)

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Create new project
   - Copy connection string

2. **Set Environment Variable:**
   ```
   DATABASE_URL=postgresql://...
   ```

#### D. PlanetScale (MySQL)

1. **Create PlanetScale Database:**
   - Go to https://planetscale.com
   - Create database
   - Copy connection string

2. **Set Environment Variable:**
   ```
   DATABASE_URL=mysql://...
   ```

### Option 3: External File Storage (Advanced)

Store the database file in:
- **AWS S3** (with periodic sync)
- **Google Cloud Storage**
- **Azure Blob Storage**

This requires additional code to download/upload the database file on startup/shutdown.

## Quick Fix for Current Deployment

If you need an immediate solution and you're using **Railway**:

1. **Add Persistent Volume:**
   ```bash
   # In Railway dashboard:
   # New → Volume → Mount at /data
   ```

2. **Set Environment Variable:**
   ```
   DATABASE_PATH=/data/database.sqlite
   ```

3. **Redeploy:**
   - Your database will now persist!

## Migration Steps (SQLite → PostgreSQL)

If you want to migrate to PostgreSQL:

1. **Export current data:**
   ```bash
   sqlite3 database.sqlite .dump > backup.sql
   ```

2. **Create PostgreSQL database**

3. **Update `server/database.js`** to use PostgreSQL

4. **Import data** (convert SQLite SQL to PostgreSQL)

5. **Test thoroughly**

## Recommended Approach

**For Production:**
- ✅ Use **PostgreSQL** (Railway, Vercel Postgres, or Supabase)
- ✅ Set up automated backups
- ✅ Monitor database size and performance

**For Development:**
- ✅ Keep SQLite (faster, simpler)
- ✅ Use `DATABASE_PATH=./database.sqlite` (default)

## Environment Variables

Add to your production `.env`:

```env
# For SQLite with persistent volume
DATABASE_PATH=/data/database.sqlite

# OR for PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## Testing Persistence

After setting up persistent storage:

1. Create a test booking
2. Deploy a new version
3. Verify the booking still exists

If it persists, you're all set! 🎉

