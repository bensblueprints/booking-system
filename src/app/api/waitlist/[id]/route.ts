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
    const { status } = body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM waitlist WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
    }

    db.prepare("UPDATE waitlist SET status = ? WHERE id = ?").run(status, id);

    const entry = db.prepare("SELECT * FROM waitlist WHERE id = ?").get(id);
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update waitlist entry: " + (error as Error).message },
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

    db.prepare("DELETE FROM waitlist WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete waitlist entry: " + (error as Error).message },
      { status: 500 }
    );
  }
}
