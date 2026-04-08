import { getDb } from "./db";
import crypto from "crypto";

interface GiftCard {
  id: number;
  code: string;
  initial_amount: number;
  balance: number;
  status: string;
  expires_at: string | null;
}

export function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function validateGiftCard(code: string): {
  valid: boolean;
  gift_card?: GiftCard;
  error?: string;
} {
  const db = getDb();

  const gc = db
    .prepare("SELECT * FROM gift_cards WHERE code = ? COLLATE NOCASE")
    .get(code) as GiftCard | undefined;

  if (!gc) {
    return { valid: false, error: "Gift card not found" };
  }

  if (gc.status !== "active") {
    return { valid: false, error: "Gift card is not active" };
  }

  if (gc.expires_at) {
    const now = new Date().toISOString();
    if (now > gc.expires_at) {
      return { valid: false, error: "Gift card has expired" };
    }
  }

  if (gc.balance <= 0) {
    return { valid: false, error: "Gift card has no remaining balance" };
  }

  return { valid: true, gift_card: gc };
}

export function redeemGiftCard(
  code: string,
  amount: number,
  bookingId: number
): { success: boolean; remaining_balance?: number; error?: string } {
  const db = getDb();

  const validation = validateGiftCard(code);
  if (!validation.valid || !validation.gift_card) {
    return { success: false, error: validation.error };
  }

  const gc = validation.gift_card;

  if (amount > gc.balance) {
    return { success: false, error: `Insufficient balance. Available: $${gc.balance.toFixed(2)}` };
  }

  const newBalance = Math.round((gc.balance - amount) * 100) / 100;

  db.prepare("UPDATE gift_cards SET balance = ? WHERE id = ?").run(newBalance, gc.id);

  db.prepare(
    `INSERT INTO gift_card_transactions (gift_card_id, booking_id, amount, type)
     VALUES (?, ?, ?, 'redemption')`
  ).run(gc.id, bookingId, -amount);

  return { success: true, remaining_balance: newBalance };
}
