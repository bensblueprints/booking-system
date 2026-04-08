"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  FormInput,
  Plus,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
}

interface CustomField {
  id: number;
  label: string;
  field_type: string;
  options: string[] | null;
  product_id: number | null;
  product_name?: string;
  required: boolean;
  sort_order: number;
}

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

const emptyForm = {
  label: "",
  field_type: "text",
  options: "",
  product_id: "",
  required: false,
  sort_order: "0",
};

export default function CustomFieldsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPreview, setShowPreview] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch {}
  }, []);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const qs = productFilter ? `?product_id=${productFilter}` : "";
      const res = await fetchWithAuth(`/api/custom-fields${qs}`);
      if (res.ok) {
        const data = await res.json();
        setFields(Array.isArray(data) ? data : data.fields || []);
      }
    } catch {
      addToast("Failed to load custom fields", "error");
    } finally {
      setLoading(false);
    }
  }, [productFilter, addToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchFields(); }, [fetchFields]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (field: CustomField) => {
    setEditingId(field.id);
    setForm({
      label: field.label,
      field_type: field.field_type,
      options: (field.options || []).join(", "),
      product_id: field.product_id?.toString() || "",
      required: field.required,
      sort_order: field.sort_order.toString(),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label) {
      addToast("Label is required", "error");
      return;
    }
    const body: Record<string, unknown> = {
      label: form.label,
      field_type: form.field_type,
      product_id: form.product_id ? parseInt(form.product_id) : null,
      required: form.required,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (form.field_type === "select" && form.options) {
      body.options = form.options.split(/[,\n]/).map((o) => o.trim()).filter(Boolean);
    }
    try {
      const url = editingId ? `/api/custom-fields/${editingId}` : "/api/custom-fields";
      const method = editingId ? "PUT" : "POST";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        addToast(editingId ? "Field updated" : "Field created", "success");
        setShowModal(false);
        fetchFields();
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || "Failed to save field", "error");
      }
    } catch {
      addToast("Failed to save field", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this custom field?")) return;
    try {
      const res = await fetchWithAuth(`/api/custom-fields/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Field deleted", "success");
        fetchFields();
      }
    } catch {
      addToast("Failed to delete field", "error");
    }
  };

  // Preview renderer
  const renderPreview = (f: typeof form) => {
    switch (f.field_type) {
      case "text":
        return <input type="text" placeholder={f.label} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" readOnly />;
      case "textarea":
        return <textarea placeholder={f.label} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" readOnly />;
      case "select":
        return (
          <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" disabled>
            <option>Select {f.label}...</option>
            {f.options.split(/[,\n]/).map((o) => o.trim()).filter(Boolean).map((opt, i) => (
              <option key={i}>{opt}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-200" disabled />
            <span className="text-sm">{f.label}</span>
          </label>
        );
      case "number":
        return <input type="number" placeholder={f.label} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" readOnly />;
      case "date":
        return <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" readOnly />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Custom Fields</h1>
        <div className="flex items-center gap-3">
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={openCreate} className="flex items-center gap-2 bg-brand hover:bg-brand/80 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Required</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Sort Order</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-700">Loading...</td></tr>
              ) : fields.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-700">No custom fields defined</td></tr>
              ) : (
                fields.map((field) => (
                  <tr key={field.id} className="border-b border-slate-100 hover:bg-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{field.label}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand/20 text-brand">
                        {fieldTypes.find((t) => t.value === field.field_type)?.label || field.field_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {field.required ? (
                        <span className="text-green-400 text-xs font-medium">Yes</span>
                      ) : (
                        <span className="text-slate-600 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{field.product_name || "All Products"}</td>
                    <td className="px-4 py-3 text-slate-700">{field.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(field)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-700" />
                        </button>
                        <button onClick={() => handleDelete(field.id)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Delete">
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Custom Field" : "Add Custom Field"} wide>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Label *</label>
              <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Dietary Requirements" />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Field Type</label>
              <select value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {fieldTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {form.field_type === "select" && (
              <div>
                <label className="block text-sm text-slate-700 mb-1">Options (comma-separated)</label>
                <textarea value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Option 1, Option 2, Option 3" />
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-700 mb-1">Product (optional)</label>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">All Products</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="w-4 h-4 rounded border-slate-200" />
                  <span className="text-sm">Required</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-700 hover:text-brand transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-brand hover:bg-brand/80 text-slate-900 rounded-lg text-sm font-medium transition-colors">
                {editingId ? "Update Field" : "Create Field"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Preview
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              {form.label && (
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5">
                    {form.label} {form.required && <span className="text-red-400">*</span>}
                  </label>
                  {renderPreview(form)}
                </div>
              )}
              {!form.label && (
                <div className="text-center text-slate-600 py-4 text-sm">
                  Enter a label to see preview
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
