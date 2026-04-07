import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

const JWT_SECRET =
  process.env.JWT_SECRET || "booking-system-dev-secret-" + Date.now().toString(36);

export function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function getAdminFromRequest(
  req: Request
): Record<string, unknown> | null {
  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) return payload;
  }

  // Check cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce(
      (acc, c) => {
        const [key, ...rest] = c.trim().split("=");
        acc[key] = rest.join("=");
        return acc;
      },
      {} as Record<string, string>
    );
    if (cookies["admin_token"]) {
      const payload = verifyToken(cookies["admin_token"]);
      if (payload) return payload;
    }
  }

  return null;
}

export function requireAdmin(req: Request): Record<string, unknown> {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    throw new Error("Unauthorized");
  }
  return admin;
}
