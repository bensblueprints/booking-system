import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

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
    const { name, type, capacity, notes, active } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE resources SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        capacity = COALESCE(?, capacity),
        notes = COALESCE(?, notes),
        active = COALESCE(?, active)
      WHERE id = ?`
    ).run(
      name ?? null,
      type ?? null,
      capacity !== undefined ? capacity : null,
      notes ?? null,
      active ?? null,
      id
    );

    const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
    return NextResponse.json(resource);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update resource: " + (error as Error).message },
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

    db.prepare("UPDATE resources SET active = 0 WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to deactivate resource: " + (error as Error).message },
      { status: 500 }
    );
  }
}
