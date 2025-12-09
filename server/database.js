import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');

let db;

export function getDb() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

// Promisify database methods
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function initDatabase() {
  const db = getDb();
  
  // Coaches table
  db.run(`
    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Slots table
  db.run(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      duration_minutes INTEGER NOT NULL,
      is_available BOOLEAN DEFAULT 1,
      booking_link TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES coaches(id)
    )
  `);

  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_phone TEXT,
      notes TEXT,
      status TEXT DEFAULT 'confirmed',
      willing_to_share BOOLEAN DEFAULT 0,
      is_shared BOOLEAN DEFAULT 0,
      shared_with_booking_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slot_id) REFERENCES slots(id),
      FOREIGN KEY (coach_id) REFERENCES coaches(id),
      FOREIGN KEY (shared_with_booking_id) REFERENCES bookings(id)
    )
  `);
  
  // Add new columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE bookings ADD COLUMN willing_to_share BOOLEAN DEFAULT 0`, () => {});
  db.run(`ALTER TABLE bookings ADD COLUMN is_shared BOOLEAN DEFAULT 0`, () => {});
  db.run(`ALTER TABLE bookings ADD COLUMN shared_with_booking_id INTEGER`, () => {});

  // Google tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER UNIQUE NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date INTEGER,
      calendar_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES coaches(id)
    )
  `);

  // Add Google event mapping to slots if missing
  db.run(`ALTER TABLE slots ADD COLUMN google_event_id TEXT`, (err) => {
    // Ignore error if column already exists
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Error adding google_event_id column:', err.message);
    }
  });

  // Add coach_booking_link to coaches table if missing
  // Note: SQLite doesn't support adding UNIQUE constraint directly, so we add it as TEXT
  // Uniqueness is handled by the application (UUIDs are unique)
  db.run(`ALTER TABLE coaches ADD COLUMN coach_booking_link TEXT`, (err) => {
    // Ignore error if column already exists
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Error adding coach_booking_link column:', err.message);
    }
  });

  console.log('Database initialized');
}

