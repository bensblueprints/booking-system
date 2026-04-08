"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Plus, Pencil, Shield, KeyRound, ToggleLeft, ToggleRight } from "lucide-react";

interface Admin {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
  active: boolean;
  last_login: string | null;
  created_at: string;
}

const defaultForm = {
  username: "",
  password: "",
  display_name: "",
  email: "",
  role: "staff",
};

export default function StaffPage() {
  const { addToast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  useEffect(() => {
    loadAdmins();
    // Get current admin ID from token
    try {
      const token = localStorage.getItem("admin_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentAdminId(payload.id || payload.adminId || null);
      }
    } catch {}
  }, []);

  const loadAdmins = async () => {
    try {
      const res = await fetchWithAuth("/api/admins");
      const data = await res.json();
      if (Array.isArray(data)) setAdmins(data);
    } catch {
      addToast("Failed to load staff", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (a: Admin) => {
    setEditId(a.id);
    setForm({
      username: a.username,
      password: "",
      display_name: a.display_name || "",
      email: a.email || "",
      role: a.role || "staff",
    });
    setModalOpen(true);
  };

  const openReset = (a: Admin) => {
    setResetId(a.id);
    setResetPassword("");
    setResetOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const payload: Record<string, string> = {
          display_name: form.display_name,
          email: form.email,
          role: form.role,
        };
        const res = await fetchWithAuth(`/api/admins/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
        addToast("Staff updated", "success");
      } else {
        if (!form.username || !form.password) { addToast("Username and password required", "error"); setSaving(false); return; }
        const res = await fetchWithAuth("/api/admins", {
          method: "POST",
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            display_name: form.display_name,
            email: form.email,
            role: form.role,
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
        addToast("Staff member created", "success");
      }
      setModalOpen(false);
      loadAdmins();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetId || !resetPassword || resetPassword.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }
    setResetting(true);
    try {
      const res = await fetchWithAuth(`/api/admins/${resetId}`, {
        method: "PUT",
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast("Password reset", "success");
      setResetOpen(false);
    } catch {
      addToast("Failed to reset password", "error");
    } finally {
      setResetting(false);
    }
  };

  const toggleActive = async (a: Admin) => {
    if (a.id === currentAdminId) {
      addToast("Cannot deactivate your own account", "error");
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/admins/${a.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !a.active }),
      });
      if (!res.ok) throw new Error("Failed");
      addToast(a.active ? "Staff deactivated" : "Staff activated", "success");
      loadAdmins();
    } catch {
      addToast("Failed to toggle status", "error");
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-purple-500/20 text-purple-400",
      manager: "bg-blue-500/20 text-blue-400",
      staff: "bg-slate-200 text-slate-700",
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${colors[role] || colors.staff}`}>{role}</span>;
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
        <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {admins.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700">No staff members found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Username</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Display Name</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Last Login</th>
                  <th className="text-left px-4 py-3 text-slate-700 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-slate-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors">
                    <td className="px-4 py-3 text-slate-900 font-medium">{a.username}</td>
                    <td className="px-4 py-3 text-slate-900">{a.display_name || "-"}</td>
                    <td className="px-4 py-3">{roleBadge(a.role)}</td>
                    <td className="px-4 py-3 text-slate-700">{a.last_login ? new Date(a.last_login).toLocaleDateString() : "Never"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.active ? "bg-green-100 text-success" : "bg-slate-200 text-slate-700"}`}>
                        {a.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-brand" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => openReset(a)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-brand" title="Reset Password">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(a)}
                          className={`p-1.5 rounded-lg transition-colors ${a.id === currentAdminId ? "text-gray-600 cursor-not-allowed" : "text-slate-700 hover:text-brand hover:bg-slate-100"}`}
                          title={a.id === currentAdminId ? "Cannot deactivate yourself" : a.active ? "Deactivate" : "Activate"}
                          disabled={a.id === currentAdminId}
                        >
                          {a.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Staff" : "New Staff Member"}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editId && (
            <>
              <div>
                <label className={labelCls}>Username *</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} required minLength={6} />
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>Display Name</label>
            <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Password">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className={labelCls}>New Password</label>
            <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className={inputCls} required minLength={6} placeholder="Minimum 6 characters" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setResetOpen(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={resetting} className="px-4 py-2 text-sm bg-brand hover:bg-brand-dark rounded-lg font-medium transition-colors disabled:opacity-50">
              {resetting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
