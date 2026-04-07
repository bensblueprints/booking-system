import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest, comparePassword, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const db = getDb();
    const adminRow = db
      .prepare("SELECT * FROM admins WHERE id = ?")
      .get(admin.id) as { id: number; password_hash: string } | undefined;

    if (!adminRow) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (!comparePassword(current_password, adminRow.password_hash)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = hashPassword(new_password);
    db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(
      newHash,
      admin.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to change password: " + (error as Error).message },
      { status: 500 }
    );
  }
}
