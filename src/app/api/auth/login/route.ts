import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const admin = db
      .prepare("SELECT * FROM admins WHERE username = ?")
      .get(username) as { id: number; username: string; password_hash: string } | undefined;

    if (!admin || !comparePassword(password, admin.password_hash)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({ id: admin.id, username: admin.username });

    return NextResponse.json({ token, username: admin.username });
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed: " + (error as Error).message },
      { status: 500 }
    );
  }
}
