"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Share2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  DollarSign,
  Users,
  CheckCircle,
} from "lucide-react";

interface Affiliate {
  id: number;
  name: string;
  email: string;
  code: string;
  commission_type: string;
  commission_value: number;
  bookings_count: number;
  revenue: number;
  commission_owed: number;
  active: boolean;
}

interface AffiliateBooking {
  id: number;
  booking_ref: string;
  customer_name: string;
  product_name: string;
  amount: number;
  commission: number;
  paid: boolean;
  created_at: string;
}

function formatCurrency(v: number) {
  return "$" + (v || 0).toFixed(2);
}

function generateCode() {
  return "AFF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const emptyForm = {
  name: "",
  email: "",
  code: "",
  commission_type: "percent",
  commission_value: "",
  active: true,
};

export default function AffiliatesPage() {
  const { addToast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showBookings, setShowBookings] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [bookings, setBookings] = useState<AffiliateBooking[]>([]);

  const fetchAffiliates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/affiliates");
      if (res.ok) {
        const data = await res.json();
        setAffiliates(Array.isArray(data) ? data : data.affiliates || []);
      }
    } catch {
      addToast("Failed to load affiliates", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAffiliates(); }, [fetchAffiliates]);

  const totalOwed = affiliates.reduce((s, a) => s + (a.commission_owed || 0), 0);
  const totalActive = affiliates.filter((a) => a.active).length;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, code: generateCode() });
    setShowModal(true);
  };

  const openEdit = (a: Affiliate) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      email: a.email,
      code: a.code,
      commission_type: a.commission_type,
      commission_value: a.commission_value.toString(),
      active: a.active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.commission_value) {
      addToast("Name, email, and commission value are required", "error");
      return;
    }
    const body = {
      name: form.name,
      email: form.email,
      code: form.code,
      commission_type: form.commission_type,
      commission_value: parseFloat(form.commission_value),
      active: form.active,
    };
    try {
      const url = editingId ? `/api/affiliates/${editingId}` : "/api/affiliates";
      const method = editingId ? "PUT" : "POST";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        addToast(editingId ? "Affiliate updated" : "Affiliate created", "success");
        setShowModal(false);
        fetchAffiliates();
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || "Failed to save affiliate", "error");
      }
    } catch {
      addToast("Failed to save affiliate", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this affiliate?")) return;
    try {
      const res = await fetchWithAuth(`/api/affiliates/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Affiliate deleted", "success");
        fetchAffiliates();
      }
    } catch {
      addToast("Failed to delete", "error");
    }
  };

  const viewBookings = async (a: Affiliate) => {
    setSelectedAffiliate(a);
    setShowBookings(true);
    try {
      const res = await fetchWithAuth(`/api/affiliates/${a.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      addToast("Failed to load bookings", "error");
    }
  };

  const markPaid = async (bookingId: number) => {
    try {
      const res = await fetchWithAuth(`/api/affiliates/${selectedAffiliate?.id}`, {
        method: "PUT",
        body: JSON.stringify({ mark_paid: bookingId }),
      });
      if (res.ok) {
        addToast("Commission marked as paid", "success");
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, paid: true } : b)));
        fetchAffiliates();
      }
    } catch {
      addToast("Failed to mark as paid", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Affiliates</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand hover:bg-brand/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Affiliate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-light border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-brand" />
          <div>
            <div className="text-xs text-gray-400">Active Affiliates</div>
            <div className="text-lg font-bold">{totalActive}</div>
          </div>
        </div>
        <div className="bg-surface-light border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-xs text-gray-400">Commission Owed</div>
            <div className="text-lg font-bold">{formatCurrency(totalOwed)}</div>
          </div>
        </div>
        <div className="bg-surface-light border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <Share2 className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-xs text-gray-400">Total Affiliates</div>
            <div className="text-lg font-bold">{affiliates.length}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-light border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Owed</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : affiliates.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No affiliates yet</td></tr>
              ) : (
                affiliates.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                    <td className="px-4 py-3 text-gray-400">{a.email}</td>
                    <td className="px-4 py-3 font-mono text-brand">{a.code}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {a.commission_type === "percent" ? `${a.commission_value}%` : `$${a.commission_value}`}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{a.bookings_count || 0}</td>
                    <td className="px-4 py-3 text-gray-400">{formatCurrency(a.revenue)}</td>
                    <td className="px-4 py-3 font-medium text-accent">{formatCurrency(a.commission_owed)}</td>
                    <td className="px-4 py-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${a.active ? "bg-green-400" : "bg-gray-500"}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => viewBookings(a)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="View Bookings">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Affiliate" : "Add Affiliate"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Affiliate Code</label>
            <div className="flex gap-2">
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm font-mono" />
              <button type="button" onClick={() => setForm({ ...form, code: generateCode() })} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">Generate</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Commission Type</label>
              <select value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Commission Value *</label>
              <input type="number" min="0" step="0.01" value={form.commission_value} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder={form.commission_type === "percent" ? "10" : "5.00"} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded border-white/10" />
            <span className="text-sm">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-brand hover:bg-brand/80 text-white rounded-lg text-sm font-medium transition-colors">
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bookings Modal */}
      <Modal open={showBookings} onClose={() => setShowBookings(false)} title={`Bookings — ${selectedAffiliate?.name || ""}`} wide>
        {bookings.length === 0 ? (
          <div className="py-8 text-center text-gray-400">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="pb-3 font-medium">Ref</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Commission</th>
                  <th className="pb-3 font-medium">Paid</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="py-2 font-mono text-white">{b.booking_ref}</td>
                    <td className="py-2 text-gray-400">{b.customer_name}</td>
                    <td className="py-2 text-gray-400">{b.product_name}</td>
                    <td className="py-2">{formatCurrency(b.amount)}</td>
                    <td className="py-2 font-medium text-accent">{formatCurrency(b.commission)}</td>
                    <td className="py-2">
                      {b.paid ? (
                        <span className="text-green-400 text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Unpaid</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-400">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      {!b.paid && (
                        <button onClick={() => markPaid(b.id)} className="text-xs text-brand hover:text-brand/80 transition-colors font-medium">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
