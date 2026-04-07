import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const db = getDb();

    const stripeSecret = db
      .prepare("SELECT value FROM settings WHERE key = stripe_secret_key")
      .get() as { value: string } | undefined;

    if (!stripeSecret || !stripeSecret.value) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret.value);

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event;

    // If webhook secret is configured, verify signature
    const webhookSecret = db
      .prepare("SELECT value FROM settings WHERE key = stripe_webhook_secret")
      .get() as { value: string } | undefined;

    if (webhookSecret?.value && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret.value);
      } catch {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id;

      if (bookingId) {
        db.prepare(
          "UPDATE bookings SET payment_status = deposit_paid, payment_provider = stripe, payment_id = ? WHERE id = ?"
        ).run(session.payment_intent || session.id, bookingId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook error: " + (error as Error).message },
      { status: 500 }
    );
  }
}
