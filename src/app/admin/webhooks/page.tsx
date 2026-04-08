"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Webhook,
  Plus,
  Trash2,
  Eye,
  Play,
  RefreshCw,
  Copy,
  AlertTriangle,
} from "lucide-react";

interface WebhookItem {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  last_delivery_at: string | null;
  created_at: string;
}

interface DeliveryLog {
  id: number;
  status_code: number;
  response_snippet: string;
  created_at: string;
  event: string;
}

const allEvents = [
  "booking.created",
  "booking.cancelled",
  "booking.modified",
  "checkin",
];

export default function WebhooksPage() {
  const { addToast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [createdSecret, setCreatedSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ url: "", events: [] as string[], active: true });

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(Array.isArray(data) ? data : data.webhooks || []);
      }
    } catch {
      addToast("Failed to load webhooks", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  const handleCreate = async () => {
    if (!form.url || form.events.length === 0) {
      addToast("URL and at least one event are required", "error");
      return;
    }
    try {
      const res = await fetchWithAuth("/api/webhooks", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSecret(data.secret || "");
        setShowCreate(false);
        setShowSecret(true);
        setForm({ url: "", events: [], active: true });
        fetchWebhooks();
        addToast("Webhook created", "success");
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || "Failed to create webhook", "error");
      }
    } catch {
      addToast("Failed to create webhook", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      const res = await fetchWithAuth(`/api/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Webhook deleted", "success");
        fetchWebhooks();
      }
    } catch {
      addToast("Failed to delete webhook", "error");
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await fetchWithAuth("/api/webhooks/test", {
        method: "POST",
        body: JSON.stringify({ webhook_id: id }),
      });
      if (res.ok) {
        addToast("Test event sent", "success");
      } else {
        addToast("Failed to send test event", "error");
      }
    } catch {
      addToast("Failed to send test event", "error");
    }
  };

  const viewLog = async (wh: WebhookItem) => {
    setSelectedWebhook(wh);
    setShowLog(true);
    try {
      const res = await fetchWithAuth(`/api/webhooks/${wh.id}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.deliveries || []);
      }
    } catch {
      addToast("Failed to load delivery log", "error");
    }
  };

  const retryDelivery = async (deliveryId: number) => {
    if (!selectedWebhook) return;
    try {
      const res = await fetchWithAuth(`/api/webhooks/${selectedWebhook.id}`, {
        method: "PUT",
        body: JSON.stringify({ retry_delivery: deliveryId }),
      });
      if (res.ok) {
        addToast("Delivery retried", "success");
        viewLog(selectedWebhook);
      }
    } catch {
      addToast("Failed to retry", "error");
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(createdSecret);
    addToast("Secret copied to clipboard", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-brand hover:bg-brand/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      <div className="bg-surface-light border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Events</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Last Delivery</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : webhooks.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No webhooks configured</td></tr>
              ) : (
                webhooks.map((wh) => (
                  <tr key={wh.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-white text-xs max-w-64 truncate">{wh.url}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((e) => (
                          <span key={e} className="px-2 py-0.5 rounded text-xs font-medium bg-brand/20 text-brand">{e}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${wh.active ? "bg-green-400" : "bg-gray-500"}`} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {wh.last_delivery_at ? new Date(wh.last_delivery_at).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => viewLog(wh)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="View Log">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => handleTest(wh.id)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Send Test">
                          <Play className="w-4 h-4 text-green-400" />
                        </button>
                        <button onClick={() => handleDelete(wh.id)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Delete">
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

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Webhook">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Endpoint URL *</label>
            <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm font-mono" placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Events *</label>
            <div className="space-y-2">
              {allEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} className="w-4 h-4 rounded border-white/10" />
                  <span className="text-sm font-mono">{event}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded border-white/10" />
            <span className="text-sm">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-brand hover:bg-brand/80 text-white rounded-lg text-sm font-medium transition-colors">Create Webhook</button>
          </div>
        </div>
      </Modal>

      {/* Secret Modal */}
      <Modal open={showSecret} onClose={() => setShowSecret(false)} title="Webhook Secret">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-accent">Save this secret now — it won{"'"}t be shown again.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm font-mono break-all">{createdSecret}</code>
            <button onClick={copySecret} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Copy">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setShowSecret(false)} className="px-4 py-2 bg-brand hover:bg-brand/80 text-white rounded-lg text-sm font-medium transition-colors">Done</button>
          </div>
        </div>
      </Modal>

      {/* Delivery Log Modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title={`Delivery Log — ${selectedWebhook?.url || ""}`} wide>
        {logs.length === 0 ? (
          <div className="py-8 text-center text-gray-400">No deliveries yet</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-surface border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status_code >= 200 && log.status_code < 300 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {log.status_code}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{log.event}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                    <button onClick={() => retryDelivery(log.id)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Retry">
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
                {log.response_snippet && (
                  <pre className="text-xs text-gray-400 bg-black/20 rounded p-2 overflow-x-auto">{log.response_snippet}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
