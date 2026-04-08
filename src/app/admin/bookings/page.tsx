"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Search,
  Filter,
  Eye,
  XCircle,
  Calendar,
  RefreshCw,
  DollarSign,
  Mail,
  Ban,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  slot_id: number;
  product_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  party_size: number;
  total_amount: number;
  deposit_amount: number;
  payment_status: string;
  status?: string;
  payment_provider: string | null;
  payment_id: string | null;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  product_name: string;
  product_price: number;
}

const PAYMENT_STATUSES = [
  { value: "", label: "All Payment" },
  { value: "pending", label: "Pending" },
  { value: "deposit_paid", label: "Deposit Paid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const BOOKING_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

export default function BookingsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [updating, setUpdating] = useState(false);

  // Refund modal state
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [dateFrom, dateTo, productFilter, statusFilter, bookingStatusFilter]);

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {}
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (productFilter) params.set("product_id", productFilter);
      if (statusFilter) params.set("payment_status", statusFilter);
      if (bookingStatusFilter) params.set("status", bookingStatusFilter);

      const res = await fetchWithAuth(`/api/bookings?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setBookings(data);
    } catch {
      addToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.customer_name.toLowerCase().includes(q) ||
      b.customer_email.toLowerCase().includes(q)
    );
  });

  const handleUpdateStatus = async () => {
    if (!detailBooking || !statusUpdate) return;
    setUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/bookings/${detailBooking.id}`, {
        method: "PUT",
        body: JSON.stringify({ payment_status: statusUpdate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Status updated", "success");
      setDetailBooking(null);
      loadBookings();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this booking? Seats will be restored.")) return;
    try {
      const res = await fetchWithAuth(`/api/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Booking cancelled", "success");
      setDetailBooking(null);
      loadBookings();
    } catch (err) {
      addToast((err as Error).message, "error");
    }
  };

  const handleRefund = async () => {
    if (!refundBooking) return;
    setRefunding(true);
    try {
      const res = await fetchWithAuth("/api/refunds", {
        method: "POST",
        body: JSON.stringify({
          booking_id: refundBooking.id,
          amount: parseFloat(refundAmount),
          reason: refundReason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Refund processed", "success");
      setRefundBooking(null);
      setRefundAmount("");
      setRefundReason("");
      loadBookings();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setRefunding(false);
    }
  };

  const handleResendEmail = async (booking: Booking) => {
    try {
      const res = await fetchWithAuth(`/api/bookings/${booking.id}/resend-email`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Confirmation email resent", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    }
  };

  const handleCalSync = async (booking: Booking) => {
    try {
      const res = await fetchWithAuth("/api/calendar/sync", {
        method: "POST",
        body: JSON.stringify({ booking_id: booking.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      addToast("Synced to Google Calendar", "success");
    } catch (err) {
      addToast((err as Error).message, "error");
    }
  };

  const paymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success/20 text-success";
      case "deposit_paid": return "bg-brand/20 text-brand-light";
      case "pending": return "bg-warning/20 text-warning";
      case "cancelled": return "bg-danger/20 text-danger";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const bookingStatusColor = (status: string | undefined) => {
    switch (status) {
      case "confirmed": return "bg-success/20 text-success";
      case "cancelled": return "bg-danger/20 text-danger";
      case "no_show": return "bg-warning/20 text-warning";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const canRefund = (b: Booking) =>
    b.payment_status === "deposit_paid" || b.payment_status === "paid";

  const inputCls =
    "px-3 py-2 bg-surface-light border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <button
          onClick={loadBookings}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-surface-light rounded-xl border border-white/10 p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-9 w-full`}
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputCls}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputCls}
          />
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className={inputCls}
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputCls}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <select
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
            className={inputCls}
          >
            {BOOKING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-light rounded-xl border border-white/10 p-12 text-center">
          <p className="text-gray-400">No bookings found.</p>
        </div>
      ) : (
        <div className="bg-surface-light rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Party</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Deposit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Payment</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white whitespace-nowrap">{b.date}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {b.start_time} - {b.end_time}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{b.product_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-white">{b.customer_name}</div>
                      <div className="text-xs text-gray-400">{b.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{b.party_size}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      ${b.total_amount?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      ${b.deposit_amount?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${paymentStatusColor(b.payment_status)}`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${bookingStatusColor(b.status)}`}>
                        {b.status || "confirmed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setDetailBooking(b);
                            setStatusUpdate(b.payment_status);
                          }}
                          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleCalSync(b)}
                          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                          title="Sync to Calendar"
                        >
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleResendEmail(b)}
                          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                          title="Resend confirmation email"
                        >
                          <Mail className="w-4 h-4 text-gray-400" />
                        </button>
                        {canRefund(b) && (
                          <button
                            onClick={() => {
                              setRefundBooking(b);
                              setRefundAmount(String(b.deposit_amount || 0));
                              setRefundReason("");
                            }}
                            className="p-1.5 hover:bg-warning/10 rounded-lg transition-colors"
                            title="Refund"
                          >
                            <DollarSign className="w-4 h-4 text-warning" />
                          </button>
                        )}
                        {(b.status || "confirmed") !== "cancelled" && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="p-1.5 hover:bg-danger/10 rounded-lg transition-colors"
                            title="Cancel booking"
                          >
                            <Ban className="w-4 h-4 text-danger" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detailBooking}
        onClose={() => setDetailBooking(null)}
        title="Booking Details"
      >
        {detailBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-400">Customer</div>
                <div className="text-white font-medium">{detailBooking.customer_name}</div>
              </div>
              <div>
                <div className="text-gray-400">Email</div>
                <div className="text-white">{detailBooking.customer_email}</div>
              </div>
              <div>
                <div className="text-gray-400">Phone</div>
                <div className="text-white">{detailBooking.customer_phone || "N/A"}</div>
              </div>
              <div>
                <div className="text-gray-400">Party Size</div>
                <div className="text-white">{detailBooking.party_size}</div>
              </div>
              <div>
                <div className="text-gray-400">Product</div>
                <div className="text-white">{detailBooking.product_name}</div>
              </div>
              <div>
                <div className="text-gray-400">Date & Time</div>
                <div className="text-white">
                  {detailBooking.date} {detailBooking.start_time}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Total Amount</div>
                <div className="text-white font-medium">${detailBooking.total_amount?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400">Deposit</div>
                <div className="text-white">${detailBooking.deposit_amount?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400">Booking Status</div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${bookingStatusColor(detailBooking.status)}`}>
                    {detailBooking.status || "confirmed"}
                  </span>
                </div>
              </div>
              {detailBooking.notes && (
                <div className="col-span-2">
                  <div className="text-gray-400">Notes</div>
                  <div className="text-white">{detailBooking.notes}</div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Update Payment Status
              </label>
              <div className="flex gap-3">
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand"
                >
                  <option value="pending">Pending</option>
                  <option value="deposit_paid">Deposit Paid</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating || statusUpdate === detailBooking.payment_status}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Update"}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/10">
              <button
                onClick={() => handleResendEmail(detailBooking)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Resend Email
              </button>
              {canRefund(detailBooking) && (
                <button
                  onClick={() => {
                    setRefundBooking(detailBooking);
                    setRefundAmount(String(detailBooking.deposit_amount || 0));
                    setRefundReason("");
                    setDetailBooking(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-warning/20 hover:bg-warning/30 text-warning rounded-lg transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Refund
                </button>
              )}
              {(detailBooking.status || "confirmed") !== "cancelled" && (
                <button
                  onClick={() => handleCancel(detailBooking.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-danger/20 hover:bg-danger/30 text-danger rounded-lg transition-colors ml-auto"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel Booking
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal
        open={!!refundBooking}
        onClose={() => setRefundBooking(null)}
        title="Process Refund"
      >
        {refundBooking && (
          <div className="space-y-4">
            <div className="bg-surface rounded-lg p-3 border border-white/5 text-sm">
              <div className="text-gray-400">Booking #{refundBooking.id}</div>
              <div className="text-white font-medium">{refundBooking.customer_name}</div>
              <div className="text-gray-300 text-xs">
                {refundBooking.product_name} - {refundBooking.date}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Refund Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={refundBooking.total_amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deposit: ${refundBooking.deposit_amount?.toFixed(2)} | Total: ${refundBooking.total_amount?.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reason
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-sm h-20 resize-none"
                placeholder="Reason for refund..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setRefundBooking(null)}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding || !refundAmount}
                className="px-4 py-2 text-sm bg-warning hover:bg-warning/80 text-black rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {refunding ? "Processing..." : "Process Refund"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
