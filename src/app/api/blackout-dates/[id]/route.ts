import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

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

    const existing = db.prepare("SELECT * FROM blackout_dates WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Blackout date not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM blackout_dates WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete blackout date: " + (error as Error).message },
      { status: 500 }
    );
  }
}
