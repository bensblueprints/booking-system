import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendBookingEmail } from "@/lib/email";

export async function POST(request: Request) {
  // Check for internal/cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // Check if reminders are enabled
    const reminderEnabled = db
      .prepare("SELECT value FROM settings WHERE key = 'reminder_enabled'")
      .get() as { value: string } | undefined;

    if (!reminderEnabled || reminderEnabled.value !== "1") {
      return NextResponse.json({ message: "Reminders are disabled", sent: 0 });
    }

    const reminderHoursRow = db
      .prepare("SELECT value FROM settings WHERE key = 'reminder_hours'")
      .get() as { value: string } | undefined;

    const reminderHours = parseInt(reminderHoursRow?.value || "24", 10);

    // Find bookings with slots starting within the reminder window (hours - 1 to hours + 1)
    // that haven't already received a reminder
    const now = new Date();
    const minTime = new Date(now.getTime() + (reminderHours - 1) * 60 * 60 * 1000);
    const maxTime = new Date(now.getTime() + (reminderHours + 1) * 60 * 60 * 1000);

    const minDate = minTime.toISOString().slice(0, 10);
    const maxDate = maxTime.toISOString().slice(0, 10);
    const minTimeStr = minTime.toISOString().slice(11, 16);
    const maxTimeStr = maxTime.toISOString().slice(11, 16);

    // Get bookings in the reminder window
    const bookings = db
      .prepare(
        `SELECT b.id, b.customer_email, s.date, s.start_time
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         WHERE b.status = 'confirmed'
           AND b.payment_status != 'failed'
           AND (
             (s.date = ? AND s.start_time >= ?) OR
             (s.date = ? AND s.start_time <= ?) OR
             (s.date > ? AND s.date < ?)
           )
           AND b.id NOT IN (
             SELECT booking_id FROM email_log
             WHERE template_type = 'reminder_24h'
             AND status = 'sent'
             AND booking_id IS NOT NULL
           )`
      )
      .all(minDate, minTimeStr, maxDate, maxTimeStr, minDate, maxDate) as {
      id: number;
      customer_email: string;
      date: string;
      start_time: string;
    }[];

    let sentCount = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      try {
        const result = await sendBookingEmail(booking.id, "reminder_24h");
        if (result.success) {
          sentCount++;
        } else {
          errors.push(`Booking ${booking.id}: ${result.error}`);
        }
      } catch (err) {
        errors.push(`Booking ${booking.id}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${bookings.length} bookings, sent ${sentCount} reminders`,
      sent: sentCount,
      total: bookings.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process reminders: " + (error as Error).message },
      { status: 500 }
    );
  }
}
