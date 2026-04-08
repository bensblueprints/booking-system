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
  X,
  Truck,
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

interface Resource {
  id: number;
  name: string;
  type: string;
}

interface SlotResource {
  id: number;
  resource_id: number;
  resource_name: string;
  resource_type: string;
}

interface TimeSlotEntry {
  id: number;
  start_time: string;
  end_time: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
let nextTimeSlotId = 1;

const resourceTypeColors: Record<string, string> = {
  boat: "bg-blue-500/20 text-blue-400",
  vehicle: "bg-green-500/20 text-green-400",
  guide: "bg-purple-500/20 text-purple-400",
  equipment: "bg-orange-500/20 text-orange-400",
};

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
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [slotResources, setSlotResources] = useState<Record<number, SlotResource[]>>({});
  const [assignResourceId, setAssignResourceId] = useState<string>("");

  const [bulkForm, setBulkForm] = useState({
    product_id: "",
    date_from: "",
    date_to: "",
    days: [0, 1, 2, 3, 4, 5, 6] as number[],
  });
  const [timeSlots, setTimeSlots] = useState<TimeSlotEntry[]>([
    { id: nextTimeSlotId++, start_time: "09:00", end_time: "11:00" },
  ]);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Quick add (single day)
  const [quickForm, setQuickForm] = useState({ product_id: "", start_time: "09:00", end_time: "11:00" });
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    loadProducts();
    loadResources();
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

