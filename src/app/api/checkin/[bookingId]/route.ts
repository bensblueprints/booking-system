import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId } = await params;
    const db = getDb();

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    db.prepare(
      "UPDATE bookings SET checked_in = 1, checked_in_at = datetime('now') WHERE id = ?"
    ).run(bookingId);

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check in: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId } = await params;
    const db = getDb();

    db.prepare(
      "UPDATE bookings SET checked_in = 0, checked_in_at = NULL WHERE id = ?"
    ).run(bookingId);

    const updated = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to undo check-in: " + (error as Error).message },
      { status: 500 }
    );
  }
}
