import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const booking = db
      .prepare(
        `SELECT b.*, s.date, s.start_time, s.end_time,
                p.name as product_name, p.price as product_price
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         JOIN products p ON b.product_id = p.id
         WHERE b.id = ?`
      )
      .get(id);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}
