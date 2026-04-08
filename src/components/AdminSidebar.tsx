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
  Users,
  ClipboardCheck,
  FileSignature,
  Star,
  Shield,
  Truck,
  ListPlus,
  BarChart3,
  Gift,
  TrendingUp,
  Share2,
  Webhook,
  FormInput,
  Store,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Booking",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/slots", label: "Slots & Calendar", icon: CalendarDays },
      { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag },
      { href: "/admin/addons", label: "Add-ons", icon: PackagePlus },
      { href: "/admin/blackout-dates", label: "Blackout Dates", icon: CalendarX },
      { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/check-in", label: "Check-in", icon: ClipboardCheck },
      { href: "/admin/waivers", label: "Waivers", icon: FileSignature },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/staff", label: "Staff", icon: Shield },
      { href: "/admin/resources", label: "Resources", icon: Truck },
      { href: "/admin/waitlist", label: "Waitlist", icon: ListPlus },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/gift-cards", label: "Gift Cards", icon: Gift },
      { href: "/admin/pricing", label: "Pricing Rules", icon: TrendingUp },
      { href: "/admin/affiliates", label: "Affiliates", icon: Share2 },
      { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/admin/custom-fields", label: "Custom Fields", icon: FormInput },
      { href: "/admin/walkin", label: "Walk-in", icon: Store },
    ],
  },
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
      <div className="px-5 py-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
            <Anchor className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">
              {businessName || "Booking Admin"}
            </div>
            <div className="text-xs text-slate-700">Management</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand text-slate-50"
                        : "text-slate-900 hover:text-brand hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-200">
          <Link
            href="/admin/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive("/admin/settings")
                ? "bg-brand text-slate-50"
                : "text-slate-900 hover:text-brand hover:bg-slate-100"
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            Settings
          </Link>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-danger hover:bg-slate-100 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Log Out
        </button>
      </div>
      <div className="px-5 py-3 border-t border-slate-200">
        <a href="https://advancedmarketing.co" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-brand transition-colors">
          Designed by advancedmarketing.co
        </a>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg border border-slate-200"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 fixed top-0 left-0 bottom-0">
        {sidebar}
      </aside>
    </>
  );
}
