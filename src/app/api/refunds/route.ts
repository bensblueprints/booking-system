import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import Stripe from "stripe";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const booking_id = url.searchParams.get("booking_id");

    const db = getDb();
    let query = `
      SELECT r.*, b.customer_name, b.customer_email
      FROM refunds r
      JOIN bookings b ON r.booking_id = b.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (booking_id) {
      query += " AND r.booking_id = ?";
      params.push(booking_id);
    }

    query += " ORDER BY r.created_at DESC";

    const refunds = db.prepare(query).all(...params);
    return NextResponse.json(refunds);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch refunds: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { booking_id, amount, reason } = body;

    if (!booking_id || !amount) {
      return NextResponse.json(
        { error: "booking_id and amount are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking_id) as Record<string, unknown> | undefined;
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let refundProvider = "manual";
    let refundId: string | null = null;

    // If booking was paid via Stripe, attempt Stripe refund
    if (booking.payment_id && booking.payment_provider === "stripe") {
      const stripeKeyRow = db
        .prepare("SELECT value FROM settings WHERE key = 'stripe_secret_key'")
        .get() as { value: string } | undefined;

      if (stripeKeyRow?.value) {
        try {
          const stripe = new Stripe(stripeKeyRow.value);
          const refund = await stripe.refunds.create({
            payment_intent: String(booking.payment_id),
            amount: Math.round(amount * 100),
          });
          refundProvider = "stripe";
          refundId = refund.id;
        } catch (stripeError) {
          return NextResponse.json(
            { error: "Stripe refund failed: " + (stripeError as Error).message },
            { status: 500 }
          );
        }
      }
    }

    const result = db.prepare(
      `INSERT INTO refunds (booking_id, amount, reason, refund_provider, refund_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(booking_id, amount, reason || "", refundProvider, refundId, "admin");

    // Update booking refund_amount
    db.prepare(
      "UPDATE bookings SET refund_amount = refund_amount + ? WHERE id = ?"
    ).run(amount, booking_id);

    const refund = db.prepare("SELECT * FROM refunds WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(refund, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process refund: " + (error as Error).message },
      { status: 500 }
    );
  }
}
