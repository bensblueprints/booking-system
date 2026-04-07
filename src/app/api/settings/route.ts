import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getDb();

    const upsert = db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );

    const updateMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        upsert.run(key, String(value));
      }
    });

    updateMany(Object.entries(body));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings: " + (error as Error).message },
      { status: 500 }
    );
  }
}
