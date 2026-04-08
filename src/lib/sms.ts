import twilio from "twilio";
import { getDb } from "./db";

function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value || "";
}

export async function sendSms(
  to: string,
  body: string,
  bookingId?: number,
  messageType: string = "general"
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = getSetting("twilio_account_sid");
  const authToken = getSetting("twilio_auth_token");
  const fromNumber = getSetting("twilio_phone_number");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    // Log to sms_log
    const db = getDb();
    db.prepare(
      `INSERT INTO sms_log (booking_id, phone_number, message_type, twilio_sid, status)
       VALUES (?, ?, ?, ?, 'sent')`
    ).run(bookingId || null, to, messageType, message.sid);

    return { success: true, sid: message.sid };
  } catch (err) {
    // Log the failure
    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO sms_log (booking_id, phone_number, message_type, twilio_sid, status)
         VALUES (?, ?, ?, NULL, 'failed')`
      ).run(bookingId || null, to, messageType);
    } catch {
      // ignore logging failure
    }
    return { success: false, error: (err as Error).message };
  }
}

export async function sendBookingSms(
  bookingId: number,
  messageType: "confirmation" | "reminder" | "cancellation"
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  const booking = db.prepare(
    `SELECT b.*, s.date, s.start_time, s.end_time,
            p.name as product_name
     FROM bookings b
     JOIN slots s ON b.slot_id = s.id
     JOIN products p ON b.product_id = p.id
     WHERE b.id = ?`
  ).get(bookingId) as Record<string, unknown> | undefined;

  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  const phone = String(booking.customer_phone || "");
  if (!phone) {
    return { success: false, error: "No phone number on booking" };
  }

  const businessName = getSetting("business_name") || "Our Business";
  const name = String(booking.customer_name);
  const product = String(booking.product_name);
  const date = String(booking.date);
  const time = String(booking.start_time);

  let body = "";
  switch (messageType) {
    case "confirmation":
      body = `Hi ${name}! Your booking for ${product} on ${date} at ${time} is confirmed. Party size: ${booking.party_size}. Total: $${Number(booking.total_amount).toFixed(2)}. - ${businessName}`;
      break;
    case "reminder":
      body = `Reminder: ${name}, your ${product} booking is on ${date} at ${time}. See you there! - ${businessName}`;
      break;
    case "cancellation":
      body = `Hi ${name}, your booking for ${product} on ${date} at ${time} has been cancelled. Contact us with any questions. - ${businessName}`;
      break;
  }

  return sendSms(phone, body, bookingId, messageType);
}