  const loadResources = async () => {
    try {
      const res = await fetchWithAuth("/api/resources");
      const data = await res.json();
      if (Array.isArray(data)) setResources(data.filter((r: Resource & { active?: boolean }) => r.active !== false));
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

  const loadSlotResources = async (slotId: number) => {
    try {
      const res = await fetchWithAuth(`/api/slots/${slotId}/resources`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSlotResources((prev) => ({ ...prev, [slotId]: data }));
      }
    } catch {}
  };

  const assignResource = async (slotId: number) => {
    if (!assignResourceId) return;
    try {
      const res = await fetchWithAuth(`/api/slots/${slotId}/resources`, {
        method: "POST",
        body: JSON.stringify({ resource_id: parseInt(assignResourceId) }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast("Resource assigned", "success");
      setAssignResourceId("");
      loadSlotResources(slotId);
    } catch {
      addToast("Failed to assign resource", "error");
    }
  };

  const removeResource = async (slotId: number, resourceId: number) => {
    try {
      const res = await fetchWithAuth(`/api/slots/${slotId}/resources`, {
        method: "DELETE",
        body: JSON.stringify({ resource_id: resourceId }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast("Resource removed", "success");
      loadSlotResources(slotId);
    } catch {
      addToast("Failed to remove resource", "error");
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

  /* ---- Time slot management ---- */
  const addTimeSlot = () => {
    setTimeSlots((prev) => [
      ...prev,
      { id: nextTimeSlotId++, start_time: "14:00", end_time: "16:00" },
    ]);
  };

  const removeTimeSlot = (id: number) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots((prev) => prev.filter((ts) => ts.id !== id));
  };

  const updateTimeSlot = (id: number, field: "start_time" | "end_time", value: string) => {
    setTimeSlots((prev) =>
      prev.map((ts) => (ts.id === id ? { ...ts, [field]: value } : ts))
    );
  };

  /* ---- Bulk create ---- */
  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.product_id || !bulkForm.date_from || !bulkForm.date_to || bulkForm.days.length === 0) {
      addToast("Fill in all fields and select at least one day", "error");
      return;
    }
    if (timeSlots.length === 0) {
      addToast("Add at least one time slot", "error");
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
          time_slots: timeSlots.map((ts) => ({
            start_time: ts.start_time,
            end_time: ts.end_time,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      const totalSlots = dates.length * timeSlots.length;
      addToast(`Created ${totalSlots} slots (${dates.length} days x ${timeSlots.length} time slots/day)`, "success");
      setBulkOpen(false);
      loadSlots();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setBulkSaving(false);
    }
  };

  /* ---- Quick add (single day from sidebar) ---- */
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !quickForm.product_id) return;

    setQuickSaving(true);
    try {
      const res = await fetchWithAuth("/api/slots", {
        method: "POST",
        body: JSON.stringify({
          product_id: parseInt(quickForm.product_id),
          dates: [selectedDate],
          start_time: quickForm.start_time,
          end_time: quickForm.end_time,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      addToast("Slot added", "success");
      setQuickAddOpen(false);
      loadSlots();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setQuickSaving(false);
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
    "w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1";

  const selectedSlots = selectedDate ? slotsForDate(selectedDate) : [];

  // Load resources for visible slots when a date is selected
  useEffect(() => {
    if (selectedDate) {
      const daySlots = slotsForDate(selectedDate);
      daySlots.forEach((s) => {
        if (!slotResources[s.id]) loadSlotResources(s.id);
      });
    }
  }, [selectedDate, slots]); // eslint-disable-line react-hooks/exhaustive-deps

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

          {/* Day detail sidebar */}
          <div className="bg-surface-light rounded-xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-light" />
                {selectedDate || "Select a day"}
              </h2>
              {selectedDate && (
                <button
                  onClick={() => { setQuickAddOpen(true); setQuickForm({ ...quickForm, product_id: products[0]?.id?.toString() || "" }); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Slot
                </button>
              )}
            </div>

            {selectedDate && selectedSlots.length === 0 && (
              <p className="text-sm text-gray-400">No slots for this day.</p>
            )}
            <div className="space-y-3">
              {selectedSlots.map((slot) => {
                const sr = slotResources[slot.id] || [];
                return (
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

                    {/* Resources section */}
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Truck className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500 font-medium">Resources</span>
                      </div>
                      {sr.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {sr.map((r) => (
                            <span key={r.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${resourceTypeColors[r.resource_type] || "bg-gray-500/20 text-gray-400"}`}>
                              {r.resource_name}
                              <button onClick={() => removeResource(slot.id, r.resource_id)} className="hover:text-danger ml-0.5" title="Remove">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <select
                          value={assignResourceId}
                          onChange={(e) => setAssignResourceId(e.target.value)}
                          className="flex-1 px-2 py-1 bg-surface border border-white/10 rounded text-white text-xs focus:outline-none focus:border-brand"
                        >
                          <option value="">Assign resource...</option>
                          {resources
                            .filter((r) => !sr.some((s) => s.resource_id === r.id))
                            .map((r) => (
                              <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                            ))}
                        </select>
                        <button
                          onClick={() => assignResource(slot.id)}
                          disabled={!assignResourceId}
                          className="px-2 py-1 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded transition-colors disabled:opacity-30"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick add form (inline) */}
            {quickAddOpen && selectedDate && (
              <form onSubmit={handleQuickAdd} className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <div className="text-xs font-medium text-gray-300 mb-2">Add slot for {selectedDate}</div>
                <select
                  value={quickForm.product_id}
                  onChange={(e) => setQuickForm({ ...quickForm, product_id: e.target.value })}
                  className={inputCls}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={quickForm.start_time}
                    onChange={(e) => setQuickForm({ ...quickForm, start_time: e.target.value })}
                    className={inputCls}
                    required
                  />
                  <input
                    type="time"
                    value={quickForm.end_time}
                    onChange={(e) => setQuickForm({ ...quickForm, end_time: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={quickSaving}
                    className="flex-1 px-3 py-1.5 text-xs bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {quickSaving ? "Adding..." : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(false)}
                    className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
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

          {/* Multiple daily time slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Daily Time Slots *</label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Time
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Add multiple time slots if this product runs at different times each day (e.g., morning and afternoon).
            </p>
            <div className="space-y-2">
              {timeSlots.map((ts, idx) => (
                <div key={ts.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-6 shrink-0">#{idx + 1}</span>
                  <input
                    type="time"
                    value={ts.start_time}
                    onChange={(e) => updateTimeSlot(ts.id, "start_time", e.target.value)}
                    className={inputCls}
                    required
                  />
                  <span className="text-gray-500 text-sm shrink-0">to</span>
                  <input
                    type="time"
                    value={ts.end_time}
                    onChange={(e) => updateTimeSlot(ts.id, "end_time", e.target.value)}
                    className={inputCls}
                    required
                  />
                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(ts.id)}
                      className="p-1.5 text-gray-400 hover:text-danger hover:bg-white/5 rounded-lg transition-colors shrink-0"
                      title="Remove this time slot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {bulkForm.date_from && bulkForm.date_to && bulkForm.days.length > 0 && (
            <div className="bg-surface rounded-lg border border-white/5 p-3">
              <p className="text-xs text-gray-400">
                This will create <strong className="text-white">{timeSlots.length} slot{timeSlots.length > 1 ? "s" : ""} per day</strong> on
                {" "}{bulkForm.days.map((d) => DAY_LABELS[d]).join(", ")} from {bulkForm.date_from} to {bulkForm.date_to}.
              </p>
            </div>
          )}

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
