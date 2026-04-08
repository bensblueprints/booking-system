"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, AlertCircle, Printer } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface BookingAddon {
  name: string;
  quantity: number;
  price: number;
  per_person: boolean;
  line_total: number;
}

interface BookingDetails {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  total_amount: number;
  deposit_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  product_name: string;
  product_price: number;
  date: string;
  start_time: string;
  end_time: string;
  manage_token?: string;
  addons?: BookingAddon[];
  discount_amount?: number;
  discount_description?: string;
  base_amount?: number;
}

/* ------------------------------------------------------------------ */
/*  Colours                                                           */
/* ------------------------------------------------------------------ */
const C = {
  brand: "#1B6B8A",
  accent: "#F4B942",
  white: "#ffffff",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
  success: "#22c55e",
  danger: "#ef4444",
};

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ------------------------------------------------------------------ */
/*  Inner Component                                                   */
/* ------------------------------------------------------------------ */
function ConfirmationInner() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const sessionId = searchParams.get("session_id");
  const status = searchParams.get("status");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      setError("No booking ID provided.");
      setLoading(false);
      return;
    }

    fetch(`/api/bookings/${bookingId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load booking details.");
        return r.json();
      })
      .then((data) => setBooking(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={32} style={{ color: C.brand }} className="animate-spin" />
        <span style={{ color: C.gray500 }} className="text-sm">
          Loading confirmation...
        </span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertCircle size={28} style={{ color: C.danger }} />
        </div>
        <h2
          style={{ color: C.gray900 }}
          className="text-xl font-bold mb-2"
        >
          Booking Not Found
        </h2>
        <p style={{ color: C.gray500 }} className="text-sm mb-6">
          {error || "We could not find this booking. It may have been removed."}
        </p>
        <a
          href="/book"
          style={{
            background: C.brand,
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Back to Booking
        </a>
      </div>
    );
  }

  const paid = status === "success" || sessionId;
  const baseAmount = booking.base_amount ?? booking.product_price * booking.party_size;
  const hasAddons = booking.addons && booking.addons.length > 0;
  const hasDiscount = (booking.discount_amount ?? 0) > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Check size={36} style={{ color: C.success }} />
        </div>
        <h1
          style={{ color: C.gray900 }}
          className="text-2xl font-bold mb-2"
        >
          Booking Confirmed!
        </h1>
        {paid && (
          <p style={{ color: C.success }} className="text-sm font-semibold mb-1">
            Payment received successfully
          </p>
        )}
        <p style={{ color: C.gray500 }} className="text-sm">
          Reference number:{" "}
          <strong style={{ color: C.brand, letterSpacing: 1 }}>
            #{String(booking.id).padStart(4, "0")}
          </strong>
        </p>
      </div>

      {/* Details Card */}
      <div
        style={{
          background: C.white,
          borderRadius: 14,
          border: `1px solid ${C.gray200}`,
          padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: C.gray900,
            marginBottom: 16,
          }}
        >
          Booking Details
        </h3>
        <div className="space-y-3 text-sm">
          <Row label="Tour" value={booking.product_name} />
          <Row
            label="Date"
            value={new Date(booking.date + "T00:00:00").toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          />
          <Row
            label="Time"
            value={`${formatTime(booking.start_time)} - ${formatTime(
              booking.end_time
            )}`}
          />
          <Row label="Name" value={booking.customer_name} />
          <Row label="Email" value={booking.customer_email} />
          {booking.customer_phone && (
            <Row label="Phone" value={booking.customer_phone} />
          )}
          <Row
            label="Party Size"
            value={`${booking.party_size} person${
              booking.party_size > 1 ? "s" : ""
            }`}
          />
          {booking.notes && <Row label="Notes" value={booking.notes} />}

          {/* Price Breakdown */}
          <div
            style={{
              borderTop: `1px solid ${C.gray100}`,
              paddingTop: 12,
              marginTop: 8,
            }}
          />

          <div className="flex justify-between">
            <span style={{ color: C.gray500 }}>
              Base (${booking.product_price.toFixed(2)} x {booking.party_size})
            </span>
            <span style={{ fontWeight: 600, color: C.gray900 }}>
              ${baseAmount.toFixed(2)}
            </span>
          </div>

          {hasAddons &&
            booking.addons!.map((addon, idx) => (
              <div key={idx} className="flex justify-between">
                <span style={{ color: C.gray500 }}>
                  {addon.name} x{addon.quantity}
                  {addon.per_person ? " (per person)" : ""}
                </span>
                <span style={{ fontWeight: 600, color: C.gray900 }}>
                  ${addon.line_total.toFixed(2)}
                </span>
              </div>
            ))}

          {hasDiscount && (
            <div className="flex justify-between">
              <span style={{ color: "#22c55e" }}>
                Discount{booking.discount_description ? ` (${booking.discount_description})` : ""}
              </span>
              <span style={{ fontWeight: 600, color: "#22c55e" }}>
                -${(booking.discount_amount ?? 0).toFixed(2)}
              </span>
            </div>
          )}

          <div
            style={{
              borderTop: `1px solid ${C.gray100}`,
              paddingTop: 8,
              marginTop: 4,
            }}
          />

          <Row label="Total" value={`$${booking.total_amount.toFixed(2)}`} bold />
          <Row
            label="Deposit"
            value={`$${booking.deposit_amount.toFixed(2)}`}
            accent
          />
          <Row
            label="Payment Status"
            value={
              paid
                ? "Paid"
                : booking.payment_status === "paid"
                ? "Paid"
                : "Pay at location"
            }
            bold
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        <button
          onClick={() => window.print()}
          style={{
            background: C.white,
            border: `1px solid ${C.gray200}`,
            color: C.gray700,
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Printer size={16} />
          Print
        </button>
        {booking.manage_token && (
          <a
            href={`/book/manage/${booking.manage_token}`}
            style={{
              background: C.white,
              border: `1px solid ${C.brand}`,
              color: C.brand,
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Manage Your Booking
          </a>
        )}
        <a
          href="/book"
          style={{
            background: C.brand,
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Book Another Tour
        </a>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, footer, button, a[href="/book"], a[href^="/book/manage"] { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span style={{ color: C.gray500 }}>{label}</span>
      <span
        style={{
          fontWeight: bold || accent ? 700 : 600,
          color: accent ? C.accent : C.gray900,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Export with Suspense                                               */
/* ------------------------------------------------------------------ */
export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} style={{ color: "#1B6B8A" }} className="animate-spin" />
        </div>
      }
    >
      <ConfirmationInner />
    </Suspense>
  );
}
