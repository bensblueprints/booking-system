"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import {
  Store,
  Minus,
  Plus,
  CheckCircle,
  Printer,
  ArrowLeft,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
}

interface Slot {
  id: number;
  start_time: string;
  end_time?: string;
  available: number;
}

interface BookingResult {
  booking_ref: string;
  product_name: string;
  slot_time: string;
  customer_name: string;
  party_size: number;
  amount: number;
  payment_method: string;
}

export default function WalkinPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const fetchSlots = useCallback(async (productId: number) => {
    setLoadingSlots(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetchWithAuth(`/api/slots?product_id=${productId}&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.slots || [];
        setSlots(list.filter((s: Slot) => s.available > 0));
      }
    } catch {
      addToast("Failed to load slots", "error");
    } finally {
      setLoadingSlots(false);
    }
  }, [addToast]);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedSlot(null);
    setAmount((product.price * partySize).toFixed(2));
    fetchSlots(product.id);
  };

  useEffect(() => {
    if (selectedProduct) {
      setAmount((selectedProduct.price * partySize).toFixed(2));
    }
  }, [partySize, selectedProduct]);

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedSlot || !customerName) {
      addToast("Please fill in all required fields", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/walkin", {
        method: "POST",
        body: JSON.stringify({
          product_id: selectedProduct.id,
          slot_id: selectedSlot.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          party_size: partySize,
          payment_method: paymentMethod,
          amount: parseFloat(amount),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking({
          booking_ref: data.booking_ref || data.ref || "N/A",
          product_name: selectedProduct.name,
          slot_time: selectedSlot.start_time,
          customer_name: customerName,
          party_size: partySize,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
        });
        addToast("Booking created!", "success");
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || "Failed to create booking", "error");
      }
    } catch {
      addToast("Failed to create booking", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>Receipt</title>
          <style>body{font-family:monospace;padding:20px;max-width:300px;margin:0 auto}
          h2{text-align:center;margin-bottom:20px}
          .line{display:flex;justify-content:space-between;margin:4px 0}
          .divider{border-top:1px dashed #000;margin:10px 0}
          .total{font-weight:bold;font-size:1.1em}
          .center{text-align:center}</style></head><body>
          <h2>Booking Receipt</h2>
          <div class="divider"></div>
          <div class="line"><span>Ref:</span><span>${booking?.booking_ref}</span></div>
          <div class="line"><span>Product:</span><span>${booking?.product_name}</span></div>
          <div class="line"><span>Time:</span><span>${booking?.slot_time}</span></div>
          <div class="line"><span>Customer:</span><span>${booking?.customer_name}</span></div>
          <div class="line"><span>Party Size:</span><span>${booking?.party_size}</span></div>
          <div class="divider"></div>
          <div class="line total"><span>Total:</span><span>$${booking?.amount.toFixed(2)}</span></div>
          <div class="line"><span>Payment:</span><span>${booking?.payment_method}</span></div>
          <div class="divider"></div>
          <p class="center">Thank you!</p>
          </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const reset = () => {
    setBooking(null);
    setSelectedProduct(null);
    setSelectedSlot(null);
    setCustomerName("");
    setCustomerPhone("");
    setPartySize(1);
    setPaymentMethod("cash");
    setAmount("");
  };

  // Success screen
  if (booking) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center" ref={receiptRef}>
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <div className="text-4xl font-mono font-bold text-brand mb-6">{booking.booking_ref}</div>
          <div className="space-y-2 text-sm text-left max-w-xs mx-auto">
            <div className="flex justify-between"><span className="text-slate-700">Product:</span><span className="text-slate-900">{booking.product_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-700">Time:</span><span className="text-slate-900">{booking.slot_time}</span></div>
            <div className="flex justify-between"><span className="text-slate-700">Customer:</span><span className="text-slate-900">{booking.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-700">Party Size:</span><span className="text-slate-900">{booking.party_size}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-700">Total:</span>
              <span className="text-slate-900 font-bold text-lg">${booking.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-700">Payment:</span><span className="text-slate-900 capitalize">{booking.payment_method}</span></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand/80 text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-3">
        <Store className="w-7 h-7 text-brand" /> Walk-in Booking
      </h1>

      {/* Product Selection */}
      <div>
        <label className="block text-sm text-slate-700 mb-2">Select Product</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => selectProduct(product)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                selectedProduct?.id === product.id
                  ? "bg-brand/20 border-brand text-slate-900"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="font-medium text-slate-900">{product.name}</div>
              <div className="text-lg font-bold text-brand mt-1">${product.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Slot Selection */}
      {selectedProduct && (
        <div>
          <label className="block text-sm text-slate-700 mb-2">Available Slots — Today</label>
          {loadingSlots ? (
            <div className="text-slate-700 text-sm py-4">Loading slots...</div>
          ) : slots.length === 0 ? (
            <div className="text-slate-700 text-sm py-4">No available slots today</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedSlot?.id === slot.id
                      ? "bg-brand text-white border-brand"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {slot.start_time}
                  <div className="text-xs opacity-60">{slot.available} left</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Details */}
      {selectedSlot && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Customer Name *</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Phone (optional)</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="(555) 123-4567" />
            </div>
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-sm text-slate-700 mb-1">Party Size</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold w-12 text-center">{partySize}</span>
              <button
                onClick={() => setPartySize(partySize + 1)}
                className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Payment Method</label>
            <div className="flex gap-3">
              {[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "none", label: "No Payment" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    paymentMethod === opt.value
                      ? "bg-brand text-white border-brand"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-slate-700 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !customerName}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-slate-900 rounded-xl text-lg font-bold transition-colors"
          >
            {submitting ? "Processing..." : "Complete Booking"}
          </button>
        </div>
      )}
    </div>
  );
}
