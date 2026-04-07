import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { booking_id } = await request.json();

    if (!booking_id) {
      return NextResponse.json(
        { error: "booking_id is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const calendarId = db
      .prepare("SELECT value FROM settings WHERE key = google_calendar_id")
      .get() as { value: string } | undefined;

    const serviceAccountJson = db
      .prepare("SELECT value FROM settings WHERE key = google_service_account_json")
      .get() as { value: string } | undefined;

    if (!calendarId?.value || !serviceAccountJson?.value) {
      return NextResponse.json(
        {
          error:
            "Google Calendar is not configured. Please add your Google Calendar ID and Service Account JSON in settings.",
        },
        { status: 400 }
      );
    }

    const booking = db
      .prepare(
        `SELECT b.*, s.date, s.start_time, s.end_time, s.id as slot_id,
                p.name as product_name
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         JOIN products p ON b.product_id = p.id
         WHERE b.id = ?`
      )
      .get(booking_id) as {
      id: number;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      party_size: number;
      product_name: string;
      date: string;
      start_time: string;
      end_time: string;
      slot_id: number;
      notes: string;
    } | undefined;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson.value);
    } catch {
      return NextResponse.json(
        { error: "Invalid service account JSON in settings" },
        { status: 400 }
      );
    }

    const { google } = await import("googleapis");
    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const startDateTime = `${booking.date}T${booking.start_time}:00`;
    const endDateTime = `${booking.date}T${booking.end_time}:00`;

    const event = await calendar.events.insert({
      calendarId: calendarId.value,
      requestBody: {
        summary: `${booking.product_name} - ${booking.customer_name} (${booking.party_size})`,
        description: [
          `Customer: ${booking.customer_name}`,
          `Email: ${booking.customer_email}`,
          booking.customer_phone ? `Phone: ${booking.customer_phone}` : null,
          `Party Size: ${booking.party_size}`,
          booking.notes ? `Notes: ${booking.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startDateTime, timeZone: "America/New_York" },
        end: { dateTime: endDateTime, timeZone: "America/New_York" },
      },
    });

    // Save google_event_id on the slot
    if (event.data.id) {
      db.prepare("UPDATE slots SET google_event_id = ? WHERE id = ?").run(
        event.data.id,
        booking.slot_id
      );
    }

    return NextResponse.json({
      success: true,
      event_id: event.data.id,
      event_link: event.data.htmlLink,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to sync to calendar: " + (error as Error).message },
      { status: 500 }
    );
  }
}
