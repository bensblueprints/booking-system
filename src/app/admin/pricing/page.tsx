"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Calculator,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  price?: number;
}

interface PricingRule {
  id: number;
  name: string;
  product_id: number;
  rule_type: string;
  days_before?: number;
  day_of_week?: number[];
  threshold_pct?: number;
  start_date?: string;
  end_date?: string;
  adjustment_type: string;
  adjustment_value: number;
  priority: number;
  active: boolean;
}

interface PriceBreakdown {
  base_price: number;
  final_price: number;
  rules_applied: { name: string; adjustment: string }[];
}

const ruleTypes = [
  { value: "early_bird", label: "Early Bird" },
  { value: "last_minute", label: "Last Minute" },
  { value: "day_of_week", label: "Day of Week" },
  { value: "demand", label: "Demand-Based" },
  { value: "date_range", label: "Date Range" },
];

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function conditionSummary(rule: PricingRule): string {
  switch (rule.rule_type) {
    case "early_bird": return `Book ${rule.days_before}+ days ahead`;
    case "last_minute": return `Within ${rule.days_before} days`;
    case "day_of_week": return (rule.day_of_week || []).map((d) => dayNames[d]).join(", ");
    case "demand": return `Occupancy > ${rule.threshold_pct}%`;
    case "date_range": return `${rule.start_date} — ${rule.end_date}`;
    default: return "";
  }
}

function adjustmentLabel(rule: PricingRule): string {
  const sign = rule.adjustment_value >= 0 ? "+" : "";
  return rule.adjustment_type === "percent"
    ? `${sign}${rule.adjustment_value}%`
    : `${sign}$${rule.adjustment_value}`;
}

const emptyForm = {
  name: "",
  rule_type: "early_bird",
  days_before: "",
  day_of_week: [] as number[],
  threshold_pct: "",
  start_date: "",
  end_date: "",
  adjustment_type: "percent",
  adjustment_value: "",
  priority: "0",
  active: true,
};

