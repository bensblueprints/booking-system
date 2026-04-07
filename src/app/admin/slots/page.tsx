"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  color: string;
}

interface Slot {
  id: number;
  product_id: number;
  date: string;
  start_time: string;
  end_time: string;
  total_seats: number;
  booked_seats: number;
  product_name: string;
  product_color: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SlotsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    product_id: "",
    date_from: "",
    date_to: "",
    start_time: "09:00",
    end_time: "11:00",
    days: [0, 1, 2, 3, 4] as number[],
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadSlots();
  }, [year, month, filterProduct]);

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {}
  };

  const loadSlots = async () => {
    setLoading(true);
    try {
      const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      let url = `/api/slots?date_from=${dateFrom}&date_to=${dateTo}`;
      if (filterProduct) url += `&product_id=${filterProduct}`;

      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (Array.isArray(data)) setSlots(data);
    } catch {
      addToast("Failed to load slots", "error");
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const slotsForDate = (dateStr: string) => slots.filter((s) => s.date === dateStr);

  const formatDate = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const handleDeleteSlot = async (id: number) => {
    if (!confirm("Delete this slot?")) return;
    try {
      const res = await fetchWithAuth(`/api/slots/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Slot deleted", "success");
      loadSlots();
    } catch (err) {
      addToast((err as Error).message, "error");
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.product_id || !bulkForm.date_from || !bulkForm.date_to || bulkForm.days.length === 0) {
      addToast("Fill in all fields and select at least one day", "error");
      return;
    }

    setBulkSaving(true);
    try {
      const dates: string[] = [];
      const from = new Date(bulkForm.date_from + "T00:00:00");
      const to = new Date(bulkForm.date_to + "T00:00:00");

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const ourDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        if (bulkForm.days.includes(ourDay)) {
          dates.push(d.toISOString().split("T")[0]);
        }
      }

      if (dates.length === 0) {
        addToast("No matching dates found in range", "error");
        setBulkSaving(false);
        return;
      }

      const res = await fetchWithAuth("/api/slots", {
        method: "POST",
        body: JSON.stringify({
          product_id: parseInt(bulkForm.product_id),
          dates,
          start_time: bulkForm.start_time,
          end_time: bulkForm.end_time,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      addToast(`Created ${dates.length} slots`, "success");
      setBulkOpen(false);
      loadSlots();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setBulkForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

  const inputCls =
    "w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1";

  const selectedSlots = selectedDate ? slotsForDate(selectedDate) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Slots & Calendar</h1>
        <button
          onClick={() => setBulkOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Bulk Create Slots
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-white min-w-36 text-center">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="px-3 py-2 bg-surface-light border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-surface-light rounded-xl border border-white/10 p-4">
            <div className="grid grid-cols-7 gap-px">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                  {d}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`e-${i}`} className="aspect-square" />;
                }
                const dateStr = formatDate(day);
                const daySlots = slotsForDate(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().split("T")[0];

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square p-1 rounded-lg text-left flex flex-col transition-colors ${
                      isSelected
                        ? "bg-brand/20 border border-brand"
                        : isToday
                        ? "bg-white/5 border border-white/10"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isToday ? "text-brand-light" : "text-gray-300"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {daySlots.slice(0, 4).map((s) => (
                        <div
                          key={s.id}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.product_color || "#1B6B8A" }}
                          title={`${s.product_name} ${s.start_time}`}
                        />
                      ))}
                      {daySlots.length > 4 && (
                        <span className="text-[10px] text-gray-400">+{daySlots.length - 4}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-light rounded-xl border border-white/10 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-light" />
              {selectedDate || "Select a day"}
            </h2>
            {selectedDate && selectedSlots.length === 0 && (
              <p className="text-sm text-gray-400">No slots for this day.</p>
            )}
            <div className="space-y-3">
              {selectedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-surface rounded-lg p-3 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-6 rounded-full"
                        style={{ backgroundColor: slot.product_color || "#1B6B8A" }}
                      />
                      <span className="text-sm font-medium text-white">{slot.product_name}</span>
                    </div>
                    {slot.booked_seats === 0 && (
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1 text-gray-400 hover:text-danger transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {slot.start_time} - {slot.end_time}
                  </div>
                  <div className="text-xs mt-1">
                    <span className={slot.booked_seats >= slot.total_seats ? "text-danger" : "text-success"}>
                      {slot.booked_seats}/{slot.total_seats} booked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Create Slots" wide>
        <form onSubmit={handleBulkCreate} className="space-y-4">
          <div>
            <label className={labelCls}>Product *</label>
            <select
              value={bulkForm.product_id}
              onChange={(e) => setBulkForm({ ...bulkForm, product_id: e.target.value })}
              className={inputCls}
              required
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>From Date *</label>
              <input
                type="date"
                value={bulkForm.date_from}
                onChange={(e) => setBulkForm({ ...bulkForm, date_from: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>To Date *</label>
              <input
                type="date"
                value={bulkForm.date_to}
                onChange={(e) => setBulkForm({ ...bulkForm, date_to: e.target.value })}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Recurring Days *</label>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    bulkForm.days.includes(idx)
                      ? "bg-brand text-white"
                      : "bg-surface border border-white/10 text-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Time *</label>
              <input
                type="time"
                value={bulkForm.start_time}
                onChange={(e) => setBulkForm({ ...bulkForm, start_time: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>End Time *</label>
              <input
                type="time"
                value={bulkForm.end_time}
                onChange={(e) => setBulkForm({ ...bulkForm, end_time: e.target.value })}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkSaving}
              className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {bulkSaving ? "Creating..." : "Create Slots"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
