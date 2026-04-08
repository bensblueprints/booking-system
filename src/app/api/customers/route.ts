import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort") || "created_at";
    const order = url.searchParams.get("order") === "asc" ? "ASC" : "DESC";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const db = getDb();
    const allowedSorts = ["total_bookings", "total_spent", "last_booking", "created_at", "name", "email"];
    const sortCol = allowedSorts.includes(sort) ? sort : "created_at";

    let query = "SELECT * FROM customers WHERE 1=1";
    const params: (string | number)[] = [];

    if (search) {
      query += " AND (name LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const customers = db.prepare(query).all(...params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM customers WHERE 1=1";
    const countParams: string[] = [];
    if (search) {
      countQuery += " AND (name LIKE ? OR email LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    return NextResponse.json({ customers, total });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customers: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, name, phone, notes, tags } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "email and name are required" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO customers (email, name, phone, notes, tags)
       VALUES (?, ?, ?, ?, ?)`
    ).run(email, name, phone || "", notes || "", tags || "");

    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if ((error as Error).message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Customer with this email already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create customer: " + (error as Error).message },
      { status: 500 }
    );
  }
}
