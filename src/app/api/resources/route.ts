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
    const type = url.searchParams.get("type");
    const db = getDb();

    let query = "SELECT * FROM resources WHERE active = 1";
    const params: string[] = [];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }
    query += " ORDER BY name ASC";

    const resources = db.prepare(query).all(...params);
    return NextResponse.json(resources);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch resources: " + (error as Error).message },
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
    const { name, type, capacity, notes } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "name and type are required" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO resources (name, type, capacity, notes)
       VALUES (?, ?, ?, ?)`
    ).run(name, type, capacity ?? null, notes || "");

    const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create resource: " + (error as Error).message },
      { status: 500 }
    );
  }
}
