"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Check,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  X,
  RefreshCw,
} from "lucide-react";

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

interface ManagedBooking {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  total_amount: number;
  deposit_amount: number;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  product_id: number;
  product_name: string;
  product_price: number;
  date: string;
  start_time: string;
  end_time: string;
  addons?: BookingAddon[];
  discount_amount?: number;
  discount_description?: string;
  base_amount?: number;
}

interface SlotInfo {
  id: number;
  start_time: string;
  end_time: string;
  available_seats: number;
  total_seats: number;
}

interface DateAvailability {
  date: string;
  slots: SlotInfo[];
}

interface AvailabilityResponse {
  product_id: number;
  month: string;
  dates: DateAvailability[];
}

/* ------------------------------------------------------------------ */
/*  Colours                                                           */
/* ------------------------------------------------------------------ */
const C = {
  brand: "#1B6B8A",
  brandDark: "#155570",
  brandLight: "#2a8db0",
  accent: "#F4B942",
  bg: "#FAFBFC",
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  success: "#22c55e",
  successLight: "#dcfce7",
  danger: "#ef4444",
  dangerLight: "#fef2f2",
};

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* Calendar helpers */
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */
export default function ManageBookingPage() {
  const params = useParams();
  const token = params.token as string;

  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [availability, setAvailability] = useState<DateAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Result state
  const [actionResult, setActionResult] = useState<{
    type: "cancelled" | "rescheduled";
    newDate?: string;
    newTime?: string;
  } | null>(null);

  /* Fetch booking ------------------------------------------------ */
  useEffect(() => {
    if (!token) return;
    fetch(`/api/manage/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Booking not found or link expired.");
        return r.json();
      })
      .then((data) => setBooking(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  /* Fetch availability for reschedule ---------------------------- */
  const fetchAvailability = useCallback(
    (productId: number, year: number, month: number) => {
      setLoadingAvailability(true);
      const mm = String(month + 1).padStart(2, "0");
      fetch(`/api/availability?product_id=${productId}&month=${year}-${mm}`)
        .then((r) => r.json())
        .then((data: AvailabilityResponse) => {
          setAvailability(data.dates || []);
        })
        .catch(() => setAvailability([]))
        .finally(() => setLoadingAvailability(false));
    },
    []
  );

  useEffect(() => {
    if (booking && showReschedule) {
      fetchAvailability(booking.product_id, calYear, calMonth);
    }
  }, [booking, showReschedule, calYear, calMonth, fetchAvailability]);

  const availMap = new Map<string, DateAvailability>();
  for (const d of availability) {
    availMap.set(d.date, d);
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
    setSelectedDate(null);
    setSelectedSlot(null);
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
    setSelectedDate(null);
    setSelectedSlot(null);
  }

  /* Reschedule action -------------------------------------------- */
  async function handleReschedule() {
    if (!selectedSlot) return;
    setRescheduling(true);
    setError("");
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          new_slot_id: selectedSlot.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reschedule");
      }
      setActionResult({
        type: "rescheduled",
        newDate: selectedDate || undefined,
        newTime: selectedSlot
          ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}`
          : undefined,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRescheduling(false);
    }
  }

  /* Cancel action ------------------------------------------------ */
  async function handleCancel() {
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      setActionResult({ type: "cancelled" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }

  /* Loading state ------------------------------------------------ */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={32} style={{ color: C.brand }} className="animate-spin" />
        <span style={{ color: C.gray500 }} className="text-sm">
          Loading your booking...
        </span>
      </div>
    );
  }

  /* Error state -------------------------------------------------- */
  if (error && !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: C.dangerLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertCircle size={28} style={{ color: C.danger }} />
        </div>
        <h2 style={{ color: C.gray900 }} className="text-xl font-bold mb-2">
          Booking Not Found
        </h2>
        <p style={{ color: C.gray500 }} className="text-sm mb-6">
          {error}
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

  if (!booking) return null;

  /* Action result screens ---------------------------------------- */
  if (actionResult) {
    const isCancelled = actionResult.type === "cancelled";
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: isCancelled ? C.dangerLight : C.successLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          {isCancelled ? (
            <X size={36} style={{ color: C.danger }} />
          ) : (
            <Check size={36} style={{ color: C.success }} />
          )}
        </div>
        <h2 style={{ color: C.gray900 }} className="text-2xl font-bold mb-3">
          {isCancelled ? "Booking Cancelled" : "Booking Rescheduled"}
        </h2>
        {isCancelled ? (
          <p style={{ color: C.gray500 }} className="text-sm mb-8">
            Your booking{" "}
            <strong style={{ color: C.brand }}>
              #{String(booking.id).padStart(4, "0")}
            </strong>{" "}
            has been cancelled. If you paid a deposit, a refund will be processed.
          </p>
        ) : (
          <div style={{ color: C.gray500 }} className="text-sm mb-8">
            <p className="mb-2">
              Your booking{" "}
              <strong style={{ color: C.brand }}>
                #{String(booking.id).padStart(4, "0")}
              </strong>{" "}
              has been rescheduled.
            </p>
            {actionResult.newDate && (
              <div
                style={{
                  background: C.white,
                  borderRadius: 12,
                  border: `1px solid ${C.gray200}`,
                  padding: "16px 20px",
                  display: "inline-block",
                  marginTop: 8,
                }}
              >
                <div style={{ fontWeight: 600, color: C.gray900, marginBottom: 4 }}>
                  New Date &amp; Time
                </div>
                <div style={{ color: C.brand, fontWeight: 600 }}>
                  {new Date(actionResult.newDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </div>
                {actionResult.newTime && (
                  <div style={{ color: C.gray700 }}>{actionResult.newTime}</div>
                )}
              </div>
            )}
          </div>
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
          {isCancelled ? "Book a New Tour" : "Back to Home"}
        </a>
      </div>
    );
  }

  /* Main manage view --------------------------------------------- */
  const baseAmount = booking.base_amount ?? booking.product_price * booking.party_size;
  const hasAddons = booking.addons && booking.addons.length > 0;
  const hasDiscount = (booking.discount_amount ?? 0) > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1
        style={{ color: C.gray900 }}
        className="text-2xl font-bold mb-2 text-center"
      >
        Manage Your Booking
      </h1>
      <p
        style={{ color: C.gray500 }}
        className="text-sm text-center mb-8"
      >
        Reference:{" "}
        <strong style={{ color: C.brand, letterSpacing: 1 }}>
          #{String(booking.id).padStart(4, "0")}
        </strong>
      </p>

      {error && (
        <div
          style={{
            background: C.dangerLight,
            border: `1px solid ${C.danger}`,
            borderRadius: 12,
            padding: "12px 16px",
            color: C.danger,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Booking Summary Card */}
      <div
        style={{
          background: C.white,
          borderRadius: 14,
          border: `1px solid ${C.gray200}`,
          padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          marginBottom: 16,
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
            value={`${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
          />
          <Row
            label="Party Size"
            value={`${booking.party_size} person${booking.party_size > 1 ? "s" : ""}`}
          />
          <Row
            label="Status"
            value={booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
            accent={booking.status !== "cancelled"}
          />

          {/* Price breakdown */}
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
                </span>
                <span style={{ fontWeight: 600, color: C.gray900 }}>
                  ${addon.line_total.toFixed(2)}
                </span>
              </div>
            ))}

          {hasDiscount && (
            <div className="flex justify-between">
              <span style={{ color: C.success }}>
                Discount
                {booking.discount_description
                  ? ` (${booking.discount_description})`
                  : ""}
              </span>
              <span style={{ fontWeight: 600, color: C.success }}>
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
          <Row
            label="Total"
            value={`$${booking.total_amount.toFixed(2)}`}
            bold
          />
          <Row
            label="Deposit"
            value={`$${booking.deposit_amount.toFixed(2)}`}
            accent
          />
          <Row
            label="Payment"
            value={
              booking.payment_status === "paid"
                ? "Paid"
                : "Pay at location"
            }
            bold
          />
        </div>
      </div>

      {/* Action Buttons */}
      {booking.status !== "cancelled" && !showReschedule && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowReschedule(true)}
            style={{
              flex: 1,
              background: C.white,
              border: `1px solid ${C.brand}`,
              color: C.brand,
              padding: "12px 16px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all .2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#e6f3f8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.white;
            }}
          >
            <RefreshCw size={16} />
            Reschedule
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{
              flex: 1,
              background: C.white,
              border: `1px solid ${C.danger}`,
              color: C.danger,
              padding: "12px 16px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all .2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.dangerLight;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.white;
            }}
          >
            <X size={16} />
            Cancel Booking
          </button>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 16,
              padding: 28,
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: C.dangerLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertCircle size={24} style={{ color: C.danger }} />
            </div>
            <h3
              style={{
                color: C.gray900,
                fontWeight: 700,
                fontSize: 18,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Cancel Booking?
            </h3>
            <p
              style={{
                color: C.gray500,
                fontSize: 14,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              This action cannot be undone. Are you sure you want to cancel your
              booking for{" "}
              <strong style={{ color: C.gray700 }}>{booking.product_name}</strong>{" "}
              on{" "}
              <strong style={{ color: C.gray700 }}>
                {new Date(booking.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric" }
                )}
              </strong>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${C.gray200}`,
                  background: C.white,
                  color: C.gray700,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: C.danger,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: cancelling ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {cancelling ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Panel */}
      {showReschedule && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              background: C.white,
              borderRadius: 14,
              border: `1px solid ${C.gray200}`,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: `1px solid ${C.gray100}` }}
            >
              <h3 style={{ fontWeight: 700, color: C.gray900, fontSize: 15, margin: 0 }}>
                Choose a New Date &amp; Time
              </h3>
              <button
                onClick={() => {
                  setShowReschedule(false);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.gray400,
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Calendar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: `1px solid ${C.gray100}` }}
            >
              <button
                onClick={prevMonth}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${C.gray200}`,
                  background: C.white,
                  cursor: "pointer",
                  color: C.gray700,
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ color: C.gray900, fontWeight: 600, fontSize: 14 }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${C.gray200}`,
                  background: C.white,
                  cursor: "pointer",
                  color: C.gray700,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div
              className="grid grid-cols-7 text-center py-2 px-3"
              style={{ borderBottom: `1px solid ${C.gray100}` }}
            >
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.gray400,
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {loadingAvailability ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} style={{ color: C.brand }} className="animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 p-3">
                {Array.from({ length: firstDayOfWeek(calYear, calMonth) }).map(
                  (_, i) => <div key={`blank-${i}`} />
                )}
                {Array.from({ length: daysInMonth(calYear, calMonth) }).map(
                  (_, i) => {
                    const day = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const avail = availMap.get(dateStr);
                    const hasSlots = !!avail && avail.slots.length > 0;
                    const isPast = new Date(dateStr + "T23:59:59") < new Date();
                    const isSelected = dateStr === selectedDate;

                    return (
                      <button
                        key={day}
                        disabled={!hasSlots || isPast}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedSlot(null);
                        }}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 8,
                          border: isSelected
                            ? `2px solid ${C.brand}`
                            : "2px solid transparent",
                          background: isSelected
                            ? "#e6f3f8"
                            : hasSlots && !isPast
                            ? C.white
                            : C.gray50,
                          cursor: hasSlots && !isPast ? "pointer" : "default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 500,
                          color: hasSlots && !isPast ? C.gray900 : C.gray300,
                          opacity: isPast ? 0.4 : 1,
                          transition: "all .15s",
                        }}
                      >
                        {day}
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {/* Time slots for selected date */}
            {selectedDate && (
              <div style={{ padding: "0 16px 16px" }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.gray700,
                    marginBottom: 8,
                  }}
                >
                  Available times for{" "}
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric" }
                  )}
                </p>
                <div className="grid gap-2 grid-cols-2">
                  {(availMap.get(selectedDate)?.slots || []).map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          background: isSelected ? C.brand : C.white,
                          color: isSelected ? "#fff" : C.gray900,
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? C.brand : C.gray200}`,
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                          textAlign: "center",
                          transition: "all .15s",
                        }}
                      >
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 400,
                            color: isSelected ? "rgba(255,255,255,.8)" : C.gray400,
                            marginTop: 2,
                          }}
                        >
                          {slot.available_seats} available
                        </div>
                      </button>
                    );
                  })}
                  {(availMap.get(selectedDate)?.slots || []).length === 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        color: C.gray400,
                        fontSize: 13,
                        padding: 12,
                      }}
                    >
                      No available time slots for this date.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reschedule confirm button */}
          {selectedSlot && (
            <button
              onClick={handleReschedule}
              disabled={rescheduling}
              style={{
                width: "100%",
                marginTop: 12,
                background: rescheduling ? C.gray300 : C.brand,
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                border: "none",
                cursor: rescheduling ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {rescheduling ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Calendar size={18} />
                  Confirm Reschedule
                </>
              )}
            </button>
          )}
        </div>
      )}
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
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontWeight: bold || accent ? 700 : 600,
          color: accent ? "#F4B942" : "#111827",
        }}
      >
        {value}
      </span>
    </div>
  );
}
