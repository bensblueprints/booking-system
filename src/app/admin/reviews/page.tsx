"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Star, CheckCircle2, XCircle, Code, Copy, Check } from "lucide-react";

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  product_name: string | null;
  created_at: string;
  status: string;
}

export default function ReviewsPage() {
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Review | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReviews = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/reviews" : `/api/reviews?status=${filter}`;
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (Array.isArray(data)) setReviews(data);
    } catch {
      addToast("Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetchWithAuth(`/api/reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast(`Review ${status}`, "success");
      loadReviews();
    } catch {
      addToast("Failed to update review", "error");
    }
  };

  const totalReviews = reviews.length;
  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<div id="booking-reviews"></div>
<script>
(function(){
  fetch('${baseUrl}/api/reviews/public')
    .then(r=>r.json())
    .then(reviews=>{
      var c=document.getElementById('booking-reviews');
      if(!c||!reviews.length)return;
      c.innerHTML='<h3 style="font-size:1.25rem;font-weight:bold;margin-bottom:1rem;">Customer Reviews</h3>'+
        reviews.map(r=>'<div style="border:1px solid #e5e7eb;border-radius:8px;padding:1rem;margin-bottom:0.75rem;">'+
          '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">'+
          '<strong>'+r.customer_name+'</strong>'+
          '<span style="color:#f59e0b;">'+Array(r.rating).fill(0).map(()=>'&#9733;').join('')+'</span>'+
          '</div><p style="color:#6b7280;margin:0;">'+r.comment+'</p></div>').join('');
    });
})();
</script>`;

  const Stars = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-4 h-4 ${n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
      ))}
    </div>
  );

  const filterBtns: { label: string; value: typeof filter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
  ];

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
        <button onClick={() => setEmbedOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
          <Code className="w-4 h-4" /> Embed Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{totalReviews}</div>
          <div className="text-xs text-slate-700">Total Reviews</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{avgRating.toFixed(1)}</div>
          <div className="text-xs text-slate-700">Average Rating</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{pendingCount}</div>
          <div className="text-xs text-slate-700">Pending</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {filterBtns.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value ? "bg-brand text-white" : "bg-slate-100 text-slate-700 hover:text-brand"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700">No reviews found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Comment</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Product</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-slate-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => { setSelected(r); setDetailOpen(true); }}
                    className="border-b border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-900 font-medium">{r.customer_name}</td>
                    <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                    <td className="px-4 py-3 text-slate-900 max-w-xs truncate">{r.comment}</td>
                    <td className="px-4 py-3 text-slate-900">{r.product_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "approved" ? "bg-green-100 text-success" :
                        r.status === "rejected" ? "bg-danger/20 text-danger" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {r.status !== "approved" && (
                          <button onClick={() => updateStatus(r.id, "approved")} className="p-1.5 hover:bg-success/10 rounded-lg transition-colors text-slate-700 hover:text-success" title="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button onClick={() => updateStatus(r.id, "rejected")} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-700 hover:text-danger" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Review Details">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-900 font-semibold">{selected.customer_name}</span>
              <Stars rating={selected.rating} />
            </div>
            {selected.product_name && <p className="text-sm text-slate-700">Product: {selected.product_name}</p>}
            <p className="text-sm text-slate-700">Date: {new Date(selected.created_at).toLocaleDateString()}</p>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{selected.comment}</p>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              {selected.status !== "approved" && (
                <button onClick={() => { updateStatus(selected.id, "approved"); setDetailOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-100 hover:bg-success/30 text-success rounded-lg transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              )}
              {selected.status !== "rejected" && (
                <button onClick={() => { updateStatus(selected.id, "rejected"); setDetailOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-danger/20 hover:bg-danger/30 text-danger rounded-lg transition-colors">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={embedOpen} onClose={() => setEmbedOpen(false)} title="Embed Reviews" wide>
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Paste this code into your website to display approved reviews.</p>
          <div className="relative">
            <pre className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-900 font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto">{embedCode}</pre>
            <button
              onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
