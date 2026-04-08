import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { waiver_id, booking_id, customer_name, signature_data, ip_address } = body;

    if (!waiver_id || !booking_id || !customer_name || !signature_data) {
      return NextResponse.json(
        { error: "waiver_id, booking_id, customer_name, and signature_data are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify waiver exists
    const waiver = db.prepare("SELECT * FROM waivers WHERE id = ?").get(waiver_id);
    if (!waiver) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    // Verify booking exists
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking_id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if already signed
    const existing = db.prepare(
      "SELECT id FROM waiver_signatures WHERE waiver_id = ? AND booking_id = ?"
    ).get(waiver_id, booking_id);

    if (existing) {
      return NextResponse.json({ error: "Waiver already signed for this booking" }, { status: 409 });
    }

    const result = db.prepare(
      `INSERT INTO waiver_signatures (waiver_id, booking_id, customer_name, signature_data, ip_address)
       VALUES (?, ?, ?, ?, ?)`
    ).run(waiver_id, booking_id, customer_name, signature_data, ip_address || "");

    const signature = db.prepare("SELECT * FROM waiver_signatures WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(signature, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to sign waiver: " + (error as Error).message },
      { status: 500 }
    );
  }
}
