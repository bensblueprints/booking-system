import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { new_slot_id, new_party_size, manage_token } = body;

    const db = getDb();

    // Auth: admin or manage_token
    const admin = getAdminFromRequest(request);
    if (!admin) {
      if (!manage_token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const booking = db.prepare(
        "SELECT * FROM bookings WHERE id = ? AND manage_token = ?"
      ).get(id, manage_token);
      if (!booking) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const booking = db.prepare(
      `SELECT b.*, p.price as product_price, p.deposit_percent
       FROM bookings b
       JOIN products p ON b.product_id = p.id
       WHERE b.id = ?`
    ).get(id) as Record<string, unknown> | undefined;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Cannot modify a cancelled booking" }, { status: 400 });
    }

    const oldSlotId = booking.slot_id as number;
    const oldPartySize = booking.party_size as number;
    const targetSlotId = new_slot_id || oldSlotId;
    const targetPartySize = new_party_size || oldPartySize;

    // If changing slot, validate new slot availability
    if (new_slot_id && new_slot_id !== oldSlotId) {
      const newSlot = db.prepare("SELECT * FROM slots WHERE id = ?").get(new_slot_id) as Record<string, unknown> | undefined;
      if (!newSlot) {
        return NextResponse.json({ error: "New slot not found" }, { status: 404 });
      }

      const available = (newSlot.total_seats as number) - (newSlot.booked_seats as number);
      if (targetPartySize > available) {
        return NextResponse.json(
          { error: `Only ${available} seat(s) available in the new slot` },
          { status: 400 }
        );
      }
    } else if (new_party_size && new_party_size !== oldPartySize) {
      // Same slot, check capacity for the difference
      const slot = db.prepare("SELECT * FROM slots WHERE id = ?").get(oldSlotId) as Record<string, unknown>;
      const available = (slot.total_seats as number) - (slot.booked_seats as number) + oldPartySize;
      if (targetPartySize > available) {
        return NextResponse.json(
          { error: `Only ${available} seat(s) available` },
          { status: 400 }
        );
      }
    }

    const modify = db.transaction(() => {
      // Handle slot change
      if (new_slot_id && new_slot_id !== oldSlotId) {
        // Remove from old slot
        db.prepare("UPDATE slots SET booked_seats = booked_seats - ? WHERE id = ?").run(oldPartySize, oldSlotId);
        // Add to new slot
        db.prepare("UPDATE slots SET booked_seats = booked_seats + ? WHERE id = ?").run(targetPartySize, new_slot_id);
        db.prepare("UPDATE bookings SET slot_id = ? WHERE id = ?").run(new_slot_id, id);
      } else if (new_party_size && new_party_size !== oldPartySize) {
        // Same slot, adjust seats
        const diff = targetPartySize - oldPartySize;
        db.prepare("UPDATE slots SET booked_seats = booked_seats + ? WHERE id = ?").run(diff, oldSlotId);
      }

      // Recalculate pricing if party size changed
      if (new_party_size && new_party_size !== oldPartySize) {
        const productPrice = booking.product_price as number;
        const depositPercent = booking.deposit_percent as number;

        // Recalculate base total (keeping addons and discounts proportional)
        const newBaseTotal = productPrice * targetPartySize;
        const addonsTotal = booking.addons_total as number || 0;
        const discountAmount = booking.discount_amount as number || 0;
        const newTotal = Math.max(0, newBaseTotal + addonsTotal - discountAmount);
        const newDeposit = newTotal * (depositPercent / 100);

        db.prepare(
          `UPDATE bookings SET party_size = ?, total_amount = ?, deposit_amount = ? WHERE id = ?`
        ).run(targetPartySize, newTotal, newDeposit, id);
      }
    });

    modify();

    const updated = db.prepare(
      `SELECT b.*, s.date, s.start_time, s.end_time, p.name as product_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN products p ON b.product_id = p.id
       WHERE b.id = ?`
    ).get(id);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to modify booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}
