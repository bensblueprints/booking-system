import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const month = url.searchParams.get("month"); // YYYY-MM

    if (!product_id || !month) {
      return NextResponse.json(
        { error: "product_id and month (YYYY-MM) are required" },
        { status: 400 }
      );
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    const date_from = `${month}-01`;
    // Calculate last day of month
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const date_to = `${month}-${String(lastDay).padStart(2, "0")}`;

    const db = getDb();
    const slots = db
      .prepare(
        `SELECT s.id, s.date, s.start_time, s.end_time,
                s.total_seats, s.booked_seats,
                (s.total_seats - s.booked_seats) as available_seats
         FROM slots s
         JOIN products p ON s.product_id = p.id
         WHERE s.product_id = ?
           AND s.date >= ?
           AND s.date <= ?
           AND p.active = 1
           AND s.booked_seats < s.total_seats
         ORDER BY s.date, s.start_time`
      )
      .all(product_id, date_from, date_to) as {
      id: number;
      date: string;
      start_time: string;
      end_time: string;
      total_seats: number;
      booked_seats: number;
      available_seats: number;
    }[];

    // Group by date
    const grouped: Record<
      string,
      {
        date: string;
        slots: {
          id: number;
          start_time: string;
          end_time: string;
          available_seats: number;
          total_seats: number;
        }[];
      }
    > = {};

    for (const slot of slots) {
      if (!grouped[slot.date]) {
        grouped[slot.date] = { date: slot.date, slots: [] };
      }
      grouped[slot.date].slots.push({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        available_seats: slot.available_seats,
        total_seats: slot.total_seats,
      });
    }

    const availability = Object.values(grouped);

    return NextResponse.json({
      product_id: Number(product_id),
      month,
      dates: availability,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch availability: " + (error as Error).message },
      { status: 500 }
    );
  }
}
