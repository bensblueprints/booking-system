"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Check,
  Loader2,
  AlertCircle,
  MapPin,
  DollarSign,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  deposit_percent: number;
  seats_per_slot: number;
  duration_minutes: number;
  color: string;
  active: number;
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

interface Booking {
  id: number;
  slot_id: number;
  product_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  total_amount: number;
  deposit_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Colour helpers (inline styles for light theme)                    */
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
  danger: "#ef4444",
};

/* ------------------------------------------------------------------ */
/*  Step indicator                                                    */
/* ------------------------------------------------------------------ */
const STEPS = ["Tour", "Date", "Time", "Details", "Confirm"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                style={{
                  background: done ? C.brand : C.gray200,
                  height: 2,
                  width: 24,
                  transition: "background .3s",
                }}
                className="hidden sm:block"
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: done || active ? "#fff" : C.gray400,
                  background: done
                    ? C.brand
                    : active
                    ? C.brandLight
                    : C.gray100,
                  transition: "all .3s",
                  border: active ? `2px solid ${C.brand}` : "2px solid transparent",
                }}
              >
                {done ? <Check size={16} /> : step}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? C.brand : C.gray400,
                }}
                className="hidden sm:block"
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spinner                                                           */
/* ------------------------------------------------------------------ */
function Spinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={32} style={{ color: C.brand }} className="animate-spin" />
      <span style={{ color: C.gray500 }} className="text-sm">
        {text}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error banner                                                      */
