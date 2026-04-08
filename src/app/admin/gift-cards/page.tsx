"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Gift,
  Plus,
  Eye,
  XCircle,
  Search,
} from "lucide-react";

interface GiftCard {
  code: string;
  initial_amount: number;
  balance: number;
  purchaser_name: string;
  purchaser_email: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  message?: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

const statusClasses: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  depleted: "bg-gray-500/20 text-gray-400",
  expired: "bg-red-500/20 text-red-400",
  cancelled: "bg-red-500/20 text-red-400",
};

function formatCurrency(v: number) {
  return "$" + v.toFixed(2);
}

export default function GiftCardsPage() {
  const { addToast } = useToast();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState({
    amount: "",
    purchaser_name: "",
    purchaser_email: "",
    recipient_name: "",
    recipient_email: "",
    message: "",
    expires_at: "",
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/gift-cards");
      if (res.ok) {
        const data = await res.json();
        setCards(Array.isArray(data) ? data : data.gift_cards || []);
      }
    } catch {
      addToast("Failed to load gift cards", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCreate = async () => {
    if (!form.amount || !form.purchaser_name || !form.purchaser_email) {
      addToast("Amount, purchaser name and email are required", "error");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/gift-cards", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          purchaser_name: form.purchaser_name,
          purchaser_email: form.purchaser_email,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          message: form.message,
          expires_at: form.expires_at || null,
        }),
      });
      if (res.ok) {
        addToast("Gift card created", "success");
        setShowCreate(false);
        setForm({ amount: "", purchaser_name: "", purchaser_email: "", recipient_name: "", recipient_email: "", message: "", expires_at: "" });
        fetchCards();
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || "Failed to create gift card", "error");
      }
    } catch {
      addToast("Failed to create gift card", "error");
    }
  };

  const handleDeactivate = async (code: string) => {
    if (!confirm("Deactivate this gift card?")) return;
    try {
      const res = await fetchWithAuth(`/api/gift-cards/${code}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        addToast("Gift card deactivated", "success");
        fetchCards();
      } else {
        addToast("Failed to deactivate", "error");
      }
    } catch {
      addToast("Failed to deactivate", "error");
    }
  };

  const viewTransactions = async (card: GiftCard) => {
    setSelectedCard(card);
    setShowTransactions(true);
    try {
      const res = await fetchWithAuth(`/api/gift-cards/${card.code}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      addToast("Failed to load transactions", "error");
    }
  };

  const filtered = cards.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.purchaser_name.toLowerCase().includes(search.toLowerCase()) ||
      c.recipient_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Gift Cards</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Gift Card
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by code, purchaser, or recipient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-light border border-white/10 rounded-lg text-sm"
        />
      </div>

      <div className="bg-surface-light border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Initial</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Purchaser</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No gift cards found</td></tr>
              ) : (
                filtered.map((card) => (
                  <tr key={card.code} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-white">{card.code}</td>
                    <td className="px-4 py-3">{formatCurrency(card.initial_amount)}</td>
                    <td className="px-4 py-3 font-medium text-white">{formatCurrency(card.balance)}</td>
                    <td className="px-4 py-3 text-gray-400">{card.purchaser_name}</td>
                    <td className="px-4 py-3 text-gray-400">{card.recipient_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[card.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {card.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(card.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => viewTransactions(card)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="View Transactions">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        {card.status === "active" && (
                          <button onClick={() => handleDeactivate(card.code)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Deactivate">
                            <XCircle className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Gift Card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount *</label>
            <input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="50.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Purchaser Name *</label>
              <input type="text" value={form.purchaser_name} onChange={(e) => setForm({ ...form, purchaser_name: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Purchaser Email *</label>
              <input type="email" value={form.purchaser_email} onChange={(e) => setForm({ ...form, purchaser_email: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Recipient Name</label>
              <input type="text" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Recipient Email</label>
              <input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Expires At (optional)</label>
            <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-brand hover:bg-brand/80 text-white rounded-lg text-sm font-medium transition-colors">Create Gift Card</button>
          </div>
        </div>
      </Modal>

      {/* Transactions Modal */}
      <Modal open={showTransactions} onClose={() => setShowTransactions(false)} title={`Transactions — ${selectedCard?.code || ""}`} wide>
        <div className="space-y-4">
          {selectedCard && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Initial:</span> <span className="text-white font-medium">{formatCurrency(selectedCard.initial_amount)}</span></div>
              <div><span className="text-gray-400">Balance:</span> <span className="text-white font-medium">{formatCurrency(selectedCard.balance)}</span></div>
            </div>
          )}
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No transactions found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === "purchase" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>{t.type}</span>
                    </td>
                    <td className="py-2 font-medium">{t.type === "redemption" ? "-" : "+"}{formatCurrency(t.amount)}</td>
                    <td className="py-2 text-gray-400">{t.description}</td>
                    <td className="py-2 text-gray-400">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
}
