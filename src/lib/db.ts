import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DB_PATH || "./data/booking.db";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeTables(db);
  return db;
}

function initializeTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      deposit_percent REAL DEFAULT 50,
      seats_per_slot INTEGER DEFAULT 6,
      duration_minutes INTEGER DEFAULT 120,
      season_start TEXT,
      season_end TEXT,
      active INTEGER DEFAULT 1,
      color TEXT DEFAULT '#1B6B8A',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      booked_seats INTEGER DEFAULT 0,
      google_event_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER REFERENCES slots(id),
      product_id INTEGER REFERENCES products(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      party_size INTEGER DEFAULT 1,
      total_amount REAL NOT NULL,
      deposit_amount REAL NOT NULL,
      payment_status TEXT DEFAULT pending,
      payment_provider TEXT,
      payment_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if none exists
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM admins").get() as { count: number };
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run("admin", hash);
  }

  // Seed default settings
  const defaultSettings: Record<string, string> = {
    stripe_secret_key: "",
    stripe_publishable_key: "",
    authorizenet_api_login: "",
    authorizenet_transaction_key: "",
    google_calendar_id: "",
    google_service_account_json: "",
    business_name: "Booking System",
    business_phone: "",
    business_email: "",
    payment_provider: "stripe",
  };

  const upsert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [key, value] of Object.entries(defaultSettings)) {
    upsert.run(key, value);
  }
}
