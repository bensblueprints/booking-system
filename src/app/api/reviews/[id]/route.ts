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
    const { approved } = body;

    if (approved === undefined) {
      return NextResponse.json({ error: "approved field is required" }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    db.prepare("UPDATE reviews SET approved = ? WHERE id = ?").run(approved ? 1 : 0, id);

    const review = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update review: " + (error as Error).message },
      { status: 500 }
    );
  }
}
