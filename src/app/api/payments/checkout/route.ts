import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { booking_id } = await request.json();

    if (!booking_id) {
      return NextResponse.json(
        { error: "booking_id is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get Stripe keys from settings
    const stripeSecret = db
      .prepare("SELECT value FROM settings WHERE key = stripe_secret_key")
      .get() as { value: string } | undefined;

    if (!stripeSecret || !stripeSecret.value) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please add your Stripe secret key in settings." },
        { status: 400 }
      );
    }

    const booking = db
      .prepare(
        `SELECT b.*, p.name as product_name, s.date, s.start_time
         FROM bookings b
         JOIN products p ON b.product_id = p.id
         JOIN slots s ON b.slot_id = s.id
         WHERE b.id = ?`
      )
      .get(booking_id) as {
      id: number;
      deposit_amount: number;
      customer_email: string;
      product_name: string;
      date: string;
      start_time: string;
      party_size: number;
    } | undefined;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Dynamic import so it doesnt crash if keys arent set
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecret.value);

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: booking.customer_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.product_name} - Deposit`,
              description: `${booking.date} at ${booking.start_time} (${booking.party_size} person${booking.party_size > 1 ? "s" : ""})`,
            },
            unit_amount: Math.round(booking.deposit_amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/book/confirmation?booking_id=${booking.id}&status=success`,
      cancel_url: `${origin}/book/confirmation?booking_id=${booking.id}&status=cancelled`,
      metadata: {
        booking_id: booking.id.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create checkout session: " + (error as Error).message },
      { status: 500 }
    );
  }
}
