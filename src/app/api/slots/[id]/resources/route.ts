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

    const resources = db.prepare(
      `SELECT r.*, sr.id as assignment_id
       FROM slot_resources sr
       JOIN resources r ON sr.resource_id = r.id
       WHERE sr.slot_id = ?`
    ).all(id);

    return NextResponse.json(resources);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slot resources: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { resource_id } = body;

    if (!resource_id) {
      return NextResponse.json({ error: "resource_id is required" }, { status: 400 });
    }

    const db = getDb();

    // Verify slot and resource exist
    const slot = db.prepare("SELECT id FROM slots WHERE id = ?").get(id);
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const resource = db.prepare("SELECT id FROM resources WHERE id = ? AND active = 1").get(resource_id);
    if (!resource) {
      return NextResponse.json({ error: "Resource not found or inactive" }, { status: 404 });
    }

    try {
      db.prepare(
        "INSERT INTO slot_resources (slot_id, resource_id) VALUES (?, ?)"
      ).run(id, resource_id);
    } catch (err) {
      if ((err as Error).message.includes("UNIQUE")) {
        return NextResponse.json({ error: "Resource already assigned to this slot" }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to assign resource: " + (error as Error).message },
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
    const body = await request.json();
    const { resource_id } = body;

    if (!resource_id) {
      return NextResponse.json({ error: "resource_id is required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      "DELETE FROM slot_resources WHERE slot_id = ? AND resource_id = ?"
    ).run(id, resource_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove resource: " + (error as Error).message },
      { status: 500 }
    );
  }
}
