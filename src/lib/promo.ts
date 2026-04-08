import { getDb } from "./db";

interface PromoCode {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  product_id: number | null;
  start_date: string | null;
  end_date: string | null;
  active: number;
}

interface ValidateResult {
  valid: boolean;
  promo?: PromoCode;
  discount_amount?: number;
  error?: string;
}

export function validatePromoCode(
  code: string,
  productId: number | null,
  orderAmount: number
): ValidateResult {
  const db = getDb();

  const promo = db
    .prepare("SELECT * FROM promo_codes WHERE code = ? COLLATE NOCASE")
    .get(code) as PromoCode | undefined;

  if (!promo) {
    return { valid: false, error: "Promo code not found" };
  }

  if (!promo.active) {
    return { valid: false, error: "Promo code is not active" };
  }

  // Check date range
  const now = new Date().toISOString().slice(0, 10);
  if (promo.start_date && now < promo.start_date) {
    return { valid: false, error: "Promo code is not yet valid" };
  }
  if (promo.end_date && now > promo.end_date) {
    return { valid: false, error: "Promo code has expired" };
  }

  // Check max uses
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { valid: false, error: "Promo code has reached its usage limit" };
  }

  // Check product restriction
  if (promo.product_id !== null && productId !== null && promo.product_id !== productId) {
    return { valid: false, error: "Promo code is not valid for this product" };
  }

  // Check minimum order
  if (orderAmount < promo.min_order) {
    return { valid: false, error: `Minimum order of $${promo.min_order.toFixed(2)} required` };
  }

  // Calculate discount
  let discount_amount: number;
  if (promo.discount_type === "percent") {
    discount_amount = Math.round((orderAmount * promo.discount_value / 100) * 100) / 100;
  } else {
    discount_amount = Math.min(promo.discount_value, orderAmount);
  }

  return { valid: true, promo, discount_amount };
}

export function applyPromoCode(promoId: number): void {
  const db = getDb();
  db.prepare("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?").run(promoId);
}
