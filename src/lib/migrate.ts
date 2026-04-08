import Database from "better-sqlite3";

function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists
  }
}

export function runMigrations(db: Database.Database) {
  // ── Existing tables (unchanged) ──────────────────────────
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
      payment_status TEXT DEFAULT 'pending',
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

  // ── Phase 1: New tables ──────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')),
      discount_value REAL NOT NULL,
      min_order REAL DEFAULT 0,
      max_uses INTEGER DEFAULT NULL,
      used_count INTEGER DEFAULT 0,
      product_id INTEGER DEFAULT NULL,
      start_date TEXT DEFAULT NULL,
      end_date TEXT DEFAULT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      product_id INTEGER DEFAULT NULL,
      max_quantity INTEGER DEFAULT 10,
      per_person INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS booking_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      addon_id INTEGER NOT NULL REFERENCES addons(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_type TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id),
      template_type TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'sent',
      error_message TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS blackout_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER DEFAULT NULL,
      date TEXT NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, date)
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      amount REAL NOT NULL,
      reason TEXT DEFAULT '',
      refund_provider TEXT NOT NULL,
      refund_id TEXT DEFAULT NULL,
      status TEXT DEFAULT 'completed',
      created_by TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Phase 1: Alter existing tables ───────────────────────
  addColumnIfNotExists(db, "bookings", "promo_code_id", "INTEGER DEFAULT NULL");
  addColumnIfNotExists(db, "bookings", "discount_amount", "REAL DEFAULT 0");
  addColumnIfNotExists(db, "bookings", "addons_total", "REAL DEFAULT 0");
  addColumnIfNotExists(db, "bookings", "manage_token", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "bookings", "status", "TEXT DEFAULT 'confirmed'");
  addColumnIfNotExists(db, "bookings", "cancelled_at", "TEXT DEFAULT NULL");
  addColumnIfNotExists(db, "bookings", "cancel_reason", "TEXT DEFAULT ''");
  addColumnIfNotExists(db, "bookings", "refund_amount", "REAL DEFAULT 0");

  addColumnIfNotExists(db, "products", "cutoff_hours", "INTEGER DEFAULT 0");
  addColumnIfNotExists(db, "products", "min_participants", "INTEGER DEFAULT 1");

  // ── Phase 1: Seed email templates ────────────────────────
  const insertTemplate = db.prepare(
    "INSERT OR IGNORE INTO email_templates (template_type, subject, body_html) VALUES (?, ?, ?)"
  );

  insertTemplate.run(
    "confirmation",
    "Booking Confirmed - {{product_name}}",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1B6B8A;">Booking Confirmed!</h2>
  <p>Hi {{customer_name}},</p>
  <p>Your booking has been confirmed. Here are the details:</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Experience</td><td style="padding:8px;border-bottom:1px solid #eee;">{{product_name}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_date}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Time</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_time}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Party Size</td><td style="padding:8px;border-bottom:1px solid #eee;">{{party_size}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Total Amount</td><td style="padding:8px;border-bottom:1px solid #eee;">\${{total_amount}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Deposit Paid</td><td style="padding:8px;border-bottom:1px solid #eee;">\${{deposit_amount}}</td></tr>
  </table>
  <p>You can manage your booking here:</p>
  <p><a href="{{manage_link}}" style="display:inline-block;background:#1B6B8A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Manage Booking</a></p>
  <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
  <p style="color:#666;font-size:14px;">{{business_name}}<br>{{business_phone}}<br>{{business_email}}</p>
</div>`
  );

  insertTemplate.run(
    "reminder_24h",
    "Reminder: {{product_name}} Tomorrow",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1B6B8A;">Your Booking is Tomorrow!</h2>
  <p>Hi {{customer_name}},</p>
  <p>Just a friendly reminder that your booking is coming up tomorrow.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Experience</td><td style="padding:8px;border-bottom:1px solid #eee;">{{product_name}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_date}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Time</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_time}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Party Size</td><td style="padding:8px;border-bottom:1px solid #eee;">{{party_size}}</td></tr>
  </table>
  <p>Need to make changes?</p>
  <p><a href="{{manage_link}}" style="display:inline-block;background:#1B6B8A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Manage Booking</a></p>
  <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
  <p style="color:#666;font-size:14px;">{{business_name}}<br>{{business_phone}}<br>{{business_email}}</p>
</div>`
  );

  insertTemplate.run(
    "cancellation",
    "Booking Cancelled - {{product_name}}",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#c0392b;">Booking Cancelled</h2>
  <p>Hi {{customer_name}},</p>
  <p>Your booking has been cancelled. Here are the details:</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Experience</td><td style="padding:8px;border-bottom:1px solid #eee;">{{product_name}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_date}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Time</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_time}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Total Amount</td><td style="padding:8px;border-bottom:1px solid #eee;">\${{total_amount}}</td></tr>
  </table>
  <p>If you have any questions, please contact us.</p>
  <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
  <p style="color:#666;font-size:14px;">{{business_name}}<br>{{business_phone}}<br>{{business_email}}</p>
</div>`
  );

  insertTemplate.run(
    "receipt",
    "Payment Receipt - {{product_name}}",
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1B6B8A;">Payment Receipt</h2>
  <p>Hi {{customer_name}},</p>
  <p>Here is your payment receipt:</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Experience</td><td style="padding:8px;border-bottom:1px solid #eee;">{{product_name}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_date}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Time</td><td style="padding:8px;border-bottom:1px solid #eee;">{{booking_time}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Party Size</td><td style="padding:8px;border-bottom:1px solid #eee;">{{party_size}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Total Amount</td><td style="padding:8px;border-bottom:1px solid #eee;">\${{total_amount}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Deposit Paid</td><td style="padding:8px;border-bottom:1px solid #eee;">\${{deposit_amount}}</td></tr>
  </table>
  <p>You can manage your booking here:</p>
  <p><a href="{{manage_link}}" style="display:inline-block;background:#1B6B8A;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Manage Booking</a></p>
  <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
  <p style="color:#666;font-size:14px;">{{business_name}}<br>{{business_phone}}<br>{{business_email}}</p>
</div>`
  );

  // ── Phase 1: Seed new settings ───────────────────────────
  const upsertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  const phase1Settings: Record<string, string> = {
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_email: "",
    smtp_from_name: "",
    email_provider: "smtp",
    resend_api_key: "",
    sendgrid_api_key: "",
    reminder_enabled: "0",
    reminder_hours: "24",
  };
  for (const [key, value] of Object.entries(phase1Settings)) {
    upsertSetting.run(key, value);
  }

  // ══════════════════════════════════════════════════════════
  // ── Phase 2: New tables ──────────────────────────────────
  // ══════════════════════════════════════════════════════════

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      total_bookings INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      first_booking TEXT DEFAULT NULL,
      last_booking TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS waivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content_html TEXT NOT NULL,
      product_id INTEGER DEFAULT NULL,
      required INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS waiver_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waiver_id INTEGER NOT NULL REFERENCES waivers(id),
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      customer_name TEXT NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      approved INTEGER DEFAULT 0,
      review_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quantity_discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      min_quantity INTEGER NOT NULL,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed_per_person')),
      discount_value REAL NOT NULL,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL REFERENCES slots(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      party_size INTEGER NOT NULL DEFAULT 1,
      status TEXT DEFAULT 'waiting',
      notified_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER DEFAULT NULL,
      notes TEXT DEFAULT '',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS slot_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL REFERENCES slots(id),
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      UNIQUE(slot_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS sms_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id),
      phone_number TEXT NOT NULL,
      message_type TEXT NOT NULL,
      twilio_sid TEXT DEFAULT NULL,
      status TEXT DEFAULT 'sent',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Phase 2: Alter existing tables ───────────────────────
  addColumnIfNotExists(db, "bookings", "customer_id", "INTEGER DEFAULT NULL");
  addColumnIfNotExists(db, "bookings", "checked_in", "INTEGER DEFAULT 0");
  addColumnIfNotExists(db, "bookings", "checked_in_at", "TEXT DEFAULT NULL");

  // ── Phase 2: Seed new settings ───────────────────────────
  const phase2Settings: Record<string, string> = {
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    sms_confirmation_enabled: "0",
    sms_reminder_enabled: "0",
    review_request_enabled: "0",
    review_request_delay_hours: "24",
  };
  for (const [key, value] of Object.entries(phase2Settings)) {
    upsertSetting.run(key, value);
  }
}
