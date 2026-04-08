import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = getAdminFromRequest(request);
    const url = new URL(request.url);
    const product_id = url.searchParams.get("product_id");
    const db = getDb();

    if (admin) {
      // Admin sees all
      let query = "SELECT * FROM waivers";
      const params: (string | number)[] = [];
      if (product_id) {
        query += " WHERE product_id = ? OR product_id IS NULL";
        params.push(product_id);
      }
      query += " ORDER BY created_at DESC";
      const waivers = db.prepare(query).all(...params);
      return NextResponse.json(waivers);
    } else {
      // Public: active only, filtered by product
      let query = "SELECT * FROM waivers WHERE active = 1";
      const params: (string | number)[] = [];
      if (product_id) {
        query += " AND (product_id = ? OR product_id IS NULL)";
        params.push(product_id);
      }
      query += " ORDER BY created_at DESC";
      const waivers = db.prepare(query).all(...params);
      return NextResponse.json(waivers);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch waivers: " + (error as Error).message },
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
    const { name, content_html, product_id, required } = body;

    if (!name || !content_html) {
      return NextResponse.json({ error: "name and content_html are required" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO waivers (name, content_html, product_id, required)
       VALUES (?, ?, ?, ?)`
    ).run(name, content_html, product_id ?? null, required ?? 1);

    const waiver = db.prepare("SELECT * FROM waivers WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(waiver, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create waiver: " + (error as Error).message },
      { status: 500 }
    );
  }
}
