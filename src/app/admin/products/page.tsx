"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Code, Copy, Check, Link as LinkIcon } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  deposit_percent: number;
  seats_per_slot: number;
  duration_minutes: number;
  season_start: string | null;
  season_end: string | null;
  color: string;
  active: number;
  cutoff_hours?: number;
  min_participants?: number;
}

interface DiscountTier {
  id?: number;
  min_quantity: number;
  discount_type: "percent" | "fixed_per_person";
  discount_value: number;
}

const defaultForm = {
  name: "",
  description: "",
  price: "",
  deposit_percent: "50",
  seats_per_slot: "6",
  duration_minutes: "120",
  season_start: "",
  season_end: "",
  color: "#1B6B8A",
  active: true,
  cutoff_hours: "0",
  min_participants: "1",
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label || "Copy"}
    </button>
  );
}

export default function ProductsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedProduct, setEmbedProduct] = useState<Product | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {
      addToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadDiscounts = async (productId: number) => {
    try {
      const res = await fetchWithAuth(`/api/quantity-discounts?product_id=${productId}`);
      const data = await res.json();
      if (Array.isArray(data)) setDiscountTiers(data);
      else setDiscountTiers([]);
    } catch {
      setDiscountTiers([]);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setDiscountTiers([]);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      deposit_percent: String(p.deposit_percent),
      seats_per_slot: String(p.seats_per_slot),
      duration_minutes: String(p.duration_minutes),
      season_start: p.season_start || "",
      season_end: p.season_end || "",
      color: p.color || "#1B6B8A",
      active: !!p.active,
      cutoff_hours: String(p.cutoff_hours ?? 0),
      min_participants: String(p.min_participants ?? 1),
    });
    loadDiscounts(p.id);
    setModalOpen(true);
  };

  const openEmbed = (p: Product) => {
    setEmbedProduct(p);
    setEmbedModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        deposit_percent: parseInt(form.deposit_percent),
        seats_per_slot: parseInt(form.seats_per_slot),
        duration_minutes: parseInt(form.duration_minutes),
        season_start: form.season_start || null,
        season_end: form.season_end || null,
        color: form.color,
        active: form.active ? 1 : 0,
        cutoff_hours: parseInt(form.cutoff_hours) || 0,
        min_participants: parseInt(form.min_participants) || 1,
      };

      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      const productData = await res.json();
      const productId = editId || productData.id;

      // Save discount tiers
      if (productId) {
        await fetchWithAuth(`/api/quantity-discounts?product_id=${productId}`, { method: "DELETE" });
        for (const tier of discountTiers) {
          await fetchWithAuth("/api/quantity-discounts", {
            method: "POST",
            body: JSON.stringify({
              product_id: productId,
              min_quantity: tier.min_quantity,
              discount_type: tier.discount_type,
              discount_value: tier.discount_value,
            }),
          });
        }
      }

      addToast(editId ? "Product updated" : "Product created", "success");
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deactivate this product?")) return;
    try {
      const res = await fetchWithAuth(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      addToast("Product deactivated", "success");
      loadProducts();
    } catch {
      addToast("Failed to deactivate product", "error");
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      const res = await fetchWithAuth(`/api/products/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: p.active ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast(p.active ? "Product deactivated" : "Product activated", "success");
      loadProducts();
    } catch {
      addToast("Failed to toggle product", "error");
    }
  };

  const addDiscountTier = () => {
    setDiscountTiers((prev) => [...prev, { min_quantity: 4, discount_type: "percent", discount_value: 10 }]);
  };

  const updateDiscountTier = (idx: number, field: keyof DiscountTier, value: string | number) => {
    setDiscountTiers((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const removeDiscountTier = (idx: number) => {
    setDiscountTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const getDirectLink = (p: Product) => `${baseUrl}/book?product=${p.id}`;
  const getAllBookingLink = () => `${baseUrl}/book`;

  const getButtonSnippet = (p: Product) =>
    `<a href="${getDirectLink(p)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${p.color || "#1B6B8A"};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600;font-size:16px;">Book ${p.name}</a>`;

  const getJsButtonSnippet = (p: Product) =>
    `<!-- Booking Button for ${p.name} -->
<script>
(function(){
  var btn = document.createElement('a');
  btn.href = '${getDirectLink(p)}';
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.innerHTML = 'Book ${p.name.replace(/'/g, "\\'")}';
  btn.style.cssText = 'display:inline-block;background:${p.color || "#1B6B8A"};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600;font-size:16px;cursor:pointer;transition:opacity 0.2s;';
  btn.onmouseover = function(){ this.style.opacity='0.85'; };
  btn.onmouseout = function(){ this.style.opacity='1'; };
  document.currentScript.parentElement.appendChild(btn);
})();
</script>`;

  const getIframeSnippet = (p: Product) =>
    `<iframe src="${getDirectLink(p)}" width="100%" height="800" frameborder="0" style="border:none;border-radius:12px;max-width:600px;"></iframe>`;

  const getPopupSnippet = (p: Product) =>
    `<!-- Popup Booking Button for ${p.name} -->
<script>
(function(){
  var btn = document.createElement('a');
  btn.innerHTML = 'Book ${p.name.replace(/'/g, "\\'")}';
  btn.style.cssText = 'display:inline-block;background:${p.color || "#1B6B8A"};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600;font-size:16px;cursor:pointer;transition:opacity 0.2s;';
  btn.onmouseover = function(){ this.style.opacity='0.85'; };
  btn.onmouseout = function(){ this.style.opacity='1'; };
  btn.onclick = function(e){
    e.preventDefault();
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(ev){ if(ev.target===overlay){ document.body.removeChild(overlay); } };
    var frame = document.createElement('iframe');
    frame.src = '${getDirectLink(p)}';
    frame.style.cssText = 'width:90%;max-width:560px;height:85vh;border:none;border-radius:16px;background:#fff;';
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
  };
  document.currentScript.parentElement.appendChild(btn);
})();
</script>`;

  const inputCls =
    "w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1";
  const codeCls =
    "w-full bg-surface border border-white/10 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap break-all select-all max-h-32 overflow-auto";

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
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Quick links bar */}
      {products.length > 0 && (
        <div className="bg-surface-light rounded-xl border border-white/10 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <LinkIcon className="w-4 h-4" />
              <span>All Products Booking Page:</span>
              <code className="bg-surface px-2 py-0.5 rounded text-xs text-brand-light">{getAllBookingLink()}</code>
            </div>
            <CopyButton text={getAllBookingLink()} label="Copy Link" />
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-surface-light rounded-xl border border-white/10 p-12 text-center">
          <p className="text-gray-400">No products yet. Create your first product to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-surface-light rounded-xl border border-white/10 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-10 rounded-full"
                    style={{ backgroundColor: p.color || "#1B6B8A" }}
                  />
                  <div>
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-gray-400">
                      ${p.price}/person &middot; {p.deposit_percent}% deposit
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.active
                      ? "bg-success/20 text-success"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>

              {p.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 mt-auto">
                <div className="bg-surface rounded-lg py-2">
                  <div className="text-white font-medium">{p.seats_per_slot}</div>
                  <div className="text-gray-400">Seats</div>
                </div>
                <div className="bg-surface rounded-lg py-2">
                  <div className="text-white font-medium">{p.duration_minutes}m</div>
                  <div className="text-gray-400">Duration</div>
                </div>
                <div className="bg-surface rounded-lg py-2">
                  <div className="text-white font-medium">
                    {p.season_start ? `${p.season_start}` : "All"}
                  </div>
                  <div className="text-gray-400">Season</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10 flex-wrap">
                <button
                  onClick={() => openEdit(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => openEmbed(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors"
                >
                  <Code className="w-3.5 h-3.5" /> Embed
                </button>
                <button
                  onClick={() => handleToggle(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {p.active ? (
                    <><ToggleRight className="w-3.5 h-3.5" /> Deactivate</>
                  ) : (
                    <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger bg-white/5 hover:bg-danger/10 rounded-lg transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embed/Link Modal */}
      <Modal
        open={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        title={embedProduct ? `Embed: ${embedProduct.name}` : "Embed Code"}
        wide
      >
        {embedProduct && (
          <div className="space-y-6">
            {/* Direct Link */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Direct Link
                </label>
                <CopyButton text={getDirectLink(embedProduct)} />
              </div>
              <div className={codeCls}>{getDirectLink(embedProduct)}</div>
              <p className="text-xs text-gray-500 mt-1">Link directly to the booking page for this product.</p>
            </div>

            {/* HTML Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">HTML Button</label>
                <CopyButton text={getButtonSnippet(embedProduct)} />
              </div>
              <div className={codeCls}>{getButtonSnippet(embedProduct)}</div>
              <p className="text-xs text-gray-500 mt-1">Simple HTML link styled as a button. Paste anywhere in your HTML.</p>
              <div className="mt-2 p-3 bg-surface rounded-lg border border-white/10">
                <span className="text-xs text-gray-400 block mb-2">Preview:</span>
                <div dangerouslySetInnerHTML={{ __html: getButtonSnippet(embedProduct) }} />
              </div>
            </div>

            {/* JavaScript Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">JavaScript Button (auto-inject)</label>
                <CopyButton text={getJsButtonSnippet(embedProduct)} />
              </div>
              <div className={codeCls}>{getJsButtonSnippet(embedProduct)}</div>
              <p className="text-xs text-gray-500 mt-1">Paste this script tag anywhere — it auto-creates a styled booking button.</p>
            </div>

            {/* Popup Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Popup Button (opens in overlay)</label>
                <CopyButton text={getPopupSnippet(embedProduct)} />
              </div>
              <div className={codeCls}>{getPopupSnippet(embedProduct)}</div>
              <p className="text-xs text-gray-500 mt-1">Opens the booking form in a popup overlay — visitors stay on your site.</p>
            </div>

            {/* Iframe Embed */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Iframe Embed (inline)</label>
                <CopyButton text={getIframeSnippet(embedProduct)} />
              </div>
              <div className={codeCls}>{getIframeSnippet(embedProduct)}</div>
              <p className="text-xs text-gray-500 mt-1">Embed the full booking flow directly into any page.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Product Form Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Product" : "New Product"}
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
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputCls} h-20 resize-none`}
              />
            </div>
            <div>
              <label className={labelCls}>Price per Person ($) *</label>
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
              <label className={labelCls}>Deposit %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.deposit_percent}
                onChange={(e) => setForm({ ...form, deposit_percent: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Seats per Slot</label>
              <input
                type="number"
                min="1"
                value={form.seats_per_slot}
                onChange={(e) => setForm({ ...form, seats_per_slot: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Booking Cut-off (hours before)</label>
              <input
                type="number"
                min="0"
                value={form.cutoff_hours}
                onChange={(e) => setForm({ ...form, cutoff_hours: e.target.value })}
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">Prevent bookings within X hours of start time. 0 = no cut-off</p>
            </div>
            <div>
              <label className={labelCls}>Minimum Participants</label>
              <input
                type="number"
                min="1"
                value={form.min_participants}
                onChange={(e) => setForm({ ...form, min_participants: e.target.value })}
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum party size required per booking</p>
            </div>
            <div>
              <label className={labelCls}>Season Start (MM-DD)</label>
              <input
                type="text"
                placeholder="03-01"
                value={form.season_start}
                onChange={(e) => setForm({ ...form, season_start: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Season End (MM-DD)</label>
              <input
                type="text"
                placeholder="10-31"
                value={form.season_end}
                onChange={(e) => setForm({ ...form, season_end: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className={inputCls}
                />
              </div>
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

          {/* Quantity Discounts */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-white">Quantity Discounts</label>
              <button
                type="button"
                onClick={addDiscountTier}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Discount Tier
              </button>
            </div>
            {discountTiers.length === 0 ? (
              <p className="text-xs text-gray-500">No quantity discounts. Add tiers to offer group discounts.</p>
            ) : (
              <div className="space-y-2">
                {discountTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-surface rounded-lg p-2 border border-white/5">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Min Qty</label>
                      <input
                        type="number"
                        min="2"
                        value={tier.min_quantity}
                        onChange={(e) => updateDiscountTier(idx, "min_quantity", parseInt(e.target.value) || 2)}
                        className={`${inputCls} text-xs`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Type</label>
                      <select
                        value={tier.discount_type}
                        onChange={(e) => updateDiscountTier(idx, "discount_type", e.target.value)}
                        className={`${inputCls} text-xs`}
                      >
                        <option value="percent">Percent Off</option>
                        <option value="fixed_per_person">$ Off / Person</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Value</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.discount_value}
                        onChange={(e) => updateDiscountTier(idx, "discount_value", parseFloat(e.target.value) || 0)}
                        className={`${inputCls} text-xs`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDiscountTier(idx)}
                      className="mt-4 p-1.5 text-gray-400 hover:text-danger hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {saving ? "Saving..." : editId ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
