"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Mail,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Send,
  Code,
  Info,
} from "lucide-react";

interface EmailTemplate {
  id?: number;
  type: string;
  subject: string;
  body_html: string;
  active: number;
}

const TEMPLATE_TYPES = [
  { type: "confirmation", label: "Booking Confirmation", description: "Sent when a booking is completed" },
  { type: "reminder_24h", label: "24h Reminder", description: "Sent 24 hours before the booking" },
  { type: "cancellation", label: "Cancellation", description: "Sent when a booking is cancelled" },
  { type: "receipt", label: "Payment Receipt", description: "Sent as a payment receipt" },
];

const VARIABLES = [
  "{{customer_name}}",
  "{{customer_email}}",
  "{{product_name}}",
  "{{booking_date}}",
  "{{booking_time}}",
  "{{party_size}}",
  "{{total_amount}}",
  "{{deposit_amount}}",
  "{{discount_amount}}",
  "{{addons_total}}",
  "{{manage_link}}",
  "{{business_name}}",
  "{{business_phone}}",
  "{{business_email}}",
];

export default function EmailTemplatesPage() {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetchWithAuth("/api/email/templates");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch {
      addToast("Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  };

  const getTemplate = (type: string): EmailTemplate | undefined => {
    return templates.find((t) => t.type === type);
  };

  const openEdit = (type: string) => {
    const existing = getTemplate(type);
    setEditTemplate(
      existing
        ? { ...existing }
        : { type, subject: "", body_html: "", active: 1 }
    );
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editTemplate) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/email/templates", {
        method: "PUT",
        body: JSON.stringify(editTemplate),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Template saved", "success");
      setEditOpen(false);
      loadTemplates();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (type: string) => {
    const existing = getTemplate(type);
    if (!existing) return;
    try {
      const res = await fetchWithAuth("/api/email/templates", {
        method: "PUT",
        body: JSON.stringify({ ...existing, active: existing.active ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast(existing.active ? "Template deactivated" : "Template activated", "success");
      loadTemplates();
    } catch {
      addToast("Failed to toggle template", "error");
    }
  };

  const handleSendTest = async () => {
    if (!editTemplate || !testEmail) {
      addToast("Enter a test email address", "error");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetchWithAuth("/api/email/test", {
        method: "POST",
        body: JSON.stringify({
          type: editTemplate.type,
          subject: editTemplate.subject,
          body_html: editTemplate.body_html,
          to: testEmail,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Test email sent", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSendingTest(false);
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
          <Mail className="w-6 h-6 text-brand-light" />
          Email Templates
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATE_TYPES.map((tt) => {
          const tmpl = getTemplate(tt.type);
          const isActive = tmpl?.active ?? false;

          return (
            <div
              key={tt.type}
              className="bg-surface-light rounded-xl border border-white/10 p-5 flex flex-col cursor-pointer hover:border-white/20 transition-colors"
              onClick={() => openEdit(tt.type)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-brand-light" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{tt.label}</div>
                    <div className="text-xs text-gray-400">{tt.description}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(tt.type);
                  }}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                  title={isActive ? "Deactivate" : "Activate"}
                >
                  {isActive ? (
                    <ToggleRight className="w-5 h-5 text-success" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="mt-auto pt-3 border-t border-white/5">
                {tmpl?.subject ? (
                  <div className="text-sm text-gray-300 truncate">
                    <span className="text-gray-500">Subject: </span>
                    {tmpl.subject}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">Not configured</div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(tt.type);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                    isActive
                      ? "bg-success/20 text-success"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Template: ${TEMPLATE_TYPES.find((t) => t.type === editTemplate?.type)?.label || ""}`}
        wide
      >
        {editTemplate && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Subject Line</label>
              <input
                type="text"
                value={editTemplate.subject}
                onChange={(e) => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                className={inputCls}
                placeholder="e.g. Your booking is confirmed!"
              />
            </div>

            <div>
              <label className={labelCls}>Body HTML</label>
              <textarea
                value={editTemplate.body_html}
                onChange={(e) => setEditTemplate({ ...editTemplate, body_html: e.target.value })}
                className={`${inputCls} h-64 resize-y font-mono text-xs`}
                placeholder="<html>..."
              />
            </div>

            {/* Variables reference */}
            <div className="bg-surface rounded-lg border border-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                <Code className="w-4 h-4" />
                Available Variables
              </div>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(v);
                      addToast(`Copied ${v}`, "info");
                    }}
                    className="px-2 py-1 bg-surface-light border border-white/10 rounded text-xs font-mono text-brand-light hover:bg-white/5 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 mt-3 text-xs text-gray-500">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                Click a variable to copy it. Paste it into the subject or body.
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editTemplate.active}
                  onChange={(e) => setEditTemplate({ ...editTemplate, active: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded border-white/20 accent-brand"
                />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </div>

            {/* Test Email */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-sm font-medium text-gray-300 mb-2">Send Test Email</div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="test@example.com"
                />
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  {sendingTest ? "Sending..." : "Send Test"}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