export default function PricingPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Price preview
  const [previewDate, setPreviewDate] = useState("");
  const [preview, setPreview] = useState<PriceBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.products || [];
        setProducts(list);
        if (list.length > 0 && !selectedProduct) setSelectedProduct(list[0].id.toString());
      }
    } catch {}
  }, []);

  const fetchRules = useCallback(async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/pricing-rules?product_id=${selectedProduct}`);
      if (res.ok) {
        const data = await res.json();
        setRules(Array.isArray(data) ? data : data.rules || []);
      }
    } catch {
      addToast("Failed to load pricing rules", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, addToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      rule_type: rule.rule_type,
      days_before: rule.days_before?.toString() || "",
      day_of_week: rule.day_of_week || [],
      threshold_pct: rule.threshold_pct?.toString() || "",
      start_date: rule.start_date || "",
      end_date: rule.end_date || "",
      adjustment_type: rule.adjustment_type,
      adjustment_value: rule.adjustment_value.toString(),
      priority: rule.priority.toString(),
      active: rule.active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.adjustment_value) {
      addToast("Name and adjustment value are required", "error");
      return;
    }
    const body: Record<string, unknown> = {
      name: form.name,
      product_id: parseInt(selectedProduct),
      rule_type: form.rule_type,
      adjustment_type: form.adjustment_type,
      adjustment_value: parseFloat(form.adjustment_value),
      priority: parseInt(form.priority) || 0,
      active: form.active,
    };
    if (form.rule_type === "early_bird" || form.rule_type === "last_minute") body.days_before = parseInt(form.days_before) || 0;
    if (form.rule_type === "day_of_week") body.day_of_week = form.day_of_week;
    if (form.rule_type === "demand") body.threshold_pct = parseInt(form.threshold_pct) || 0;
    if (form.rule_type === "date_range") { body.start_date = form.start_date; body.end_date = form.end_date; }

    try {
      const url = editingId ? `/api/pricing-rules/${editingId}` : "/api/pricing-rules";
      const method = editingId ? "PUT" : "POST";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        addToast(editingId ? "Rule updated" : "Rule created", "success");
        setShowModal(false);
        fetchRules();
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || "Failed to save rule", "error");
      }
    } catch {
      addToast("Failed to save rule", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this pricing rule?")) return;
    try {
      const res = await fetchWithAuth(`/api/pricing-rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Rule deleted", "success");
        fetchRules();
      }
    } catch {
      addToast("Failed to delete rule", "error");
    }
  };

  const handlePreview = async () => {
    if (!previewDate || !selectedProduct) return;
    setPreviewLoading(true);
    try {
      const res = await fetchWithAuth(`/api/pricing/calculate?product_id=${selectedProduct}&date=${previewDate}`);
      if (res.ok) {
        setPreview(await res.json());
      } else {
        addToast("Failed to calculate price", "error");
      }
    } catch {
      addToast("Failed to calculate price", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      day_of_week: f.day_of_week.includes(day) ? f.day_of_week.filter((d) => d !== day) : [...f.day_of_week, day],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dynamic Pricing</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-brand hover:bg-brand/80 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-700">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 font-medium">Adjustment</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-700">Loading...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-700">No pricing rules for this product</td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-slate-100 hover:bg-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand/20 text-brand">
                        {ruleTypes.find((t) => t.value === rule.rule_type)?.label || rule.rule_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{conditionSummary(rule)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${rule.adjustment_value < 0 ? "text-green-400" : "text-red-400"}`}>
                        {adjustmentLabel(rule)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{rule.priority}</td>
                    <td className="px-4 py-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${rule.active ? "bg-green-400" : "bg-gray-500"}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(rule)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4 text-slate-700" />
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
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

      {/* Price Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-brand" /> Price Preview
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="date"
            value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handlePreview}
            disabled={previewLoading || !previewDate}
            className="px-4 py-2 bg-brand hover:bg-brand/80 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-medium transition-colors"
          >
            {previewLoading ? "Calculating..." : "Calculate Price"}
          </button>
        </div>
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-700">Base Price:</span>
              <span className="text-slate-900 font-medium">${preview.base_price.toFixed(2)}</span>
            </div>
            {preview.rules_applied.map((r, i) => (
              <div key={i} className="flex items-center gap-4 text-sm pl-4 border-l-2 border-slate-200">
                <span className="text-slate-700">{r.name}:</span>
                <span className="text-accent font-medium">{r.adjustment}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-700">Final Price:</span>
              <span className="text-slate-900 text-lg font-bold">${preview.final_price.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Pricing Rule" : "Create Pricing Rule"} wide>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Weekend Surge" />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Rule Type</label>
            <select value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {ruleTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Conditional fields */}
          {(form.rule_type === "early_bird" || form.rule_type === "last_minute") && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">
                {form.rule_type === "early_bird" ? "Book X+ days in advance" : "Within X days of departure"}
              </label>
              <input type="number" min="1" value={form.days_before} onChange={(e) => setForm({ ...form, days_before: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}
          {form.rule_type === "day_of_week" && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">Days</label>
              <div className="flex gap-2">
                {dayNames.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.day_of_week.includes(i) ? "bg-brand text-white" : "bg-slate-50 border border-slate-200 text-slate-700"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.rule_type === "demand" && (
            <div>
              <label className="block text-sm text-slate-700 mb-1">When occupancy exceeds X%</label>
              <input type="number" min="0" max="100" value={form.threshold_pct} onChange={(e) => setForm({ ...form, threshold_pct: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}
          {form.rule_type === "date_range" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Adjustment Type</label>
              <select value={form.adjustment_type} onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Value (negative = discount)</label>
              <input type="number" step="0.01" value={form.adjustment_value} onChange={(e) => setForm({ ...form, adjustment_value: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Priority</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded border-slate-200" />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-700 hover:text-brand transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-brand hover:bg-brand/80 text-slate-900 rounded-lg text-sm font-medium transition-colors">
              {editingId ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
