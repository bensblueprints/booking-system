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
  PackagePlus,
  GripVertical,
  Users,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
}

interface Addon {
  id: number;
  name: string;
  description: string | null;
  price: number;
  product_id: number | null;
  product_name?: string;
  max_quantity: number;
  per_person: number;
  sort_order: number;
  active: number;
}

const defaultForm = {
  name: "",
  description: "",
  price: "",
  product_id: "",
  max_quantity: "10",
  per_person: false,
  sort_order: "0",
  active: true,
};

export default function AddonsPage() {
  const { addToast } = useToast();
  const [addons, setAddons] = useState<Addon[]>([]);
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
      const [addonsRes, prodRes] = await Promise.all([
        fetchWithAuth("/api/addons"),
        fetchWithAuth("/api/products"),
      ]);
      const addonsData = await addonsRes.json();
      const prodData = await prodRes.json();
      if (Array.isArray(addonsData)) setAddons(addonsData);
      if (Array.isArray(prodData)) setProducts(prodData);
    } catch {
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (a: Addon) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      description: a.description || "",
      price: String(a.price),
      product_id: a.product_id != null ? String(a.product_id) : "",
      max_quantity: String(a.max_quantity),
      per_person: !!a.per_person,
      sort_order: String(a.sort_order),
      active: !!a.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        product_id: form.product_id ? parseInt(form.product_id) : null,
        max_quantity: parseInt(form.max_quantity) || 10,
        per_person: form.per_person ? 1 : 0,
        sort_order: parseInt(form.sort_order) || 0,
        active: form.active ? 1 : 0,
      };

      const url = editId ? `/api/addons/${editId}` : "/api/addons";
      const method = editId ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      addToast(editId ? "Add-on updated" : "Add-on created", "success");
      setModalOpen(false);
      loadData();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Addon) => {
    try {
      const res = await fetchWithAuth(`/api/addons/${a.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: a.active ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast(a.active ? "Add-on deactivated" : "Add-on activated", "success");
      loadData();
    } catch {
      addToast("Failed to toggle add-on", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this add-on?")) return;
    try {
      const res = await fetchWithAuth(`/api/addons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Add-on deleted", "success");
      loadData();
    } catch {
      addToast("Failed to delete add-on", "error");
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
          <PackagePlus className="w-6 h-6 text-brand-light" />
          Add-ons
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Add-on
        </button>
      </div>

      {addons.length === 0 ? (
        <div className="bg-surface-light rounded-xl border border-white/10 p-12 text-center">
          <PackagePlus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No add-ons yet. Create your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {addons.map((a) => (
            <div
              key={a.id}
              className="bg-surface-light rounded-xl border border-white/10 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-white">{a.name}</div>
                    {a.per_person ? (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-brand/20 text-brand-light rounded-full">
                        <Users className="w-3 h-3" /> Per Person
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    ${a.price.toFixed(2)}{a.per_person ? "/person" : ""} | Max qty: {a.max_quantity}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    a.active
                      ? "bg-success/20 text-success"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {a.active ? "Active" : "Inactive"}
                </span>
              </div>

              {a.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{a.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto mb-3">
                <GripVertical className="w-3 h-3" />
                Sort: {a.sort_order}
                <span className="mx-1">|</span>
                Product: {a.product_name || "All"}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => openEdit(a)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggle(a)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {a.active ? (
                    <><ToggleRight className="w-3.5 h-3.5" /> Deactivate</>
                  ) : (
                    <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger bg-white/5 hover:bg-danger/10 rounded-lg transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Add-on" : "New Add-on"}
        wide
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Photography Package"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputCls} h-20 resize-none`}
                placeholder="Optional description..."
              />
            </div>
            <div>
              <label className={labelCls}>Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
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
              <label className={labelCls}>Max Quantity</label>
              <input
                type="number"
                min="1"
                value={form.max_quantity}
                onChange={(e) => setForm({ ...form, max_quantity: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.per_person}
                  onChange={(e) => setForm({ ...form, per_person: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 accent-brand"
                />
                <div>
                  <span className="text-sm text-gray-300">Multiply by party size</span>
                  <div className="text-xs text-gray-500">Price is per person</div>
                </div>
              </label>
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
