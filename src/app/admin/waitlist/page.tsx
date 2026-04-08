"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import { Bell, Trash2, Filter } from "lucide-react";

interface WaitlistEntry {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  product_name: string;
  product_id: number;
  slot_date: string;
  slot_time: string;
  party_size: number;
  status: string;
  seats_available: number;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
}

export default function WaitlistPage() {
  const { addToast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [filterStatus, filterProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {}
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterProduct) params.set("product_id", filterProduct);
      const qs = params.toString();
      const res = await fetchWithAuth(`/api/waitlist${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch {
      addToast("Failed to load waitlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNotify = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/waitlist/${id}/notify`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      addToast("Customer notified", "success");
      loadEntries();
    } catch {
      addToast("Failed to notify customer", "error");
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this waitlist entry?")) return;
    try {
      const res = await fetchWithAuth(`/api/waitlist/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Entry removed", "success");
      loadEntries();
    } catch {
      addToast("Failed to remove entry", "error");
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "bg-yellow-500/20 text-yellow-400",
      notified: "bg-blue-500/20 text-blue-400",
      booked: "bg-green-100 text-success",
      expired: "bg-slate-200 text-slate-700",
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[status] || "bg-slate-200 text-slate-700"}`}>{status}</span>;
  };

  const statuses = ["waiting", "notified", "booked", "expired"];

  const selectCls = "px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-brand";

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Waitlist</h1>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-slate-700" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className={selectCls}>
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700">No waitlist entries found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Product</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Date/Time</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Party</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Available</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Created</th>
                  <th className="text-right px-4 py-3 text-slate-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium">{e.customer_name}</div>
                      <div className="text-xs text-slate-700">{e.customer_email}</div>
                      {e.customer_phone && <div className="text-xs text-slate-600">{e.customer_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{e.product_name}</td>
                    <td className="px-4 py-3 text-slate-900">
                      <div>{e.slot_date}</div>
                      <div className="text-xs text-slate-700">{e.slot_time}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{e.party_size}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${e.seats_available >= e.party_size ? "text-success" : "text-danger"}`}>
                        {e.seats_available} seats
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(e.status)}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {e.status === "waiting" && (
                          <button onClick={() => handleNotify(e.id)} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors" title="Notify">
                            <Bell className="w-3.5 h-3.5" /> Notify
                          </button>
                        )}
                        <button onClick={() => handleRemove(e.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-700 hover:text-danger" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
