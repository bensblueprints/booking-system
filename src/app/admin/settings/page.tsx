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
  Mail,
  Bell,
  Send,
  Phone,
  Star,
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
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [savingReviews, setSavingReviews] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");

  const [testingSms, setTestingSms] = useState(false);
  const [testSmsPhone, setTestSmsPhone] = useState("");

  const [showTwilioToken, setShowTwilioToken] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showAuthNetKey, setShowAuthNetKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const handleTestEmailConnection = async () => {
    if (!testEmailAddr) {
      addToast("Enter an email address to send a test to", "error");
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetchWithAuth("/api/email/test", {
        method: "POST",
        body: JSON.stringify({ to: testEmailAddr, type: "connection_test" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Test email sent successfully", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!testSmsPhone) {
      addToast("Enter a phone number to send a test SMS", "error");
      return;
    }
    setTestingSms(true);
    try {
      const res = await fetchWithAuth("/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ to: testSmsPhone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Test SMS sent successfully", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setTestingSms(false);
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

  const emailProvider = settings.email_provider || "smtp";

  const emailKeys = (() => {
    const base = ["email_provider", "smtp_from_email", "smtp_from_name"];
    if (emailProvider === "smtp") return [...base, "smtp_host", "smtp_port", "smtp_user", "smtp_pass"];
    if (emailProvider === "resend") return [...base, "resend_api_key"];
    if (emailProvider === "sendgrid") return [...base, "sendgrid_api_key"];
    return base;
  })();

  const inputCls =
    "w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm";
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

        {/* Email Configuration */}
        <Section
          icon={<Mail className="w-5 h-5" />}
          title="Email Configuration"
          saving={savingEmail}
          onSave={() => saveSection(emailKeys, setSavingEmail)}
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Email Provider</label>
              <select
                value={emailProvider}
                onChange={(e) => update("email_provider", e.target.value)}
                className={inputCls}
              >
                <option value="smtp">SMTP</option>
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>

            {emailProvider === "smtp" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>SMTP Host</label>
                    <input
                      type="text"
                      value={settings.smtp_host || ""}
                      onChange={(e) => update("smtp_host", e.target.value)}
                      className={inputCls}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SMTP Port</label>
                    <input
                      type="text"
                      value={settings.smtp_port || ""}
                      onChange={(e) => update("smtp_port", e.target.value)}
                      className={inputCls}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>SMTP Username</label>
                  <input
                    type="text"
                    value={settings.smtp_user || ""}
                    onChange={(e) => update("smtp_user", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>SMTP Password</label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? "text" : "password"}
                      value={settings.smtp_pass || ""}
                      onChange={(e) => update("smtp_pass", e.target.value)}
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {emailProvider === "resend" && (
              <div>
                <label className={labelCls}>Resend API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.resend_api_key || ""}
                    onChange={(e) => update("resend_api_key", e.target.value)}
                    className={`${inputCls} pr-10`}
                    placeholder="re_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {emailProvider === "sendgrid" && (
              <div>
                <label className={labelCls}>SendGrid API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.sendgrid_api_key || ""}
                    onChange={(e) => update("sendgrid_api_key", e.target.value)}
                    className={`${inputCls} pr-10`}
                    placeholder="SG..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>From Email</label>
              <input
                type="email"
                value={settings.smtp_from_email || ""}
                onChange={(e) => update("smtp_from_email", e.target.value)}
                className={inputCls}
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <div>
              <label className={labelCls}>From Name</label>
              <input
                type="text"
                value={settings.smtp_from_name || ""}
                onChange={(e) => update("smtp_from_name", e.target.value)}
                className={inputCls}
                placeholder="Your Business"
              />
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="text-sm font-medium text-gray-300 mb-2">Test Email Connection</div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailAddr}
                  onChange={(e) => setTestEmailAddr(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="test@example.com"
                />
                <button
                  onClick={handleTestEmailConnection}
                  disabled={testingEmail || !testEmailAddr}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  {testingEmail ? "Sending..." : "Test"}
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section
          icon={<Bell className="w-5 h-5" />}
          title="Notifications"
          saving={savingNotif}
          onSave={() => saveSection(["reminder_enabled", "reminder_hours"], setSavingNotif)}
        >
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.reminder_enabled === "1" || settings.reminder_enabled === "true"}
                onChange={(e) => update("reminder_enabled", e.target.checked ? "1" : "0")}
                className="w-4 h-4 rounded border-white/20 accent-brand"
              />
              <div>
                <span className="text-sm text-gray-300">Enable booking reminders</span>
                <div className="text-xs text-gray-500">Send automated reminder emails before bookings</div>
              </div>
            </label>
            <div>
              <label className={labelCls}>Reminder Hours Before</label>
              <input
                type="number"
                min="1"
                value={settings.reminder_hours || "24"}
                onChange={(e) => update("reminder_hours", e.target.value)}
                className={inputCls}
                placeholder="24"
              />
              <p className="text-xs text-gray-500 mt-1">How many hours before the booking to send the reminder</p>
            </div>
          </div>
        </Section>

        {/* SMS Configuration */}
        <Section
          icon={<Phone className="w-5 h-5" />}
          title="SMS Configuration"
          saving={savingSms}
          onSave={() =>
            saveSection(
              ["twilio_account_sid", "twilio_auth_token", "twilio_phone_number", "sms_confirmation_enabled", "sms_reminder_enabled"],
              setSavingSms
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Twilio Account SID</label>
              <input
                type="text"
                value={settings.twilio_account_sid || ""}
                onChange={(e) => update("twilio_account_sid", e.target.value)}
                className={inputCls}
                placeholder="AC..."
              />
            </div>
            <div>
              <label className={labelCls}>Twilio Auth Token</label>
              <div className="relative">
                <input
                  type={showTwilioToken ? "text" : "password"}
                  value={settings.twilio_auth_token || ""}
                  onChange={(e) => update("twilio_auth_token", e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowTwilioToken(!showTwilioToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showTwilioToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Twilio Phone Number</label>
              <input
                type="text"
                value={settings.twilio_phone_number || ""}
                onChange={(e) => update("twilio_phone_number", e.target.value)}
                className={inputCls}
                placeholder="+15551234567"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_confirmation_enabled === "1" || settings.sms_confirmation_enabled === "true"}
                onChange={(e) => update("sms_confirmation_enabled", e.target.checked ? "1" : "0")}
                className="w-4 h-4 rounded border-white/20 accent-brand"
              />
              <div>
                <span className="text-sm text-gray-300">SMS booking confirmations</span>
                <div className="text-xs text-gray-500">Send SMS when a booking is confirmed</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_reminder_enabled === "1" || settings.sms_reminder_enabled === "true"}
                onChange={(e) => update("sms_reminder_enabled", e.target.checked ? "1" : "0")}
                className="w-4 h-4 rounded border-white/20 accent-brand"
              />
              <div>
                <span className="text-sm text-gray-300">SMS booking reminders</span>
                <div className="text-xs text-gray-500">Send SMS reminders before bookings</div>
              </div>
            </label>
            <div className="pt-3 border-t border-white/10">
              <div className="text-sm font-medium text-gray-300 mb-2">Test SMS</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testSmsPhone}
                  onChange={(e) => setTestSmsPhone(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="+15551234567"
                />
                <button
                  onClick={handleTestSms}
                  disabled={testingSms || !testSmsPhone}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  {testingSms ? "Sending..." : "Test"}
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* Reviews */}
        <Section
          icon={<Star className="w-5 h-5" />}
          title="Reviews"
          saving={savingReviews}
          onSave={() =>
            saveSection(
              ["review_request_enabled", "review_request_delay_hours"],
              setSavingReviews
            )
          }
        >
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.review_request_enabled === "1" || settings.review_request_enabled === "true"}
                onChange={(e) => update("review_request_enabled", e.target.checked ? "1" : "0")}
                className="w-4 h-4 rounded border-white/20 accent-brand"
              />
              <div>
                <span className="text-sm text-gray-300">Send review request emails after tours</span>
                <div className="text-xs text-gray-500">Automatically ask customers to leave a review</div>
              </div>
            </label>
            <div>
              <label className={labelCls}>Delay (hours after tour ends)</label>
              <input
                type="number"
                min="1"
                value={settings.review_request_delay_hours || "24"}
                onChange={(e) => update("review_request_delay_hours", e.target.value)}
                className={inputCls}
                placeholder="24"
              />
              <p className="text-xs text-gray-500 mt-1">How many hours after the slot ends to send the review request</p>
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
