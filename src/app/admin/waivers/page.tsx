"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, Eye, FileSignature } from "lucide-react";

interface Waiver {
  id: number;
  name: string;
  content_html: string;
  product_id: number | null;
  product_name: string | null;
  required: boolean;
  active: boolean;
  signatures_count: number;
}

interface WaiverSignature {
  id: number;
  customer_name: string;
  booking_reference: string;
  signed_at: string;
}

interface Product {
  id: number;
  name: string;
}

const defaultForm = {
  name: "",
  content_html: "",
  product_id: "",
  required: true,
  active: true,
};

export default function WaiversPage() {
  const { addToast } = useToast();
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [signatures, setSignatures] = useState<WaiverSignature[]>([]);
  const [sigLoading, setSigLoading] = useState(false);
  const [sigWaiverName, setSigWaiverName] = useState("");

  useEffect(() => {
    loadWaivers();
    loadProducts();
  }, []);

  const loadWaivers = async () => {
    try {
      const res = await fetchWithAuth("/api/waivers");
      const data = await res.json();
      if (Array.isArray(data)) setWaivers(data);
    } catch {
      addToast("Failed to load waivers", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {}
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (w: Waiver) => {
    setEditId(w.id);
    setForm({
      name: w.name,
      content_html: w.content_html,
      product_id: w.product_id ? String(w.product_id) : "",
      required: w.required,
      active: w.active,
    });
    setModalOpen(true);
  };

  const viewSignatures = async (w: Waiver) => {
    setSigWaiverName(w.name);
    setSigModalOpen(true);
    setSigLoading(true);
    try {
      const res = await fetchWithAuth(`/api/waivers/${w.id}/signatures`);
      const data = await res.json();
      if (Array.isArray(data)) setSignatures(data);
      else setSignatures([]);
    } catch {
      addToast("Failed to load signatures", "error");
    } finally {
      setSigLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        content_html: form.content_html,
        product_id: form.product_id ? parseInt(form.product_id) : null,
        required: form.required,
        active: form.active,
      };
      const url = editId ? `/api/waivers/${editId}` : "/api/waivers";
      const method = editId ? "PUT" : "POST";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      addToast(editId ? "Waiver updated" : "Waiver created", "success");
      setModalOpen(false);
      loadWaivers();
    } catch {
      addToast("Failed to save waiver", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this waiver?")) return;
    try {
      const res = await fetchWithAuth(`/api/waivers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Waiver deleted", "success");
      loadWaivers();
    } catch {
      addToast("Failed to delete waiver", "error");
    }
  };

  const inputCls = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-slate-900 mb-1";

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
        <h1 className="text-2xl font-bold text-slate-900">Waivers</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Waiver
        </button>
      </div>

      {waivers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700">No waivers yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Product</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Required</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Signatures</th>
                  <th className="text-right px-4 py-3 text-slate-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {waivers.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                    <td className="px-4 py-3 text-slate-900 font-medium">{w.name}</td>
                    <td className="px-4 py-3 text-slate-900">{w.product_name || "All Products"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${w.required ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-200 text-slate-700"}`}>
                        {w.required ? "Required" : "Optional"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${w.active ? "bg-green-100 text-success" : "bg-slate-200 text-slate-700"}`}>
                        {w.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{w.signatures_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => viewSignatures(w)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-brand" title="View Signatures">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(w)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-brand" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-700 hover:text-danger" title="Delete">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Waiver" : "New Waiver"} wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Waiver Content (HTML)</label>
            <textarea value={form.content_html} onChange={(e) => setForm({ ...form, content_html: e.target.value })} className={`${inputCls} h-48 resize-y font-mono text-xs`} placeholder="<h2>Waiver of Liability</h2><p>...</p>" />
          </div>
          <div>
            <label className={labelCls}>Product (optional)</label>
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={inputCls}>
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="w-4 h-4 rounded border-slate-300 accent-brand" />
              <span className="text-sm text-slate-900">Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 accent-brand" />
              <span className="text-sm text-slate-900">Active</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={sigModalOpen} onClose={() => setSigModalOpen(false)} title={`Signatures: ${sigWaiverName}`} wide>
        {sigLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : signatures.length === 0 ? (
          <p className="text-sm text-slate-700">No signatures yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {signatures.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{s.customer_name}</div>
                  <div className="text-xs text-slate-700">Booking: {s.booking_reference}</div>
                </div>
                <div className="text-xs text-slate-700">{new Date(s.signed_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
