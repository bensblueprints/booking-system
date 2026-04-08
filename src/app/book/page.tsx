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
  Plus,
  Minus,
  Tag,
  X,
  Gift,
  ShoppingCart,
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
  cutoff_hours?: number;
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
  manage_token?: string;
}

interface Addon {
  id: number;
  product_id: number;
  name: string;
  description: string | null;
  price: number;
  per_person: boolean;
  max_quantity: number;
  active: number;
}

interface PromoValidation {
  valid: boolean;
  discount_type?: string;
  discount_value?: number;
  discount_description?: string;
  discount_amount?: number;
  error?: string;
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
  successLight: "#dcfce7",
  danger: "#ef4444",
  dangerLight: "#fef2f2",
};

/* ------------------------------------------------------------------ */
/*  Step indicator                                                    */
/* ------------------------------------------------------------------ */
const STEPS = ["Tour", "Date", "Time", "Details", "Extras", "Pay"];

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
        background: C.dangerLight,
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
  const [blackoutDates, setBlackoutDates] = useState<Set<string>>(new Set());

  // Time slot
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Customer details
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [notes, setNotes] = useState("");

  // Add-ons
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [addonQuantities, setAddonQuantities] = useState<Record<number, number>>({});

  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoShake, setPromoShake] = useState(false);

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

  /* Fetch blackout dates ----------------------------------------- */
  useEffect(() => {
    if (selectedProduct && step >= 2) {
      fetch(`/api/blackout-dates?product_id=${selectedProduct.id}`)
        .then((r) => r.json())
        .then((data: { dates?: string[] }) => {
          setBlackoutDates(new Set(data.dates || []));
        })
        .catch(() => setBlackoutDates(new Set()));
    }
  }, [selectedProduct, step]);

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

  /* Fetch add-ons ------------------------------------------------ */
  useEffect(() => {
    if (selectedProduct && step === 5) {
      setLoadingAddons(true);
      fetch(`/api/addons?product_id=${selectedProduct.id}`)
        .then((r) => r.json())
        .then((data: Addon[]) => {
          setAddons(Array.isArray(data) ? data.filter(a => a.active) : []);
        })
        .catch(() => setAddons([]))
        .finally(() => setLoadingAddons(false));
    }
  }, [selectedProduct, step]);

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
    setAddonQuantities({});
    setPromoCode("");
    setPromoValidation(null);
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

  function goToExtras() {
    setStep(5);
  }

  /* Cutoff check for time slots ---------------------------------- */
  function isSlotWithinCutoff(slot: SlotInfo, date: string): boolean {
    if (!selectedProduct?.cutoff_hours) return false;
    const slotDateTime = new Date(`${date}T${slot.start_time}`);
    const cutoffMs = selectedProduct.cutoff_hours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() + cutoffMs);
    return slotDateTime <= cutoffTime;
  }

  /* Addon quantity change ---------------------------------------- */
  function setAddonQty(addonId: number, qty: number) {
    setAddonQuantities(prev => ({ ...prev, [addonId]: qty }));
  }

  /* Promo code validation ---------------------------------------- */
  async function validatePromo() {
    if (!promoCode.trim() || !selectedProduct) return;
    setValidatingPromo(true);
    setPromoValidation(null);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode.trim(),
          product_id: selectedProduct.id,
          amount: subtotalBeforeDiscount,
        }),
      });
      const data: PromoValidation = await res.json();
      if (data.valid) {
        setPromoValidation(data);
      } else {
        setPromoValidation({ valid: false, error: data.error || "Invalid promo code" });
        setPromoShake(true);
        setTimeout(() => setPromoShake(false), 500);
      }
    } catch {
      setPromoValidation({ valid: false, error: "Could not validate promo code" });
      setPromoShake(true);
      setTimeout(() => setPromoShake(false), 500);
    } finally {
      setValidatingPromo(false);
    }
  }

  function removePromo() {
    setPromoCode("");
    setPromoValidation(null);
  }

  /* Price calculations ------------------------------------------- */
  const basePrice = selectedProduct ? selectedProduct.price * partySize : 0;

  const addonsTotal = addons.reduce((sum, addon) => {
    const qty = addonQuantities[addon.id] || 0;
    if (qty <= 0) return sum;
    const unitPrice = addon.per_person ? addon.price * partySize : addon.price;
    return sum + unitPrice * qty;
  }, 0);

  const subtotalBeforeDiscount = basePrice + addonsTotal;

  const discountAmount = promoValidation?.valid && promoValidation.discount_amount
    ? promoValidation.discount_amount
    : 0;

  const totalPrice = Math.max(0, subtotalBeforeDiscount - discountAmount);
  const depositDue = selectedProduct
    ? totalPrice * (selectedProduct.deposit_percent / 100)
    : 0;

  /* Submit booking ----------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !selectedProduct) return;
    setSubmitting(true);
    setErrorMsg("");

    // Build addons array
    const selectedAddons = Object.entries(addonQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ addon_id: Number(id), quantity: qty }));

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
          promo_code: promoValidation?.valid ? promoCode.trim() : undefined,
          addons: selectedAddons.length > 0 ? selectedAddons : undefined,
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
      setStep(6);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

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
                    const isBlackout = blackoutDates.has(dateStr);
                    const isDisabled = !hasSlots || isPast || isBlackout;

                    return (
                      <button
                        key={day}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && selectDate(dateStr)}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 10,
                          border: isToday
                            ? `2px solid ${C.brand}`
                            : "2px solid transparent",
                          background: isBlackout
                            ? "#f3f4f6"
                            : hasSlots && !isPast
                            ? C.white
                            : C.gray50,
                          cursor: isDisabled ? "default" : "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          transition: "all .15s",
                          opacity: isPast ? 0.4 : isBlackout ? 0.5 : 1,
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          if (!isDisabled)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              "#e6f3f8";
                        }}
                        onMouseLeave={(e) => {
                          if (!isDisabled)
                            (e.currentTarget as HTMLButtonElement).style.background =
                              C.white;
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: isDisabled ? C.gray300 : C.gray900,
                            textDecoration: isBlackout ? "line-through" : "none",
                          }}
                        >
                          {day}
                        </span>
                        {isBlackout && !isPast && (
                          <span
                            style={{
                              fontSize: 8,
                              color: C.danger,
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            Closed
                          </span>
                        )}
                        {hasSlots && !isPast && !isBlackout && (
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
            {(availMap.get(selectedDate)?.slots || []).map((slot) => {
              const isCutoff = isSlotWithinCutoff(slot, selectedDate);
              return (
                <button
                  key={slot.id}
                  disabled={isCutoff}
                  onClick={() => !isCutoff && selectSlot(slot)}
                  style={{
                    background: isCutoff ? C.gray50 : C.white,
                    borderRadius: 12,
                    border: `1px solid ${isCutoff ? C.gray200 : C.gray200}`,
                    padding: "16px 20px",
                    cursor: isCutoff ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                    opacity: isCutoff ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCutoff) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        C.brand;
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 4px 16px rgba(27,107,138,.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCutoff) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        C.gray200;
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 1px 3px rgba(0,0,0,.04)";
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} style={{ color: isCutoff ? C.gray400 : C.brand }} />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 16,
                          color: isCutoff ? C.gray400 : C.gray900,
                        }}
                      >
                        {formatTime(slot.start_time)} &ndash;{" "}
                        {formatTime(slot.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCutoff ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: C.danger,
                            background: C.dangerLight,
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          Booking closed
                        </span>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
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
              <div className="space-y-4">
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
                  onClick={goToExtras}
                  disabled={!custName || !custEmail}
                  style={{ width: "100%", marginTop: 8 }}
                >
                  Continue to Extras
                </PrimaryBtn>
              </div>
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
                      ${basePrice.toFixed(2)}
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

      {/* ---- STEP 5: Add-ons & Promo ---- */}
      {step === 5 && selectedProduct && selectedDate && selectedSlot && (
        <div>
          <BackBtn onClick={() => setStep(4)} />
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <h2
                style={{ color: C.gray900 }}
                className="text-2xl font-bold mb-2"
              >
                Extras &amp; Promo
              </h2>
              <p style={{ color: C.gray500 }} className="mb-6 text-sm">
                Enhance your experience with add-ons or apply a promo code.
              </p>

              {/* Add-ons */}
              {loadingAddons ? (
                <Spinner text="Loading add-ons..." />
              ) : addons.length > 0 ? (
                <div style={{ marginBottom: 32 }}>
                  <h3
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: C.gray900,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Gift size={18} style={{ color: C.brand }} />
                    Available Add-ons
                  </h3>
                  <div className="space-y-3">
                    {addons.map((addon) => {
                      const qty = addonQuantities[addon.id] || 0;
                      const unitPrice = addon.per_person
                        ? addon.price * partySize
                        : addon.price;
                      const lineTotal = unitPrice * qty;
                      return (
                        <div
                          key={addon.id}
                          style={{
                            background: C.white,
                            borderRadius: 12,
                            border: `1px solid ${qty > 0 ? C.brand : C.gray200}`,
                            padding: "16px 20px",
                            transition: "all .2s",
                            boxShadow: qty > 0
                              ? "0 2px 12px rgba(27,107,138,.1)"
                              : "0 1px 3px rgba(0,0,0,.04)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 15,
                                  color: C.gray900,
                                  marginBottom: 2,
                                }}
                              >
                                {addon.name}
                              </div>
                              {addon.description && (
                                <p
                                  style={{
                                    fontSize: 13,
                                    color: C.gray500,
                                    marginBottom: 6,
                                    margin: 0,
                                  }}
                                >
                                  {addon.description}
                                </p>
                              )}
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: C.brand,
                                  marginTop: 4,
                                }}
                              >
                                ${addon.price.toFixed(2)}
                                {addon.per_person && (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 400,
                                      color: C.gray400,
                                      marginLeft: 4,
                                    }}
                                  >
                                    per person
                                  </span>
                                )}
                                {addon.per_person && partySize > 1 && (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: C.gray500,
                                      marginLeft: 8,
                                    }}
                                  >
                                    (${unitPrice.toFixed(2)} total)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-2"
                              style={{ flexShrink: 0 }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setAddonQty(addon.id, Math.max(0, qty - 1))
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  border: `1px solid ${C.gray200}`,
                                  background: qty > 0 ? C.brand : C.gray100,
                                  color: qty > 0 ? "#fff" : C.gray400,
                                  cursor: qty > 0 ? "pointer" : "default",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all .15s",
                                }}
                              >
                                <Minus size={14} />
                              </button>
                              <span
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: C.gray900,
                                  minWidth: 28,
                                  textAlign: "center",
                                }}
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setAddonQty(
                                    addon.id,
                                    Math.min(addon.max_quantity, qty + 1)
                                  )
                                }
                                disabled={qty >= addon.max_quantity}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  border: `1px solid ${C.gray200}`,
                                  background:
                                    qty < addon.max_quantity
                                      ? C.brand
                                      : C.gray100,
                                  color:
                                    qty < addon.max_quantity
                                      ? "#fff"
                                      : C.gray400,
                                  cursor:
                                    qty < addon.max_quantity
                                      ? "pointer"
                                      : "not-allowed",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all .15s",
                                }}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          {qty > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                paddingTop: 8,
                                borderTop: `1px solid ${C.gray100}`,
                                fontSize: 13,
                                fontWeight: 600,
                                color: C.brand,
                                textAlign: "right",
                              }}
                            >
                              +${lineTotal.toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: C.gray50,
                    borderRadius: 12,
                    padding: "24px 20px",
                    textAlign: "center",
                    color: C.gray400,
                    fontSize: 14,
                    marginBottom: 32,
                  }}
                >
                  No add-ons available for this tour.
                </div>
              )}

              {/* Promo Code */}
              <div>
                <h3
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    color: C.gray900,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Tag size={18} style={{ color: C.brand }} />
                  Promo Code
                </h3>
                <div
                  style={{
                    background: C.white,
                    borderRadius: 12,
                    border: `1px solid ${C.gray200}`,
                    padding: "16px 20px",
                  }}
                >
                  {promoValidation?.valid ? (
                    <div>
                      <div
                        className="flex items-center justify-between"
                        style={{ marginBottom: 8 }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: C.successLight,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Check size={16} style={{ color: C.success }} />
                          </div>
                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                color: C.gray900,
                                fontSize: 14,
                              }}
                            >
                              {promoCode.toUpperCase()}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                color: C.success,
                                marginLeft: 8,
                              }}
                            >
                              {promoValidation.discount_description}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={removePromo}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                            color: C.gray400,
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.success,
                        }}
                      >
                        Saving ${discountAmount.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="flex gap-2"
                        style={{
                          animation: promoShake
                            ? "shake 0.5s ease-in-out"
                            : "none",
                        }}
                      >
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            if (promoValidation)
                              setPromoValidation(null);
                          }}
                          placeholder="Enter promo code"
                          style={{
                            flex: 1,
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: `1px solid ${
                              promoValidation && !promoValidation.valid
                                ? C.danger
                                : C.gray200
                            }`,
                            fontSize: 15,
                            color: C.gray900,
                            outline: "none",
                            background: C.white,
                            textTransform: "uppercase",
                          }}
                          onFocus={(e) =>
                            ((e.target as HTMLInputElement).style.borderColor =
                              C.brand)
                          }
                          onBlur={(e) =>
                            ((e.target as HTMLInputElement).style.borderColor =
                              C.gray200)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              validatePromo();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={validatePromo}
                          disabled={!promoCode.trim() || validatingPromo}
                          style={{
                            background: !promoCode.trim()
                              ? C.gray300
                              : C.brand,
                            color: "#fff",
                            padding: "10px 20px",
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 14,
                            border: "none",
                            cursor: !promoCode.trim()
                              ? "not-allowed"
                              : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {validatingPromo ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            "Apply"
                          )}
                        </button>
                      </div>
                      {promoValidation && !promoValidation.valid && (
                        <p
                          style={{
                            fontSize: 13,
                            color: C.danger,
                            marginTop: 8,
                            margin: "8px 0 0",
                          }}
                        >
                          {promoValidation.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <PrimaryBtn
                  type="submit"
                  disabled={submitting}
                  style={{ width: "100%", marginTop: 24 }}
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

            {/* Price Summary Sidebar */}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ShoppingCart size={18} style={{ color: C.brand }} />
                  Price Summary
                </h3>
                <div className="space-y-2 text-sm">
                  {/* Base price */}
                  <div className="flex justify-between">
                    <span style={{ color: C.gray500 }}>
                      Base: ${selectedProduct.price.toFixed(2)} x {partySize}{" "}
                      guest{partySize > 1 ? "s" : ""}
                    </span>
                    <span style={{ fontWeight: 600, color: C.gray900 }}>
                      ${basePrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Selected add-ons */}
                  {addons
                    .filter((a) => (addonQuantities[a.id] || 0) > 0)
                    .map((addon) => {
                      const qty = addonQuantities[addon.id] || 0;
                      const unitPrice = addon.per_person
                        ? addon.price * partySize
                        : addon.price;
                      return (
                        <div
                          key={addon.id}
                          className="flex justify-between"
                        >
                          <span style={{ color: C.gray500 }}>
                            {addon.name} x{qty}
                          </span>
                          <span
                            style={{ fontWeight: 600, color: C.gray900 }}
                          >
                            ${(unitPrice * qty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}

                  {/* Subtotal */}
                  {(addonsTotal > 0 || discountAmount > 0) && (
                    <>
                      <div
                        style={{
                          borderTop: `1px solid ${C.gray100}`,
                          paddingTop: 8,
                          marginTop: 4,
                        }}
                        className="flex justify-between"
                      >
                        <span style={{ color: C.gray500 }}>Subtotal</span>
                        <span
                          style={{ fontWeight: 600, color: C.gray900 }}
                        >
                          ${subtotalBeforeDiscount.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Discount */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: C.success }}>
                        Discount ({promoValidation?.discount_description})
                      </span>
                      <span
                        style={{ fontWeight: 600, color: C.success }}
                      >
                        -${discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Total */}
                  <div
                    style={{
                      borderTop: `1px solid ${C.gray200}`,
                      paddingTop: 10,
                      marginTop: 6,
                    }}
                    className="flex justify-between"
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: C.gray900,
                        fontSize: 15,
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: C.gray900,
                        fontSize: 15,
                      }}
                    >
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Deposit */}
                  <div
                    style={{
                      background: "#fef9ee",
                      marginLeft: -12,
                      marginRight: -12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                    className="flex justify-between"
                  >
                    <span style={{ color: C.gray700, fontWeight: 600 }}>
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

                {/* Mini booking info */}
                <div
                  style={{
                    borderTop: `1px solid ${C.gray100}`,
                    marginTop: 16,
                    paddingTop: 12,
                  }}
                >
                  <div
                    className="space-y-2"
                    style={{ fontSize: 13, color: C.gray500 }}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} style={{ color: C.brand }} />
                      {selectedProduct.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} style={{ color: C.brand }} />
                      {new Date(
                        selectedDate + "T00:00:00"
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at {formatTime(selectedSlot.start_time)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} style={{ color: C.brand }} />
                      {partySize} guest{partySize > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shake animation */}
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
              20%, 40%, 60%, 80% { transform: translateX(4px); }
            }
          `}</style>
        </div>
      )}

      {/* ---- STEP 6: Confirmation ---- */}
      {step === 6 && booking && selectedProduct && selectedDate && selectedSlot && (
        <div className="flex flex-col items-center text-center py-8">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: C.successLight,
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

              {/* Price breakdown */}
              <div
                style={{
                  borderTop: `1px solid ${C.gray100}`,
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <div className="flex justify-between mb-1">
                  <span style={{ color: C.gray500 }}>
                    Base (${selectedProduct.price.toFixed(2)} x {booking.party_size})
                  </span>
                  <span style={{ fontWeight: 600, color: C.gray900 }}>
                    ${basePrice.toFixed(2)}
                  </span>
                </div>
                {addons
                  .filter((a) => (addonQuantities[a.id] || 0) > 0)
                  .map((addon) => {
                    const qty = addonQuantities[addon.id] || 0;
                    const unitPrice = addon.per_person
                      ? addon.price * partySize
                      : addon.price;
                    return (
                      <div
                        key={addon.id}
                        className="flex justify-between mb-1"
                      >
                        <span style={{ color: C.gray500 }}>
                          {addon.name} x{qty}
                        </span>
                        <span style={{ fontWeight: 600, color: C.gray900 }}>
                          ${(unitPrice * qty).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                {discountAmount > 0 && (
                  <div className="flex justify-between mb-1">
                    <span style={{ color: C.success }}>
                      Discount ({promoValidation?.discount_description})
                    </span>
                    <span style={{ fontWeight: 600, color: C.success }}>
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
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

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
            {booking.manage_token && (
              <a
                href={`/book/manage/${booking.manage_token}`}
                style={{
                  background: C.white,
                  border: `1px solid ${C.gray200}`,
                  color: C.gray700,
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Manage Your Booking
              </a>
            )}
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
                setAddonQuantities({});
                setPromoCode("");
                setPromoValidation(null);
              }}
            >
              Book Another Tour
            </PrimaryBtn>
          </div>
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
