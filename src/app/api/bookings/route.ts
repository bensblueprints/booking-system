import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { validatePromoCode, applyPromoCode } from "@/lib/promo";
import { sendBookingEmail } from "@/lib/email";
import { sendBookingSms } from "@/lib/sms";
import crypto from "crypto";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const date_from = url.searchParams.get("date_from");
    const date_to = url.searchParams.get("date_to");
    const payment_status = url.searchParams.get("payment_status");

    const db = getDb();
    let query = `
      SELECT b.*, s.date, s.start_time, s.end_time,
             p.name as product_name, p.price as product_price
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN products p ON b.product_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (product_id) {
      query += " AND b.product_id = ?";
      params.push(product_id);
    }
    if (date_from) {
      query += " AND s.date >= ?";
      params.push(date_from);
    }
    if (date_to) {
      query += " AND s.date <= ?";
      params.push(date_to);
    }
    if (payment_status) {
      query += " AND b.payment_status = ?";
      params.push(payment_status);
    }

    query += " ORDER BY s.date DESC, s.start_time DESC";

    const bookings = db.prepare(query).all(...params);
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch bookings: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      slot_id, customer_name, customer_email, customer_phone,
      party_size, notes, promo_code, addons,
    } = body;

    if (!slot_id || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: "slot_id, customer_name, and customer_email are required" },
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
      date: string;
      start_time: string;
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
      .get(slot.product_id) as {
      price: number;
      deposit_percent: number;
      cutoff_hours: number;
      min_participants: number;
    };

    // Check minimum participants
    if (size < (product.min_participants || 1)) {
      return NextResponse.json(
        { error: `Minimum ${product.min_participants} participant(s) required` },
        { status: 400 }
      );
    }

    // Check cutoff hours
    if (product.cutoff_hours > 0) {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
      const cutoffTime = new Date(Date.now() + product.cutoff_hours * 60 * 60 * 1000);
      if (slotDateTime < cutoffTime) {
        return NextResponse.json(
          { error: `Bookings must be made at least ${product.cutoff_hours} hour(s) in advance` },
          { status: 400 }
        );
      }
    }

    // Check blackout dates
    const blackout = db
      .prepare(
        "SELECT id FROM blackout_dates WHERE date = ? AND (product_id = ? OR product_id IS NULL)"
      )
      .get(slot.date, slot.product_id);

    if (blackout) {
      return NextResponse.json(
        { error: "This date is unavailable for booking" },
        { status: 400 }
      );
    }

    // Calculate base total
    let total_amount = product.price * size;
    let discount_amount = 0;
    let promo_code_id: number | null = null;

    // Validate promo code if provided
    if (promo_code) {
      const promoResult = validatePromoCode(promo_code, slot.product_id, total_amount);
      if (!promoResult.valid) {
        return NextResponse.json(
          { error: promoResult.error },
          { status: 400 }
        );
      }
      discount_amount = promoResult.discount_amount || 0;
      promo_code_id = promoResult.promo!.id;
    }

    // Calculate addon totals
    let addons_total = 0;
    const addonItems: { addon_id: number; quantity: number; unit_price: number; total_price: number }[] = [];

    if (addons && Array.isArray(addons) && addons.length > 0) {
      for (const item of addons) {
        const addon = db
          .prepare("SELECT * FROM addons WHERE id = ? AND active = 1")
          .get(item.addon_id) as {
          id: number;
          price: number;
          max_quantity: number;
          per_person: number;
          product_id: number | null;
        } | undefined;

        if (!addon) {
          return NextResponse.json(
            { error: `Addon ${item.addon_id} not found or inactive` },
            { status: 400 }
          );
        }

        // Check product restriction
        if (addon.product_id !== null && addon.product_id !== slot.product_id) {
          return NextResponse.json(
            { error: `Addon ${item.addon_id} is not available for this product` },
            { status: 400 }
          );
        }

        const quantity = item.quantity || 1;
        if (quantity > addon.max_quantity) {
          return NextResponse.json(
            { error: `Maximum quantity for addon is ${addon.max_quantity}` },
            { status: 400 }
          );
        }

        const multiplier = addon.per_person ? size : 1;
        const unit_price = addon.price;
        const total_price = unit_price * quantity * multiplier;
        addons_total += total_price;

        addonItems.push({ addon_id: addon.id, quantity: quantity * multiplier, unit_price, total_price });
      }
    }

    // Phase 2: Apply quantity discounts
    let quantityDiscount = 0;
    const qDiscounts = db.prepare(
      `SELECT * FROM quantity_discounts
       WHERE product_id = ? AND min_quantity <= ? AND active = 1
       ORDER BY min_quantity DESC`
    ).all(slot.product_id, size) as {
      discount_type: string;
      discount_value: number;
      min_quantity: number;
    }[];

    if (qDiscounts.length > 0) {
      // Find the best discount (highest value)
      let bestDiscount = 0;
      for (const qd of qDiscounts) {
        let discVal = 0;
        if (qd.discount_type === "percent") {
          discVal = (product.price * size) * (qd.discount_value / 100);
        } else if (qd.discount_type === "fixed_per_person") {
          discVal = qd.discount_value * size;
        }
        if (discVal > bestDiscount) {
          bestDiscount = discVal;
        }
      }
      quantityDiscount = bestDiscount;
    }

    // Final totals
    discount_amount += quantityDiscount;
    total_amount = total_amount + addons_total - discount_amount;
    if (total_amount < 0) total_amount = 0;

    const deposit_amount = total_amount * (product.deposit_percent / 100);
    const manage_token = crypto.randomUUID();

    const insertBooking = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO bookings (slot_id, product_id, customer_name, customer_email, customer_phone, party_size, total_amount, deposit_amount, notes, promo_code_id, discount_amount, addons_total, manage_token, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
        )
        .run(
          slot_id,
          slot.product_id,
          customer_name,
          customer_email,
          customer_phone || null,
          size,
          total_amount,
          deposit_amount,
          notes || null,
          promo_code_id,
          discount_amount,
          addons_total,
          manage_token
        );

      const bookingId = result.lastInsertRowid as number;

      // Insert booking addons
      const insertAddon = db.prepare(
        "INSERT INTO booking_addons (booking_id, addon_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)"
      );
      for (const item of addonItems) {
        insertAddon.run(bookingId, item.addon_id, item.quantity, item.unit_price, item.total_price);
      }

      // Update slot seats
      db.prepare("UPDATE slots SET booked_seats = booked_seats + ? WHERE id = ?").run(size, slot_id);

      // Apply promo code usage
      if (promo_code_id) {
        applyPromoCode(promo_code_id);
      }

      // Phase 2: Upsert customer record
      db.prepare(
        `INSERT INTO customers (email, name, phone, total_bookings, total_spent, first_booking, last_booking)
         VALUES (?, ?, ?, 1, ?, datetime('now'), datetime('now'))
         ON CONFLICT(email) DO UPDATE SET
           name = excluded.name,
           phone = CASE WHEN excluded.phone != '' THEN excluded.phone ELSE customers.phone END,
           total_bookings = customers.total_bookings + 1,
           total_spent = customers.total_spent + excluded.total_spent,
           last_booking = datetime('now'),
           updated_at = datetime('now')`
      ).run(customer_email, customer_name, customer_phone || "", total_amount);

      // Get customer id and set on booking
      const customer = db.prepare("SELECT id FROM customers WHERE email = ?").get(customer_email) as { id: number } | undefined;
      if (customer) {
        db.prepare("UPDATE bookings SET customer_id = ? WHERE id = ?").run(customer.id, bookingId);
      }

      return bookingId;
    });

    const bookingId = insertBooking();

    const booking = db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .get(bookingId);

    // Try to send confirmation email (non-blocking)
    try {
      await sendBookingEmail(bookingId as number, "confirmation");
    } catch {
      // Don't fail the booking if email fails
    }

    // Phase 2: Send SMS confirmation if enabled
    try {
      const smsEnabled = db.prepare("SELECT value FROM settings WHERE key = 'sms_confirmation_enabled'").get() as { value: string } | undefined;
      if (smsEnabled?.value === "1" && customer_phone) {
        await sendBookingSms(bookingId as number, "confirmation");
      }
    } catch {
      // Don't fail the booking if SMS fails
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create booking: " + (error as Error).message },
      { status: 500 }
    );
  }
}
