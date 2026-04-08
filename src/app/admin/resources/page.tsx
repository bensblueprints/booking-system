"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";

interface Resource {
  id: number;
  name: string;
  type: string;
  capacity: number | null;
  notes: string | null;
  active: boolean;
}

const RESOURCE_TYPES = ["boat", "vehicle", "guide", "equipment"];

const defaultForm = {
  name: "",
  type: "boat",
  capacity: "",
  notes: "",
  active: true,
};

export default function ResourcesPage() {
  const { addToast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const res = await fetchWithAuth("/api/resources");
      const data = await res.json();
      if (Array.isArray(data)) setResources(data);
    } catch {
      addToast("Failed to load resources", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditId(r.id);
    setForm({
      name: r.name,
      type: r.type,
      capacity: r.capacity ? String(r.capacity) : "",
      notes: r.notes || "",
      active: r.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        notes: form.notes || null,
        active: form.active,
      };
      const url = editId ? `/api/resources/${editId}` : "/api/resources";
      const method = editId ? "PUT" : "POST";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      addToast(editId ? "Resource updated" : "Resource created", "success");
      setModalOpen(false);
      loadResources();
    } catch {
      addToast("Failed to save resource", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resource?")) return;
    try {
      const res = await fetchWithAuth(`/api/resources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Resource deleted", "success");
      loadResources();
    } catch {
      addToast("Failed to delete resource", "error");
    }
  };

  const typeIcon = (type: string) => {
    const colors: Record<string, string> = {
      boat: "bg-blue-500/20 text-blue-400",
      vehicle: "bg-green-500/20 text-green-400",
      guide: "bg-purple-500/20 text-purple-400",
      equipment: "bg-orange-500/20 text-orange-400",
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[type] || "bg-slate-200 text-slate-700"}`}>{type}</span>;
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
        <h1 className="text-2xl font-bold text-slate-900">Resources</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700">No resources yet. Add boats, vehicles, guides, or equipment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Capacity</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Notes</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-slate-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                    <td className="px-4 py-3 text-slate-900 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{typeIcon(r.type)}</td>
                    <td className="px-4 py-3 text-slate-900">{r.capacity || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{r.notes || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? "bg-green-100 text-success" : "bg-slate-200 text-slate-700"}`}>
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-brand" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-700 hover:text-danger" title="Delete">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Resource" : "New Resource"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Capacity</label>
            <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputCls} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} h-20 resize-none`} placeholder="Optional notes..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded border-slate-300 accent-brand" />
            <span className="text-sm text-slate-900">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
