import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const slot = db
      .prepare(
        `SELECT s.*, p.name as product_name, p.price as product_price,
                p.deposit_percent, p.color as product_color,
                (SELECT COUNT(*) FROM bookings WHERE slot_id = s.id AND payment_status != cancelled) as booking_count
         FROM slots s
         JOIN products p ON s.product_id = p.id
         WHERE s.id = ?`
      )
      .get(id);

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slot: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { date, start_time, end_time, total_seats } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM slots WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE slots SET
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        total_seats = COALESCE(?, total_seats)
      WHERE id = ?`
    ).run(
      date ?? null,
      start_time ?? null,
      end_time ?? null,
      total_seats ?? null,
      id
    );

    const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(id);
    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update slot: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = getDb();

    const bookingCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM bookings WHERE slot_id = ? AND payment_status != cancelled"
      )
      .get(id) as { count: number };

    if (bookingCount.count > 0) {
      return NextResponse.json(
        { error: "Cannot delete slot with active bookings" },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM slots WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete slot: " + (error as Error).message },
      { status: 500 }
    );
  }
}
