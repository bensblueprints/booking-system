import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendBookingEmail, sendEmail } from "@/lib/email";
import { fireWebhookEvent } from "@/lib/webhooks";
import { calculateRefund } from "@/lib/cancellation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = getDb();

    const booking = db
      .prepare(
        `SELECT b.*, s.date, s.start_time, s.end_time, s.total_seats, s.booked_seats,
                p.name as product_name, p.price as product_price, p.deposit_percent,
                p.duration_minutes
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         JOIN products p ON b.product_id = p.id
         WHERE b.manage_token = ?`
      )
      .get(token) as Record<string, unknown> | undefined;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Also get addons for this booking
    const addons = db
      .prepare(
        `SELECT ba.*, a.name as addon_name, a.description as addon_description
         FROM booking_addons ba
         JOIN addons a ON ba.addon_id = a.id
         WHERE ba.booking_id = ?`
      )
      .all(booking.id);

    return NextResponse.json({ ...booking, addons });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action } = body;

    const db = getDb();

    const booking = db
      .prepare(
        `SELECT b.*, s.date, s.start_time, s.end_time, s.total_seats, s.booked_seats,
                p.cancellation_policy_id
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         JOIN products p ON b.product_id = p.id
         WHERE b.manage_token = ?`
      )
      .get(token) as Record<string, unknown> | undefined;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    }

    if (action === "cancel") {
      const cancelReason = body.reason || "";

      // Phase 3: Calculate refund using cancellation policy if available
      let refundInfo: { refund_amount: number; refund_percent: number; tier_description: string } | null = null;
      if (booking.cancellation_policy_id) {
        refundInfo = calculateRefund(
          booking.cancellation_policy_id as number,
          booking.date as string,
          booking.total_amount as number
        );
      }

      db.prepare(
        `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?${refundInfo ? ", refund_amount = ?" : ""} WHERE id = ?`
      ).run(...(refundInfo ? [cancelReason, refundInfo.refund_amount, booking.id] : [cancelReason, booking.id]));

      // Restore slot seats
      db.prepare(
        "UPDATE slots SET booked_seats = booked_seats - ? WHERE id = ?"
      ).run(booking.party_size, booking.slot_id);

      // Try to send cancellation email
      try {
        await sendBookingEmail(booking.id as number, "cancellation");
      } catch {
        // Don't fail the cancellation if email fails
      }

      // Phase 3: Fire webhook for cancellation
      try {
        await fireWebhookEvent("booking.cancelled", {
          booking_id: booking.id,
          cancel_reason: cancelReason,
          refund: refundInfo || null,
        });
      } catch {
        // Don't fail if webhook fails
      }

      // Phase 2: Check waitlist for this slot and auto-notify first waiting entry
      try {
        const waitlistEntry = db.prepare(
          `SELECT w.*, s.date, s.start_time, p.name as product_name
           FROM waitlist w
           JOIN slots s ON w.slot_id = s.id
           JOIN products p ON s.product_id = p.id
           WHERE w.slot_id = ? AND w.status = 'waiting'
           ORDER BY w.created_at ASC
           LIMIT 1`
        ).get(booking.slot_id) as Record<string, unknown> | undefined;

        if (waitlistEntry) {
          const businessName = db.prepare("SELECT value FROM settings WHERE key = 'business_name'").get() as { value: string } | undefined;
          const bName = businessName?.value || "Our Business";

          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#1B6B8A;">A Spot Has Opened Up!</h2>
              <p>Hi ${waitlistEntry.customer_name},</p>
              <p>Great news! A spot has opened up for <strong>${waitlistEntry.product_name}</strong> on <strong>${waitlistEntry.date}</strong> at <strong>${waitlistEntry.start_time}</strong>.</p>
              <p>Please book soon as spots fill quickly!</p>
              <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
              <p style="color:#666;font-size:14px;">${bName}</p>
            </div>
          `;

          await sendEmail(
            String(waitlistEntry.customer_email),
            `A spot opened up for ${waitlistEntry.product_name}!`,
            html
          );

          db.prepare(
            "UPDATE waitlist SET status = 'notified', notified_at = datetime('now') WHERE id = ?"
          ).run(waitlistEntry.id);
        }
      } catch {
        // Don't fail if waitlist notification fails
      }

      const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking.id);
      return NextResponse.json({ ...(updated as Record<string, unknown>), refund: refundInfo || null });
    }

    if (action === "reschedule") {
      const { new_slot_id } = body;

      if (!new_slot_id) {
        return NextResponse.json({ error: "new_slot_id is required" }, { status: 400 });
      }

      const newSlot = db
        .prepare("SELECT * FROM slots WHERE id = ?")
        .get(new_slot_id) as Record<string, unknown> | undefined;

      if (!newSlot) {
        return NextResponse.json({ error: "New slot not found" }, { status: 404 });
      }

      const available = (newSlot.total_seats as number) - (newSlot.booked_seats as number);
      if ((booking.party_size as number) > available) {
        return NextResponse.json(
          { error: `Only ${available} seat(s) available in the new slot` },
          { status: 400 }
        );
      }

      // Update booking to new slot
      db.prepare("UPDATE bookings SET slot_id = ? WHERE id = ?").run(new_slot_id, booking.id);

      // Decrement old slot seats
      db.prepare(
        "UPDATE slots SET booked_seats = booked_seats - ? WHERE id = ?"
      ).run(booking.party_size, booking.slot_id);

      // Increment new slot seats
      db.prepare(
        "UPDATE slots SET booked_seats = booked_seats + ? WHERE id = ?"
      ).run(booking.party_size, new_slot_id);

      const updated = db
        .prepare(
          `SELECT b.*, s.date, s.start_time, s.end_time,
                  p.name as product_name
           FROM bookings b
           JOIN slots s ON b.slot_id = s.id
           JOIN products p ON b.product_id = p.id
           WHERE b.id = ?`
        )
        .get(booking.id);

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action. Use 'cancel' or 'reschedule'" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}
