"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  ChevronLeft,
  ChevronRight,
  CalendarX,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
}

interface BlackoutDate {
  id: number;
  date: string;
  product_id: number | null;
  product_name?: string;
  reason: string | null;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function BlackoutDatesPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [filterProduct, setFilterProduct] = useState<string>("");

  // Quick add state
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [quickReason, setQuickReason] = useState("");
  const [quickProduct, setQuickProduct] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  // Bulk add state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    date_from: "",
    date_to: "",
    product_id: "",
    reason: "",
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadBlackouts();
  }, [year, month, filterProduct]);

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {}
  };

  const loadBlackouts = async () => {
    setLoading(true);
    try {
      const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      let url = `/api/blackout-dates?date_from=${dateFrom}&date_to=${dateTo}`;
      if (filterProduct) url += `&product_id=${filterProduct}`;
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (Array.isArray(data)) setBlackouts(data);
    } catch {
      addToast("Failed to load blackout dates", "error");
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

  const formatDate = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const blackoutsForDate = (dateStr: string) =>
    blackouts.filter((b) => b.date === dateStr);

  const blackoutCount = blackouts.length;

  const handleQuickAdd = async () => {
    if (!quickDate) return;
    setQuickSaving(true);
    try {
      const res = await fetchWithAuth("/api/blackout-dates", {
        method: "POST",
        body: JSON.stringify({
          date: quickDate,
          product_id: quickProduct ? parseInt(quickProduct) : null,
          reason: quickReason || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Blackout date added", "success");
      setQuickDate(null);
      setQuickReason("");
      setQuickProduct("");
      loadBlackouts();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setQuickSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/blackout-dates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Blackout date removed", "success");
      loadBlackouts();
    } catch {
      addToast("Failed to remove blackout date", "error");
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.date_from || !bulkForm.date_to) {
      addToast("Please select date range", "error");
      return;
    }
    setBulkSaving(true);
    try {
      const dates: string[] = [];
      const from = new Date(bulkForm.date_from + "T00:00:00");
      const to = new Date(bulkForm.date_to + "T00:00:00");
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }

      // Create each blackout date
      let created = 0;
      for (const date of dates) {
        const res = await fetchWithAuth("/api/blackout-dates", {
          method: "POST",
          body: JSON.stringify({
            date,
            product_id: bulkForm.product_id ? parseInt(bulkForm.product_id) : null,
            reason: bulkForm.reason || null,
          }),
        });
        if (res.ok) created++;
      }

      addToast(`Added ${created} blackout date${created !== 1 ? "s" : ""}`, "success");
      setBulkOpen(false);
      setBulkForm({ date_from: "", date_to: "", product_id: "", reason: "" });
      loadBlackouts();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDateClick = (dateStr: string) => {
    const existing = blackoutsForDate(dateStr);
    if (existing.length > 0) {
      // If there are blackouts, show them for removal
      if (existing.length === 1) {
        if (confirm(`Remove blackout on ${dateStr}? (${existing[0].reason || "No reason"})`)) {
          handleRemove(existing[0].id);
        }
      } else {
        // Multiple blackouts - just set as quick date for viewing
        setQuickDate(dateStr);
      }
    } else {
      setQuickDate(dateStr);
      setQuickReason("");
      setQuickProduct(filterProduct);
    }
  };

  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

  const inputCls =
    "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-slate-900 mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <CalendarX className="w-6 h-6 text-brand-light" />
          Blackout Dates
          <span className="text-sm font-normal text-slate-700">
            ({blackoutCount} this month)
          </span>
        </h1>
        <button
          onClick={() => setBulkOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Bulk Add
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-slate-900 min-w-36 text-center">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-brand"
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
          {/* Calendar */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
            <div className="grid grid-cols-7 gap-px">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-slate-700 py-2">
                  {d}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`e-${i}`} className="aspect-square" />;
                }
                const dateStr = formatDate(day);
                const dayBlackouts = blackoutsForDate(dateStr);
                const isBlacked = dayBlackouts.length > 0;
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const isSelected = quickDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateClick(dateStr)}
                    className={`aspect-square p-1.5 rounded-lg text-left flex flex-col transition-colors ${
                      isBlacked
                        ? "bg-danger/20 border border-danger/40 hover:bg-danger/30"
                        : isSelected
                        ? "bg-brand/20 border border-brand"
                        : isToday
                        ? "bg-slate-100 border border-slate-200"
                        : "hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isBlacked
                          ? "text-danger"
                          : isToday
                          ? "text-brand-light"
                          : "text-slate-900"
                      }`}
                    >
                      {day}
                    </span>
                    {isBlacked && (
                      <div className="mt-auto">
                        <CalendarX className="w-3 h-3 text-danger" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {quickDate ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-900">{quickDate}</h2>
                  <button
                    onClick={() => setQuickDate(null)}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-700" />
                  </button>
                </div>

                {/* Existing blackouts for this date */}
                {blackoutsForDate(quickDate).length > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="text-xs font-medium text-slate-700 uppercase">Existing Blackouts</div>
                    {blackoutsForDate(quickDate).map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-red-50 rounded-lg p-2.5 border border-danger/20">
                        <div>
                          <div className="text-sm text-slate-900">{b.product_name || "All Products"}</div>
                          {b.reason && <div className="text-xs text-slate-700">{b.reason}</div>}
                        </div>
                        <button
                          onClick={() => handleRemove(b.id)}
                          className="p-1 hover:bg-danger/20 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick add form */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="text-xs font-medium text-slate-700 uppercase">Add Blackout</div>
                  <div>
                    <label className={labelCls}>Product</label>
                    <select
                      value={quickProduct}
                      onChange={(e) => setQuickProduct(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">All Products</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Reason</label>
                    <input
                      type="text"
                      value={quickReason}
                      onChange={(e) => setQuickReason(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Holiday, Maintenance..."
                    />
                  </div>
                  <button
                    onClick={handleQuickAdd}
                    disabled={quickSaving}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-danger hover:bg-danger/80 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <CalendarX className="w-4 h-4" />
                    {quickSaving ? "Adding..." : "Block This Date"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarX className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-slate-700">Click a date to add or remove a blackout.</p>
                <p className="text-xs text-slate-600 mt-1">Red dates are currently blocked.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Add Blackout Dates" wide>
        <form onSubmit={handleBulkAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
              <label className={labelCls}>Product</label>
              <select
                value={bulkForm.product_id}
                onChange={(e) => setBulkForm({ ...bulkForm, product_id: e.target.value })}
                className={inputCls}
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Reason</label>
              <input
                type="text"
                value={bulkForm.reason}
                onChange={(e) => setBulkForm({ ...bulkForm, reason: e.target.value })}
                className={inputCls}
                placeholder="e.g. Holiday break, Seasonal closure..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkSaving}
              className="px-4 py-2 text-sm bg-danger hover:bg-danger/80 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {bulkSaving ? "Adding..." : "Block Date Range"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
