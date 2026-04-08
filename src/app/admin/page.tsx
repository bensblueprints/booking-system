"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  CalendarDays,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  BookOpen,
} from "lucide-react";

interface Booking {
  id: number;
  customer_name: string;
  customer_email: string;
  party_size: number;
  total_amount: number;
  deposit_amount: number;
  payment_status: string;
  date: string;
  start_time: string;
  end_time: string;
  product_name: string;
}

interface Slot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  total_seats: number;
  booked_seats: number;
  product_name: string;
  product_color: string;
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsRes, slotsRes] = await Promise.all([
        fetchWithAuth("/api/bookings"),
        fetchWithAuth("/api/slots"),
      ]);
      const bData = await bookingsRes.json();
      const sData = await slotsRes.json();
      if (Array.isArray(bData)) setBookings(bData);
      if (Array.isArray(sData)) setSlots(sData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthStart = today.slice(0, 8) + "01";

  const todayBookings = bookings.filter((b) => b.date === today);
  const weekBookings = bookings.filter((b) => b.date >= weekAgo);
  const monthBookings = bookings.filter((b) => b.date >= monthStart);

  const depositsCollected = bookings
    .filter((b) => b.payment_status === "deposit_paid" || b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

  const totalPending = bookings
    .filter((b) => b.payment_status === "pending")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const upcomingSlots = slots
    .filter((s) => s.date >= today)
    .slice(0, 6);

  const recentBookings = bookings.slice(0, 10);

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-success";
      case "deposit_paid": return "bg-brand/20 text-brand-light";
      case "pending": return "bg-warning/20 text-warning";
      case "cancelled": return "bg-danger/20 text-danger";
      default: return "bg-slate-200 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Today"
          value={todayBookings.length}
          sub="bookings"
          color="bg-brand"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="This Week"
          value={weekBookings.length}
          sub="bookings"
          color="bg-accent"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="This Month"
          value={monthBookings.length}
          sub="bookings"
          color="bg-success"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Deposits Collected"
          value={`$${depositsCollected.toFixed(2)}`}
          sub={`$${totalPending.toFixed(2)} pending`}
          color="bg-warning"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-light" />
            Upcoming Slots
          </h2>
          {upcomingSlots.length === 0 ? (
            <p className="text-slate-700 text-sm">No upcoming slots</p>
          ) : (
            <div className="space-y-3">
              {upcomingSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: slot.product_color || "#1B6B8A" }}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{slot.product_name}</div>
                      <div className="text-xs text-slate-700">
                        {slot.date} &middot; {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {slot.booked_seats}/{slot.total_seats}
                    </div>
                    <div className="text-xs text-slate-700">seats</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-light" />
            Recent Bookings
          </h2>
          {recentBookings.length === 0 ? (
            <p className="text-slate-700 text-sm">No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{b.customer_name}</div>
                    <div className="text-xs text-slate-700">
                      {b.product_name} &middot; {b.date} &middot; {b.party_size} guests
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${b.total_amount?.toFixed(2)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(b.payment_status)}`}>
                      {b.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} w-9 h-9 rounded-lg flex items-center justify-center text-slate-900`}>
          {icon}
        </div>
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-700 mt-1">{sub}</div>
    </div>
  );
}
