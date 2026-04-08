"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Save,
  X,
} from "lucide-react";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  total_bookings: number;
  total_spent: number;
  last_booking: string | null;
  tags: string | null;
}

interface CustomerDetail extends Customer {
  notes: string | null;
  first_booking: string | null;
  bookings: Booking[];
}

interface Booking {
  id: number;
  date: string;
  product_name: string;
  amount: number;
  status: string;
}

export default function CustomersPage() {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("last_booking");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", notes: "", tags: "" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCustomers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/customers?search=${encodeURIComponent(q)}&sort=${sort}&order=${order}`);
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch {
      addToast("Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  }, [sort, order, addToast]);

  useEffect(() => {
    loadCustomers(search);
  }, [sort, order]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(val), 400);
  };

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(order === "asc" ? "desc" : "asc");
    else { setSort(col); setOrder("desc"); }
  };

  const openDetail = async (c: Customer) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetchWithAuth(`/api/customers/${c.id}`);
      const data = await res.json();
      setDetail(data);
      setEditForm({
        name: data.name || "",
        phone: data.phone || "",
        notes: data.notes || "",
        tags: data.tags || "",
      });
    } catch {
      addToast("Failed to load customer", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/customers/${detail.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      addToast("Customer updated", "success");
      setDetailOpen(false);
      loadCustomers(search);
    } catch {
      addToast("Failed to save customer", "error");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Total Bookings", "Total Spent", "Last Booking", "Tags"];
    const rows = customers.map((c) => [
      c.name, c.email, c.phone || "", String(c.total_bookings),
      `$${(c.total_spent / 100).toFixed(2)}`, c.last_booking || "", c.tags || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />;
    return order === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-brand-light" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-light" />;
  };

  const inputCls = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-slate-900 mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={`${inputCls} pl-10`}
          placeholder="Search by name or email..."
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700">No customers found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium cursor-pointer select-none" onClick={() => toggleSort("total_bookings")}>
                    <span className="flex items-center gap-1">Bookings <SortIcon col="total_bookings" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium cursor-pointer select-none" onClick={() => toggleSort("total_spent")}>
                    <span className="flex items-center gap-1">Spent <SortIcon col="total_spent" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium cursor-pointer select-none" onClick={() => toggleSort("last_booking")}>
                    <span className="flex items-center gap-1">Last Booking <SortIcon col="last_booking" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="border-b border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-900 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-900">{c.email}</td>
                    <td className="px-4 py-3 text-slate-900">{c.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-900">{c.total_bookings}</td>
                    <td className="px-4 py-3 text-slate-900">${(c.total_spent / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-900">{c.last_booking || "-"}</td>
                    <td className="px-4 py-3">
                      {c.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.split(",").map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-brand/20 text-brand-light rounded-full text-xs">{t.trim()}</span>
                          ))}
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Customer Details" wide>
        {detailLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-slate-900">{detail.total_bookings}</div>
                <div className="text-xs text-slate-700">Total Bookings</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-slate-900">${(detail.total_spent / 100).toFixed(2)}</div>
                <div className="text-xs text-slate-700">Total Spent</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-slate-900">{detail.first_booking || "-"}</div>
                <div className="text-xs text-slate-700">First Booking</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tags (comma-separated)</label>
                <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className={inputCls} placeholder="vip, repeat, local" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className={`${inputCls} h-20 resize-none`} placeholder="Internal notes about this customer..." />
              </div>
            </div>

            {detail.bookings && detail.bookings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Booking History</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detail.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="text-slate-900">{b.product_name}</span>
                        <span className="text-slate-700 ml-2">{b.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-900">${(b.amount / 100).toFixed(2)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          b.status === "confirmed" ? "bg-green-100 text-success" :
                          b.status === "cancelled" ? "bg-danger/20 text-danger" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button onClick={() => setDetailOpen(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
