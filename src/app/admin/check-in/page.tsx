"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import { CalendarDays, Printer, CheckCircle2, Circle } from "lucide-react";

interface Slot {
  id: number;
  product_name: string;
  product_color: string;
  start_time: string;
  end_time: string;
  total_seats: number;
  booked_seats: number;
}

interface ManifestEntry {
  booking_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  checked_in: boolean;
}

export default function CheckInPage() {
  const { addToast } = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);

  useEffect(() => {
    loadSlots();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSlots = async () => {
    setLoading(true);
    setSelectedSlot(null);
    setManifest([]);
    try {
      const res = await fetchWithAuth(`/api/slots?date_from=${date}&date_to=${date}`);
      const data = await res.json();
      if (Array.isArray(data)) setSlots(data);
    } catch {
      addToast("Failed to load slots", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadManifest = async (slot: Slot) => {
    setSelectedSlot(slot);
    setManifestLoading(true);
    try {
      const res = await fetchWithAuth(`/api/checkin/manifest/${slot.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setManifest(data);
    } catch {
      addToast("Failed to load manifest", "error");
    } finally {
      setManifestLoading(false);
    }
  };

  const toggleCheckIn = async (entry: ManifestEntry) => {
    try {
      const method = entry.checked_in ? "DELETE" : "POST";
      const res = await fetchWithAuth(`/api/checkin/${entry.booking_id}`, { method });
      if (!res.ok) throw new Error("Failed");
      setManifest((prev) =>
        prev.map((m) => m.booking_id === entry.booking_id ? { ...m, checked_in: !m.checked_in } : m)
      );
    } catch {
      addToast("Failed to update check-in", "error");
    }
  };

  const checkedCount = manifest.filter((m) => m.checked_in).reduce((sum, m) => sum + m.party_size, 0);
  const totalGuests = manifest.reduce((sum, m) => sum + m.party_size, 0);
  const progressPct = totalGuests > 0 ? (checkedCount / totalGuests) * 100 : 0;

  const handlePrint = () => window.print();

  const inputCls = "px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 no-print">
        <h1 className="text-2xl font-bold text-slate-900">Check-in Manifest</h1>
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-slate-700" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-2 no-print">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Slots for {date}</h2>
            {slots.length === 0 ? (
              <p className="text-sm text-slate-700">No slots on this day.</p>
            ) : slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => loadManifest(slot)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedSlot?.id === slot.id
                    ? "bg-brand/20 border-brand"
                    : "bg-white border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-5 rounded-full" style={{ backgroundColor: slot.product_color || "#1B6B8A" }} />
                  <span className="text-sm font-medium text-slate-900">{slot.product_name}</span>
                </div>
                <div className="text-xs text-slate-700">{slot.start_time} - {slot.end_time}</div>
                <div className="text-xs text-slate-700 mt-1">{slot.booked_seats}/{slot.total_seats} booked</div>
              </button>
            ))}
          </div>

          <div className="xl:col-span-2 print-area">
            {selectedSlot ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedSlot.product_name}</h2>
                    <p className="text-sm text-slate-700">{date} &middot; {selectedSlot.start_time} - {selectedSlot.end_time}</p>
                  </div>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-100 rounded-lg text-sm transition-colors no-print">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{checkedCount} of {totalGuests} guests checked in</span>
                    <span className="text-slate-900 font-medium">{Math.round(progressPct)}%</span>
                  </div>
                  <div className="w-full bg-slate-50 rounded-full h-2">
                    <div className="bg-success h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {manifestLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : manifest.length === 0 ? (
                  <p className="text-sm text-slate-700">No bookings for this slot.</p>
                ) : (
                  <div className="space-y-2">
                    {manifest.map((entry) => (
                      <div
                        key={entry.booking_id}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          entry.checked_in
                            ? "bg-success/10 border-success/30"
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <button onClick={() => toggleCheckIn(entry)} className="shrink-0 no-print">
                          {entry.checked_in ? (
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-600 hover:text-brand transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900">{entry.customer_name}</div>
                          <div className="text-xs text-slate-700">{entry.customer_email} {entry.customer_phone ? `| ${entry.customer_phone}` : ""}</div>
                        </div>
                        <div className="text-sm text-slate-900 shrink-0">
                          {entry.party_size} guest{entry.party_size !== 1 ? "s" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-700">Select a slot to view its check-in manifest.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
