import nodemailer from "nodemailer";
import { getDb } from "./db";

function getSetting(key: string): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value || "";
}

function getSettings(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = getSetting(key);
  }
  return result;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const config = getSettings([
    "smtp_host", "smtp_port", "smtp_user", "smtp_pass",
    "smtp_from_email", "smtp_from_name",
  ]);

  if (!config.smtp_host || !config.smtp_from_email) {
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port || "587", 10),
      secure: parseInt(config.smtp_port || "587", 10) === 465,
      auth: config.smtp_user
        ? { user: config.smtp_user, pass: config.smtp_pass }
        : undefined,
    });

    await transporter.sendMail({
      from: config.smtp_from_name
        ? `"${config.smtp_from_name}" <${config.smtp_from_email}>`
        : config.smtp_from_email,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function getManageLink(manageToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  return `${baseUrl}/book/manage/${manageToken}`;
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}

export async function sendBookingEmail(
  bookingId: number,
  templateType: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  const template = db
    .prepare("SELECT * FROM email_templates WHERE template_type = ? AND active = 1")
    .get(templateType) as { subject: string; body_html: string } | undefined;

  if (!template) {
    return { success: false, error: `Template '${templateType}' not found or inactive` };
  }

  const booking = db
    .prepare(
      `SELECT b.*, s.date, s.start_time, s.end_time,
              p.name as product_name
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       JOIN products p ON b.product_id = p.id
       WHERE b.id = ?`
    )
    .get(bookingId) as Record<string, unknown> | undefined;

  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  const businessConfig = getSettings(["business_name", "business_phone", "business_email"]);

  const manageToken = (booking.manage_token as string) || "";
  const variables: Record<string, string> = {
    customer_name: String(booking.customer_name || ""),
    customer_email: String(booking.customer_email || ""),
    product_name: String(booking.product_name || ""),
    booking_date: String(booking.date || ""),
    booking_time: String(booking.start_time || ""),
    party_size: String(booking.party_size || "1"),
    total_amount: Number(booking.total_amount || 0).toFixed(2),
    deposit_amount: Number(booking.deposit_amount || 0).toFixed(2),
    manage_link: manageToken ? getManageLink(manageToken) : "",
    business_name: businessConfig.business_name,
    business_phone: businessConfig.business_phone,
    business_email: businessConfig.business_email,
  };

  const subject = interpolateTemplate(template.subject, variables);
  const html = interpolateTemplate(template.body_html, variables);
  const recipientEmail = String(booking.customer_email);

  const result = await sendEmail(recipientEmail, subject, html);

  // Log the email
  try {
    db.prepare(
      `INSERT INTO email_log (booking_id, template_type, recipient_email, subject, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      bookingId,
      templateType,
      recipientEmail,
      subject,
      result.success ? "sent" : "failed",
      result.error || null
    );
  } catch {
    // Don't fail if logging fails
  }

  return result;
}
