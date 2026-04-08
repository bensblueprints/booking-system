import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const db = getDb();

    const booking = db.prepare(
      "SELECT * FROM bookings WHERE id = ?"
    ).get(bookingId) as Record<string, unknown> | undefined;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get all required waivers for this product
    const requiredWaivers = db.prepare(
      `SELECT * FROM waivers
       WHERE required = 1 AND active = 1
       AND (product_id = ? OR product_id IS NULL)`
    ).all(booking.product_id) as { id: number; name: string }[];

    // Get signed waiver ids for this booking
    const signed = db.prepare(
      "SELECT waiver_id FROM waiver_signatures WHERE booking_id = ?"
    ).all(bookingId) as { waiver_id: number }[];

    const signedIds = new Set(signed.map(s => s.waiver_id));
    const missing = requiredWaivers.filter(w => !signedIds.has(w.id));

    return NextResponse.json({
      complete: missing.length === 0,
      missing,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check waivers: " + (error as Error).message },
      { status: 500 }
    );
  }
}
