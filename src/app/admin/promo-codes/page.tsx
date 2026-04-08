"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Tag,
  Shuffle,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
}

interface PromoCode {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  product_id: number | null;
  product_name?: string;
  start_date: string | null;
  end_date: string | null;
  active: number;
}

const defaultForm = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  min_order: "0",
  max_uses: "",
  product_id: "",
  start_date: "",
  end_date: "",
  active: true,
};

export default function PromoCodesPage() {
  const { addToast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [promoRes, prodRes] = await Promise.all([
        fetchWithAuth("/api/promo-codes"),
        fetchWithAuth("/api/products"),
      ]);
      const promoData = await promoRes.json();
      const prodData = await prodRes.json();
      if (Array.isArray(promoData)) setPromoCodes(promoData);
      if (Array.isArray(prodData)) setProducts(prodData);
    } catch {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditId(p.id);
    setForm({
      code: p.code,
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      min_order: String(p.min_order || 0),
      max_uses: p.max_uses != null ? String(p.max_uses) : "",
      product_id: p.product_id != null ? String(p.product_id) : "",
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      active: !!p.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order: parseFloat(form.min_order) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        product_id: form.product_id ? parseInt(form.product_id) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        active: form.active ? 1 : 0,
      };

      const url = editId ? `/api/promo-codes/${editId}` : "/api/promo-codes";
      const method = editId ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      addToast(editId ? "Promo code updated" : "Promo code created", "success");
      setModalOpen(false);
      loadData();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: PromoCode) => {
    try {
      const res = await fetchWithAuth(`/api/promo-codes/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: p.active ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast(p.active ? "Promo code deactivated" : "Promo code activated", "success");
      loadData();
    } catch {
      addToast("Failed to toggle promo code", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this promo code?")) return;
    try {
      const res = await fetchWithAuth(`/api/promo-codes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Promo code deleted", "success");
      loadData();
    } catch {
      addToast("Failed to delete promo code", "error");
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Tag className="w-6 h-6 text-brand-light" />
          Promo Codes
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Promo Code
        </button>
      </div>

      {promoCodes.length === 0 ? (
        <div className="bg-surface-light rounded-xl border border-white/10 p-12 text-center">
          <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No promo codes yet. Create your first one to get started.</p>
        </div>
      ) : (
        <div className="bg-surface-light rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Min Order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Uses</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Date Range</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-white bg-surface px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {p.discount_type === "percent" ? "%" : "$"}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {p.discount_type === "percent" ? `${p.discount_value}%` : `$${p.discount_value}`}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {p.min_order ? `$${p.min_order}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {p.used_count || 0}/{p.max_uses != null ? p.max_uses : "\u221E"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {p.product_name || "All"}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {p.start_date || p.end_date
                        ? `${p.start_date || "..."} - ${p.end_date || "..."}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.active
                            ? "bg-success/20 text-success"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggle(p)}
                          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                          title={p.active ? "Deactivate" : "Activate"}
                        >
                          {p.active ? (
                            <ToggleRight className="w-4 h-4 text-success" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Promo Code" : "New Promo Code"}
        wide
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={`${inputCls} flex-1 font-mono`}
                  placeholder="SUMMER20"
                  required
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors shrink-0"
                >
                  <Shuffle className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Discount Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                className={inputCls}
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Discount Value *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className={inputCls}
                placeholder={form.discount_type === "percent" ? "20" : "10.00"}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Minimum Order ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.min_order}
                onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                className={inputCls}
                placeholder="Unlimited"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Product (optional)</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className={inputCls}
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 accent-brand"
                />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
