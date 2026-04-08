"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Anchor,
  Tag,
  PackagePlus,
  CalendarX,
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/slots", label: "Slots & Calendar", icon: CalendarDays },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag },
  { href: "/admin/addons", label: "Add-ons", icon: PackagePlus },
  { href: "/admin/blackout-dates", label: "Blackout Dates", icon: CalendarX },
  { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminSidebarProps {
  businessName?: string;
  onLogout: () => void;
}

export default function AdminSidebar({ businessName, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">
              {businessName || "Booking Admin"}
            </div>
            <div className="text-xs text-gray-400">Management</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-danger hover:bg-white/5 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Log Out
        </button>
      </div>
      <div className="px-5 py-3 border-t border-white/10">
        <a href="https://advancedmarketing.co" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-brand transition-colors">
          Designed by advancedmarketing.co
        </a>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface-light rounded-lg border border-white/10"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-surface-light border-r border-white/10 z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <aside className="hidden lg:block w-64 bg-surface-light border-r border-white/10 fixed top-0 left-0 bottom-0">
        {sidebar}
      </aside>
    </>
  );
}