/* ------------------------------------------------------------------ */
function ErrorBanner({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        background: "#fef2f2",
        border: `1px solid ${C.danger}`,
        borderRadius: 12,
        padding: "16px 20px",
        color: C.danger,
      }}
      className="flex items-start gap-3 mb-4"
    >
      <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{msg}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm underline mt-1"
            style={{ color: C.brand }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Primary Button                                                    */
/* ------------------------------------------------------------------ */
function PrimaryBtn({
  children,
  onClick,
  disabled,
  style: extraStyle,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.gray300 : C.brand,
        color: "#fff",
        padding: "12px 28px",
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 15,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .2s",
        border: "none",
        ...extraStyle,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = C.brandDark;
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = C.brand;
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Back Button                                                       */
/* ------------------------------------------------------------------ */
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm mb-4"
      style={{
        color: C.gray500,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <ChevronLeft size={16} />
      Back
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar helpers                                                  */
/* ------------------------------------------------------------------ */
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

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ------------------------------------------------------------------ */
/*  Main Component (inner, receives searchParams)                     */
/* ------------------------------------------------------------------ */
function BookingFlowInner() {
  const searchParams = useSearchParams();
  const preselectedProduct = searchParams.get("product");

  /* State --------------------------------------------------------- */
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Calendar
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [availability, setAvailability] = useState<DateAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Time slot
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Customer details
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [notes, setNotes] = useState("");

  // Booking / payment
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  /* Fetch products ----------------------------------------------- */
  const fetchProducts = useCallback(() => {
    setLoadingProducts(true);
    setErrorMsg("");
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load tours");
        return r.json();
      })
      .then((data: Product[]) => {
        setProducts(data);
        if (preselectedProduct) {
          const match = data.find(
            (p) => String(p.id) === preselectedProduct
          );
          if (match) {
            setSelectedProduct(match);
            setStep(2);
          }
        }
      })
      .catch((e) => setErrorMsg(e.message))
      .finally(() => setLoadingProducts(false));
  }, [preselectedProduct]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* Fetch availability ------------------------------------------- */
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
    if (selectedProduct && step >= 2) {
      fetchAvailability(selectedProduct.id, calYear, calMonth);
    }
  }, [selectedProduct, calYear, calMonth, step, fetchAvailability]);

  /* Availability lookup map -------------------------------------- */
  const availMap = new Map<string, DateAvailability>();
  for (const d of availability) {
    availMap.set(d.date, d);
  }

  /* Handlers ----------------------------------------------------- */
  function selectProduct(p: Product) {
    setSelectedProduct(p);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(2);
  }

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep(3);
  }

  function selectSlot(slot: SlotInfo) {
    setSelectedSlot(slot);
    setPartySize(1);
    setStep(4);
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
    setSelectedDate(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !selectedProduct) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Create booking
      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          customer_name: custName.trim(),
          customer_email: custEmail.trim(),
          customer_phone: custPhone.trim() || undefined,
          party_size: partySize,
          notes: notes.trim() || undefined,
        }),
      });

      if (!bookRes.ok) {
        const err = await bookRes.json();
        throw new Error(err.error || "Booking failed");
      }

      const newBooking: Booking = await bookRes.json();
      setBooking(newBooking);

      // 2. Try checkout
      try {
        const payRes = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: newBooking.id }),
        });

        if (payRes.ok) {
          const payData = await payRes.json();
          if (payData.url) {
            window.location.href = payData.url;
            return;
          }
        }
      } catch {
        // payment not configured, continue to confirmation
      }

      // 3. Show confirmation (no stripe)
      setStep(5);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* Price calculations ------------------------------------------- */
  const totalPrice = selectedProduct ? selectedProduct.price * partySize : 0;
  const depositDue = selectedProduct
    ? totalPrice * (selectedProduct.deposit_percent / 100)
    : 0;

  /* ============================================================== */
  /*  RENDER                                                        */
  /* ============================================================== */
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <StepBar current={step} />

      {errorMsg && (
        <ErrorBanner
          msg={errorMsg}
          onRetry={step === 1 ? fetchProducts : undefined}
        />
      )}

      {/* ---- STEP 1: Choose Tour ---- */}
      {step === 1 && (
        <div>
          <h2
            style={{ color: C.gray900 }}
            className="text-2xl font-bold mb-2"
          >
            Choose Your Tour
          </h2>
          <p style={{ color: C.gray500 }} className="mb-6 text-sm">
            Select a tour to get started with your booking.
          </p>

          {loadingProducts ? (
            <Spinner text="Loading tours..." />
          ) : products.length === 0 ? (
            <div
              style={{ color: C.gray500, textAlign: "center" }}
              className="py-16"
            >
              No tours are currently available. Please check back later.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: C.white,
                    borderRadius: 14,
                    border: `1px solid ${C.gray200}`,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
                  }}
                  className="group"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "0 4px 20px rgba(27,107,138,.12)";
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      C.brand;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "0 1px 3px rgba(0,0,0,.06)";
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      C.gray200;
                  }}
                  onClick={() => selectProduct(p)}
                >
                  {/* Colour bar */}
                  <div
                    style={{
                      background: p.color || C.brand,
                      height: 4,
                    }}
                  />
                  <div className="p-5">
                    <h3
                      style={{ color: C.gray900 }}
                      className="text-lg font-semibold mb-1"
                    >
                      {p.name}
                    </h3>
                    {p.description && (
                      <p
                        style={{ color: C.gray500 }}
                        className="text-sm mb-4 line-clamp-2"
                      >
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm mb-4">
                      <span
                        className="flex items-center gap-1"
                        style={{ color: C.gray700 }}
                      >
                        <DollarSign size={14} />
                        <span className="font-semibold">
                          ${p.price.toFixed(2)}
                        </span>
                        <span style={{ color: C.gray400 }}>/person</span>
                      </span>
                      <span
                        className="flex items-center gap-1"
                        style={{ color: C.gray700 }}
                      >
                        <Clock size={14} />
                        {p.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        style={{
                          fontSize: 12,
                          color: C.gray400,
                        }}
                      >
                        {p.deposit_percent}% deposit required
                      </span>
                      <span
                        style={{
                          background: C.brand,
                          color: "#fff",
                          padding: "8px 20px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Book Now
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- STEP 2: Choose Date ---- */}
      {step === 2 && selectedProduct && (
        <div>
          <BackBtn
            onClick={() => {
              setStep(1);
              setSelectedProduct(null);
            }}
          />
          <h2
            style={{ color: C.gray900 }}
            className="text-2xl font-bold mb-1"
          >
            Pick a Date
          </h2>
          <p style={{ color: C.gray500 }} className="mb-6 text-sm">
            {selectedProduct.name} &mdash; ${selectedProduct.price.toFixed(2)}/person
          </p>

          {/* Calendar */}
          <div
            style={{
              background: C.white,
              borderRadius: 14,
              border: `1px solid ${C.gray200}`,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,.06)",
            }}
          >
            {/* Month header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${C.gray100}` }}
            >
              <button
                onClick={prevMonth}
                style={{
                  width: 36,
                  height: 36,
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
                <ChevronLeft size={18} />
              </button>
              <span
                style={{ color: C.gray900, fontWeight: 600, fontSize: 16 }}
              >
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  width: 36,
                  height: 36,
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
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day labels */}
            <div
              className="grid grid-cols-7 text-center py-2 px-3"
              style={{ borderBottom: `1px solid ${C.gray100}` }}
            >
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.gray400,
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {loadingAvailability ? (
              <Spinner text="Loading availability..." />
            ) : (
              <div className="grid grid-cols-7 gap-1 p-3">
                {/* Blank cells before first day */}
                {Array.from({ length: firstDayOfWeek(calYear, calMonth) }).map(
                  (_, i) => (
                    <div key={`blank-${i}`} />
                  )
                )}
                {Array.from({ length: daysInMonth(calYear, calMonth) }).map(
                  (_, i) => {
                    const day = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(
                      2,
                      "0"
                    )}-${String(day).padStart(2, "0")}`;
                    const avail = availMap.get(dateStr);
                    const hasSlots = !!avail && avail.slots.length > 0;
                    const totalSeats = avail
                      ? avail.slots.reduce(
                          (sum, s) => sum + s.available_seats,
                          0
                        )
                      : 0;
                    const isToday =
                      dateStr ===
                      `${now.getFullYear()}-${String(
                        now.getMonth() + 1
                      ).padStart(2, "0")}-${String(now.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                    const isPast =
                      new Date(dateStr + "T23:59:59") < new Date();

                    return (
                      <button
                        key={day}
                        disabled={!hasSlots || isPast}
                        onClick={() => hasSlots && !isPast && selectDate(dateStr)}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 10,
                          border: isToday
                            ? `2px solid ${C.brand}`
                            : "2px solid transparent",
                          background:
                            hasSlots && !isPast ? C.white : C.gray50,
                          cursor:
                            hasSlots && !isPast ? "pointer" : "default",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          transition: "all .15s",
                          opacity: isPast ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (hasSlots && !isPast)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "#e6f3f8";
                        }}
                        onMouseLeave={(e) => {
                          if (hasSlots && !isPast)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              C.white;
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: hasSlots && !isPast ? C.gray900 : C.gray300,
                          }}
                        >
                          {day}
                        </span>
                        {hasSlots && !isPast && (
                          <span
                            style={{
                              fontSize: 10,
                              color: C.brand,
                              fontWeight: 600,
                            }}
                          >
                            {totalSeats} seat{totalSeats !== 1 ? "s" : ""}
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- STEP 3: Choose Time Slot ---- */}
      {step === 3 && selectedProduct && selectedDate && (
        <div>
          <BackBtn
            onClick={() => {
              setStep(2);
              setSelectedSlot(null);
            }}
          />
          <h2
            style={{ color: C.gray900 }}
            className="text-2xl font-bold mb-1"
          >
            Choose a Time
          </h2>
          <p style={{ color: C.gray500 }} className="mb-6 text-sm">
            {selectedProduct.name} &mdash;{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {(availMap.get(selectedDate)?.slots || []).map((slot) => (
              <button
                key={slot.id}
                onClick={() => selectSlot(slot)}
                style={{
                  background: C.white,
                  borderRadius: 12,
                  border: `1px solid ${C.gray200}`,
                  padding: "16px 20px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all .2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    C.brand;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 4px 16px rgba(27,107,138,.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    C.gray200;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 1px 3px rgba(0,0,0,.04)";
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} style={{ color: C.brand }} />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        color: C.gray900,
                      }}
                    >
                      {formatTime(slot.start_time)} &ndash;{" "}
                      {formatTime(slot.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} style={{ color: C.brand }} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: C.brand,
                      }}
                    >
                      {slot.available_seats} available
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- STEP 4: Customer Details ---- */}
      {step === 4 && selectedProduct && selectedDate && selectedSlot && (
        <div>
          <BackBtn
            onClick={() => {
              setStep(3);
            }}
          />
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2
                style={{ color: C.gray900 }}
                className="text-2xl font-bold mb-6"
              >
                Your Details
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.gray700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="John Smith"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.gray200}`,
                      fontSize: 15,
                      color: C.gray900,
                      outline: "none",
                      background: C.white,
                    }}
                    onFocus={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        C.brand)
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        C.gray200)
                    }
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.gray700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="john@example.com"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.gray200}`,
                      fontSize: 15,
                      color: C.gray900,
                      outline: "none",
                      background: C.white,
                    }}
                    onFocus={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        C.brand)
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        C.gray200)
                    }
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.gray700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.gray200}`,
                      fontSize: 15,
                      color: C.gray900,
                      outline: "none",
                      background: C.white,
                    }}
                    onFocus={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        C.brand)
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        C.gray200)
                    }
                  />
                </div>

                {/* Party size */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.gray700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Party Size *
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPartySize(Math.max(1, partySize - 1))
                      }
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        border: `1px solid ${C.gray200}`,
                        background: C.white,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        color: C.gray700,
                      }}
                    >
                      &minus;
                    </button>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.gray900,
                        minWidth: 40,
                        textAlign: "center",
                      }}
                    >
                      {partySize}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPartySize(
                          Math.min(selectedSlot.available_seats, partySize + 1)
                        )
                      }
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        border: `1px solid ${C.gray200}`,
                        background: C.white,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        color: C.gray700,
                      }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: 13, color: C.gray400 }}>
                      (max {selectedSlot.available_seats})
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.gray700,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requirements..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.gray200}`,
                      fontSize: 15,
                      color: C.gray900,
                      outline: "none",
                      resize: "vertical",
                      background: C.white,
                    }}
                    onFocus={(e) =>
                      ((e.target as HTMLTextAreaElement).style.borderColor =
                        C.brand)
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLTextAreaElement).style.borderColor =
                        C.gray200)
                    }
                  />
                </div>

                <PrimaryBtn
                  type="submit"
                  disabled={submitting || !custName || !custEmail}
                  style={{ width: "100%", marginTop: 8 }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Complete Booking — $${depositDue.toFixed(2)} deposit`
                  )}
                </PrimaryBtn>
              </form>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-2">
              <div
                style={{
                  background: C.white,
                  borderRadius: 14,
                  border: `1px solid ${C.gray200}`,
                  padding: 24,
                  position: "sticky",
                  top: 24,
                }}
              >
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: C.gray900,
                    marginBottom: 16,
                  }}
                >
                  Booking Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={16}
                      style={{ color: C.brand, marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: C.gray900 }}>
                        {selectedProduct.name}
                      </div>
                      <div style={{ color: C.gray500 }}>
                        {selectedProduct.duration_minutes} minutes
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock
                      size={16}
                      style={{ color: C.brand, marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: C.gray900 }}>
                        {new Date(
                          selectedDate + "T00:00:00"
                        ).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div style={{ color: C.gray500 }}>
                        {formatTime(selectedSlot.start_time)} &ndash;{" "}
                        {formatTime(selectedSlot.end_time)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users
                      size={16}
                      style={{ color: C.brand, marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: C.gray900 }}>
                        {partySize} person{partySize > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${C.gray100}`,
                    marginTop: 16,
                    paddingTop: 16,
                  }}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: C.gray500 }}>
                      ${selectedProduct.price.toFixed(2)} x {partySize}
                    </span>
                    <span style={{ fontWeight: 600, color: C.gray900 }}>
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between text-sm"
                    style={{
                      background: "#fef9ee",
                      marginLeft: -12,
                      marginRight: -12,
                      padding: "8px 12px",
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{ color: C.gray700, fontWeight: 600 }}
                    >
                      Deposit due today
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: C.accent,
                        fontSize: 16,
                      }}
                    >
                      ${depositDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- STEP 5: Confirmation ---- */}
      {step === 5 && booking && selectedProduct && selectedDate && selectedSlot && (
        <div className="flex flex-col items-center text-center py-8">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Check size={32} style={{ color: C.success }} />
          </div>
          <h2
            style={{ color: C.gray900 }}
            className="text-2xl font-bold mb-2"
          >
            Booking Confirmed!
          </h2>
          <p style={{ color: C.gray500 }} className="mb-1 text-sm">
            Your reference number is
          </p>
          <p
            style={{
              fontWeight: 700,
              fontSize: 24,
              color: C.brand,
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            #{String(booking.id).padStart(4, "0")}
          </p>
          <p style={{ color: C.gray500 }} className="mb-8 text-sm max-w-md">
            A confirmation email will be sent to{" "}
            <strong style={{ color: C.gray700 }}>{booking.customer_email}</strong>.
            Please pay at the location when you arrive.
          </p>

          {/* Details card */}
          <div
            style={{
              background: C.white,
              borderRadius: 14,
              border: `1px solid ${C.gray200}`,
              padding: 24,
              maxWidth: 420,
              width: "100%",
              textAlign: "left",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                color: C.gray900,
                marginBottom: 16,
              }}
            >
              Booking Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: C.gray500 }}>Tour</span>
                <span style={{ fontWeight: 600, color: C.gray900 }}>
                  {selectedProduct.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: C.gray500 }}>Date</span>
                <span style={{ fontWeight: 600, color: C.gray900 }}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: C.gray500 }}>Time</span>
                <span style={{ fontWeight: 600, color: C.gray900 }}>
                  {formatTime(selectedSlot.start_time)} &ndash;{" "}
                  {formatTime(selectedSlot.end_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: C.gray500 }}>Party Size</span>
                <span style={{ fontWeight: 600, color: C.gray900 }}>
                  {booking.party_size}
                </span>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${C.gray100}`,
                  paddingTop: 12,
                  marginTop: 4,
                }}
                className="flex justify-between"
              >
                <span style={{ color: C.gray500 }}>Total</span>
                <span style={{ fontWeight: 700, color: C.gray900 }}>
                  ${booking.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: C.gray500 }}>Deposit</span>
                <span style={{ fontWeight: 700, color: C.accent }}>
                  ${booking.deposit_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <PrimaryBtn
            onClick={() => {
              setStep(1);
              setSelectedProduct(null);
              setSelectedDate(null);
              setSelectedSlot(null);
              setBooking(null);
              setCustName("");
              setCustEmail("");
              setCustPhone("");
              setPartySize(1);
              setNotes("");
              setErrorMsg("");
            }}
            style={{ marginTop: 24 }}
          >
            Book Another Tour
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wrapper with Suspense for useSearchParams                         */
/* ------------------------------------------------------------------ */
export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Spinner text="Loading..." />
        </div>
      }
    >
      <BookingFlowInner />
    </Suspense>
  );
}
