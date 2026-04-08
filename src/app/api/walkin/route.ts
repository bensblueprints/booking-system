import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { product_id, slot_id, customer_name, customer_phone, party_size, payment_method, amount_paid } = body;

    if (!product_id || !slot_id || !customer_name) {
      return NextResponse.json(
        { error: "product_id, slot_id, and customer_name are required" },
        { status: 400 }
      );
    }

    const size = party_size || 1;
    const db = getDb();

    const slot = db
      .prepare("SELECT * FROM slots WHERE id = ?")
      .get(slot_id) as {
      id: number;
      product_id: number;
      total_seats: number;
      booked_seats: number;
    } | undefined;

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const available = slot.total_seats - slot.booked_seats;
    if (size > available) {
      return NextResponse.json(
        { error: `Only ${available} seat(s) available` },
        { status: 400 }
      );
    }

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(product_id) as { price: number; deposit_percent: number } | undefined;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const total_amount = amount_paid || product.price * size;
    const manage_token = crypto.randomUUID();

    const result = db
      .prepare(
        `INSERT INTO bookings (slot_id, product_id, customer_name, customer_email, customer_phone, party_size, total_amount, deposit_amount, payment_status, manage_token, status, source)
         VALUES (?, ?, ?, '', ?, ?, ?, ?, 'paid', ?, 'confirmed', 'walkin')`
      )
      .run(
        slot_id,
        product_id,
        customer_name,
        customer_phone || null,
        size,
        total_amount,
        total_amount,
        manage_token
      );

    db.prepare("UPDATE slots SET booked_seats = booked_seats + ? WHERE id = ?").run(size, slot_id);

    const booking = db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create walk-in booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}
