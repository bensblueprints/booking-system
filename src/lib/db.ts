import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { runMigrations } from "./migrate";

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

  // Run all migrations (creates tables, adds columns, seeds data)
  runMigrations(db);

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

  return db;
}
