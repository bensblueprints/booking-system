import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { generateGiftCardCode } from "@/lib/gift-cards";

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const giftCards = db
      .prepare("SELECT * FROM gift_cards ORDER BY purchased_at DESC")
      .all();
    return NextResponse.json(giftCards);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch gift cards: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, purchaser_name, purchaser_email, recipient_name, recipient_email, message } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    const db = getDb();
    let code = generateGiftCardCode();

    // Ensure unique code
    let attempts = 0;
    while (attempts < 10) {
      const existing = db.prepare("SELECT id FROM gift_cards WHERE code = ?").get(code);
      if (!existing) break;
      code = generateGiftCardCode();
      attempts++;
    }

    const result = db
      .prepare(
        `INSERT INTO gift_cards (code, initial_amount, balance, purchaser_name, purchaser_email, recipient_name, recipient_email, message, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
      )
      .run(
        code,
        amount,
        amount,
        purchaser_name || "",
        purchaser_email || "",
        recipient_name || "",
        recipient_email || "",
        message || ""
      );

    const giftCard = db
      .prepare("SELECT * FROM gift_cards WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json(giftCard, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create gift card: " + (error as Error).message },
      { status: 500 }
    );
  }
}
