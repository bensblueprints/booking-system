import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const db = getDb();

    let query = "SELECT * FROM custom_fields WHERE active = 1";
    const params: (string | number)[] = [];

    if (product_id) {
      query += " AND (product_id = ? OR product_id IS NULL)";
      params.push(product_id);
    }

    query += " ORDER BY sort_order ASC";

    const fields = db.prepare(query).all(...params);
    return NextResponse.json(fields);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch custom fields: " + (error as Error).message },
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
    const { product_id, label, field_type, options_json, required, sort_order } = body;

    if (!label || !field_type) {
      return NextResponse.json({ error: "label and field_type are required" }, { status: 400 });
    }

    const db = getDb();
    const optStr = options_json
      ? typeof options_json === "string"
        ? options_json
        : JSON.stringify(options_json)
      : null;

    const result = db
      .prepare(
        `INSERT INTO custom_fields (product_id, label, field_type, options_json, required, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(product_id || null, label, field_type, optStr, required || 0, sort_order || 0);

    const field = db
      .prepare("SELECT * FROM custom_fields WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create custom field: " + (error as Error).message },
      { status: 500 }
    );
  }
}
