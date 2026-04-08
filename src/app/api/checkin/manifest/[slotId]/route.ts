import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slotId } = await params;
    const db = getDb();

    const slot = db.prepare(
      `SELECT s.*, p.name as product_name
       FROM slots s
       JOIN products p ON s.product_id = p.id
       WHERE s.id = ?`
    ).get(slotId) as Record<string, unknown> | undefined;

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const bookings = db.prepare(
      `SELECT b.id, b.customer_name, b.customer_email, b.customer_phone,
              b.party_size, b.checked_in, b.checked_in_at, b.status,
              b.notes, b.total_amount, b.payment_status
       FROM bookings b
       WHERE b.slot_id = ? AND b.status != 'cancelled'
       ORDER BY b.customer_name ASC`
    ).all(slotId) as Record<string, unknown>[];

    const totalGuests = bookings.reduce((sum, b) => sum + (b.party_size as number), 0);
    const checkedInCount = bookings.filter(b => b.checked_in === 1).length;
    const checkedInGuests = bookings
      .filter(b => b.checked_in === 1)
      .reduce((sum, b) => sum + (b.party_size as number), 0);

    return NextResponse.json({
      slot,
      bookings,
      totals: {
        total_bookings: bookings.length,
        total_guests: totalGuests,
        checked_in_bookings: checkedInCount,
        checked_in_guests: checkedInGuests,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch manifest: " + (error as Error).message },
      { status: 500 }
    );
  }
}
