"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import {
  DollarSign,
  CalendarDays,
  TrendingUp,
  Download,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface RevenuePoint {
  date: string;
  revenue: number;
}

interface BookingsByProduct {
  product_name: string;
  bookings: number;
}

interface OccupancyRow {
  product_name: string;
  total_seats: number;
  booked_seats: number;
  occupancy_pct: number;
}

interface Product {
  id: number;
  name: string;
}

function formatCurrency(v: number) {
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function defaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultDateTo() {
  return new Date().toISOString().split("T")[0];
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { addToast } = useToast();
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [productFilter, setProductFilter] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [bookingsByProduct, setBookingsByProduct] = useState<BookingsByProduct[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = `date_from=${dateFrom}&date_to=${dateTo}${productFilter ? `&product_id=${productFilter}` : ""}`;
    try {
      const [revRes, bookRes, occRes] = await Promise.all([
        fetchWithAuth(`/api/reports/revenue?${qs}&group_by=day`),
        fetchWithAuth(`/api/reports/bookings?${qs}`),
        fetchWithAuth(`/api/reports/occupancy?${qs}`),
      ]);
      if (revRes.ok) {
        const d = await revRes.json();
        setRevenue(Array.isArray(d) ? d : d.data || []);
      }
      if (bookRes.ok) {
        const d = await bookRes.json();
        setBookingsByProduct(Array.isArray(d) ? d : d.data || []);
      }
      if (occRes.ok) {
        const d = await occRes.json();
        setOccupancy(Array.isArray(d) ? d : d.data || []);
      }
    } catch (err) {
      addToast("Failed to load report data", "error");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, productFilter, addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = bookingsByProduct.reduce((s, b) => s + b.bookings, 0);
  const avgOrderValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-slate-700 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-green-400" },
          { label: "Total Bookings", value: totalBookings.toLocaleString(), icon: CalendarDays, color: "text-brand" },
          { label: "Average Order Value", value: formatCurrency(avgOrderValue), icon: TrendingUp, color: "text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm text-slate-700">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Revenue Over Time</h2>
          <button
            onClick={() =>
              downloadCSV("revenue.csv", ["Date", "Revenue"], revenue.map((r) => [r.date, r.revenue.toString()]))
            }
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-700">Loading...</div>
        ) : revenue.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-700">No revenue data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bookings by Product */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bookings by Product</h2>
          <button
            onClick={() =>
              downloadCSV(
                "bookings_by_product.csv",
                ["Product", "Bookings"],
                bookingsByProduct.map((b) => [b.product_name, b.bookings.toString()])
              )
            }
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-700">Loading...</div>
        ) : bookingsByProduct.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-700">No booking data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingsByProduct}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="product_name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Occupancy Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Occupancy</h2>
          <button
            onClick={() =>
              downloadCSV(
                "occupancy.csv",
                ["Product", "Total Seats", "Booked Seats", "Occupancy %"],
                occupancy.map((o) => [o.product_name, o.total_seats.toString(), o.booked_seats.toString(), o.occupancy_pct.toString()])
              )
            }
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-brand transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-slate-700">Loading...</div>
        ) : occupancy.length === 0 ? (
          <div className="py-8 text-center text-slate-700">No occupancy data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-700">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Total Seats</th>
                  <th className="pb-3 font-medium">Booked</th>
                  <th className="pb-3 font-medium">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {occupancy.map((o, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{o.product_name}</td>
                    <td className="py-3 text-slate-700">{o.total_seats}</td>
                    <td className="py-3 text-slate-700">{o.booked_seats}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full max-w-32">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, o.occupancy_pct)}%`,
                              backgroundColor: o.occupancy_pct >= 90 ? "#ef4444" : o.occupancy_pct >= 70 ? "#F4B942" : "#22c55e",
                            }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${o.occupancy_pct >= 90 ? "text-red-400" : o.occupancy_pct >= 70 ? "text-accent" : "text-green-400"}`}>
                          {o.occupancy_pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
