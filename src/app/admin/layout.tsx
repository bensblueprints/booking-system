"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { ToastProvider } from "@/components/Toast";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setAuthed(true);

    fetchWithAuth("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.business_name) setBusinessName(data.business_name);
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    document.cookie = "admin_token=; path=/; max-age=0";
    router.replace("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <AdminSidebar businessName={businessName} onLogout={handleLogout} />
        <main className="lg:ml-64 min-h-screen">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
