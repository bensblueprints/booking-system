"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import {
  Building2,
  CreditCard,
  Calendar,
  Lock,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [savingBiz, setSavingBiz] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);
  const [savingAuthNet, setSavingAuthNet] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingCal, setSavingCal] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showAuthNetKey, setShowAuthNetKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetchWithAuth("/api/settings");
      const data = await res.json();
      if (data && typeof data === "object" && !data.error) {
        setSettings(data);
      }
    } catch {
      addToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSection = async (
    keys: string[],
    setSaving: (v: boolean) => void
  ) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of keys) {
        payload[key] = settings[key] || "";
      }
      const res = await fetchWithAuth("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Settings saved", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      addToast("Passwords do not match", "error");
      return;
    }
    if (pwForm.new_password.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetchWithAuth("/api/settings/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Password changed", "success");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSavingPw(false);
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
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        <Section
          icon={<Building2 className="w-5 h-5" />}
          title="Business Information"
          saving={savingBiz}
          onSave={() =>
            saveSection(
              ["business_name", "business_email", "business_phone"],
              setSavingBiz
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Business Name</label>
              <input
                type="text"
                value={settings.business_name || ""}
                onChange={(e) => update("business_name", e.target.value)}
                className={inputCls}
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className={labelCls}>Business Email</label>
              <input
                type="email"
                value={settings.business_email || ""}
                onChange={(e) => update("business_email", e.target.value)}
                className={inputCls}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Business Phone</label>
              <input
                type="text"
                value={settings.business_phone || ""}
                onChange={(e) => update("business_phone", e.target.value)}
                className={inputCls}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </Section>

        <Section
          icon={<CreditCard className="w-5 h-5" />}
          title="Payment - Stripe"
          saving={savingStripe}
          onSave={() =>
            saveSection(
              ["stripe_publishable_key", "stripe_secret_key"],
              setSavingStripe
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Publishable Key</label>
              <input
                type="text"
                value={settings.stripe_publishable_key || ""}
                onChange={(e) => update("stripe_publishable_key", e.target.value)}
                className={inputCls}
                placeholder="pk_..."
              />
            </div>
            <div>
              <label className={labelCls}>Secret Key</label>
              <div className="relative">
                <input
                  type={showStripeSecret ? "text" : "password"}
                  value={settings.stripe_secret_key || ""}
                  onChange={(e) => update("stripe_secret_key", e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="sk_..."
                />
                <button
                  type="button"
                  onClick={() => setShowStripeSecret(!showStripeSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showStripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={<CreditCard className="w-5 h-5" />}
          title="Payment - Authorize.net"
          saving={savingAuthNet}
          onSave={() =>
            saveSection(
              ["authorizenet_api_login", "authorizenet_transaction_key"],
              setSavingAuthNet
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>API Login ID</label>
              <input
                type="text"
                value={settings.authorizenet_api_login || ""}
                onChange={(e) => update("authorizenet_api_login", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Transaction Key</label>
              <div className="relative">
                <input
                  type={showAuthNetKey ? "text" : "password"}
                  value={settings.authorizenet_transaction_key || ""}
                  onChange={(e) => update("authorizenet_transaction_key", e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowAuthNetKey(!showAuthNetKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showAuthNetKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={<CreditCard className="w-5 h-5" />}
          title="Active Payment Provider"
          saving={savingProvider}
          onSave={() => saveSection(["payment_provider"], setSavingProvider)}
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-white/10 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value="stripe"
                checked={(settings.payment_provider || "stripe") === "stripe"}
                onChange={(e) => update("payment_provider", e.target.value)}
                className="accent-brand"
              />
              <div>
                <div className="text-sm font-medium text-white">Stripe</div>
                <div className="text-xs text-gray-400">Credit cards, Apple Pay, Google Pay</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-white/10 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value="authorizenet"
                checked={settings.payment_provider === "authorizenet"}
                onChange={(e) => update("payment_provider", e.target.value)}
                className="accent-brand"
              />
              <div>
                <div className="text-sm font-medium text-white">Authorize.net</div>
                <div className="text-xs text-gray-400">Credit and debit cards</div>
              </div>
            </label>
          </div>
        </Section>

        <Section
          icon={<Calendar className="w-5 h-5" />}
          title="Google Calendar"
          saving={savingCal}
          onSave={() =>
            saveSection(
              ["google_calendar_id", "google_service_account_json"],
              setSavingCal
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Calendar ID</label>
              <input
                type="text"
                value={settings.google_calendar_id || ""}
                onChange={(e) => update("google_calendar_id", e.target.value)}
                className={inputCls}
                placeholder="your-calendar@group.calendar.google.com"
              />
            </div>
            <div>
              <label className={labelCls}>Service Account JSON</label>
              <textarea
                value={settings.google_service_account_json || ""}
                onChange={(e) => update("google_service_account_json", e.target.value)}
                className={`${inputCls} h-32 resize-none font-mono text-xs`}
                placeholder="Paste service account JSON here..."
              />
            </div>
          </div>
        </Section>

        <div className="bg-surface-light rounded-xl border border-white/10">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center text-brand-light">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                className={inputCls}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPw}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingPw ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  saving,
  onSave,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="bg-surface-light rounded-xl border border-white/10">
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center text-brand-light">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-6">
        {children}
        <div className="flex justify-end mt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
