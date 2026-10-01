"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Layers,
  Tag,
  BellRing,
  Globe,
  Clock,
  FileText,
} from "lucide-react";
import Link from "next/link";

const toPersianNumber = (n: number) =>
  n.toLocaleString("fa-IR");

const statusLabels: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تایید شده",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
}

interface InvoiceStats {
  total: number;
  byStatus: { PENDING: number; PROCESSING: number; CONTACTED: number; DONE: number };
  fromWebsite: number;
  recent: Array<{
    id: string;
    invoiceNumber?: number;
    customerName: string;
    customerPhone: string;
    totalPrice: number;
    status: string;
    source?: string | null;
    createdAt: string;
  }>;
}

const invoiceStatusLabels: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  PROCESSING: "در حال پردازش",
  CONTACTED: "تماس گرفته شد",
  DONE: "تکمیل شده",
};

const invoiceStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-green-100 text-green-700",
  DONE: "bg-gray-100 text-gray-600",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "همین الان";
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR");
}

interface RecentOrder {
  id: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  user: { name: string } | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
      });
    fetch("/api/admin/invoices/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setInvoiceStats(d); });
  }, []);

  const statCards = stats
    ? [
        { label: "تعداد محصولات", value: toPersianNumber(stats.totalProducts), icon: Package, color: "bg-blue-500", href: "/admin/products" },
        { label: "دسته‌بندی‌ها", value: toPersianNumber(stats.totalCategories), icon: Layers, color: "bg-green-500", href: "/admin/categories" },
        { label: "برندها", value: toPersianNumber(stats.totalBrands), icon: Tag, color: "bg-orange-500", href: "/admin/brands" },
        { label: "سفارشات", value: toPersianNumber(stats.totalOrders), icon: ShoppingCart, color: "bg-purple-500", href: "/admin/orders" },
        { label: "کاربران", value: toPersianNumber(stats.totalUsers), icon: Users, color: "bg-pink-500", href: "/admin/users" },
        {
          label: "فروش کل",
          value: toPersianNumber(stats.totalRevenue),
          suffix: " تومان",
          icon: TrendingUp,
          color: "bg-amber-500",
          href: "/admin/orders",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">داشبورد</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`${stat.color} text-white p-3 rounded-lg`}>
                <stat.icon size={24} />
              </div>
              <div className="text-2xl font-bold">
                {stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-gray-500">{stat.suffix}</span>
                )}
              </div>
            </div>
            <div className="text-gray-500 text-sm">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* سفارش‌های جدید سایت */}
      <div
        className={
          "bg-white rounded-xl shadow-sm border overflow-hidden " +
          (invoiceStats && invoiceStats.byStatus.PENDING > 0
            ? "border-amber-200 ring-1 ring-amber-100"
            : "border-gray-100")
        }
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {invoiceStats && invoiceStats.byStatus.PENDING > 0 ? (
              <div className="relative">
                <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <BellRing size={22} />
                </div>
                <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {toPersianNumber(invoiceStats.byStatus.PENDING)}
                </span>
              </div>
            ) : (
              <div className="w-11 h-11 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center">
                <BellRing size={22} />
              </div>
            )}
            <div>
              <h2 className="font-bold text-lg">سفارش‌های سایت</h2>
              <p className="text-xs text-gray-500">
                {invoiceStats
                  ? `${toPersianNumber(invoiceStats.fromWebsite)} سفارش از سایت ثبت شده`
                  : "در حال بارگذاری..."}
              </p>
            </div>
          </div>
          <Link
            href="/admin/pre-invoices"
            className="text-blue-600 text-sm hover:underline flex items-center gap-1"
          >
            مدیریت فاکتورها
            <BellRing size={14} />
          </Link>
        </div>

        {invoiceStats && invoiceStats.byStatus.PENDING > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-amber-800 text-sm">
            <Clock size={16} />
            <span className="font-bold">{toPersianNumber(invoiceStats.byStatus.PENDING)} فاکتور</span>
            در انتظار تماس و بررسی شماست
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">مشتری</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">مبلغ</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">منبع</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">زمان</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {!invoiceStats ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : invoiceStats.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    سفارشی ثبت نشده است
                  </td>
                </tr>
              ) : (
                invoiceStats.recent.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div className="font-medium text-sm">{inv.customerName}</div>
                      <div className="text-xs text-gray-500" dir="ltr">{inv.customerPhone}</div>
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-600" dir="ltr">
                      {toPersianNumber(inv.totalPrice)} تومان
                    </td>
                    <td className="px-6 py-3">
                      {inv.source === "WEBSITE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-[11px] font-bold">
                          <Globe size={11} />
                          سایت
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[11px] font-bold">
                          <FileText size={11} />
                          ثبت دستی
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{relativeTime(inv.createdAt)}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoiceStatusColors[inv.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {invoiceStatusLabels[inv.status] || inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg">آخرین سفارشات</h2>
          <Link href="/admin/orders" className="text-blue-600 text-sm hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">شماره</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">مشتری</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">مبلغ</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    سفارشی ثبت نشده است
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">{order.user?.name || "نامشخص"}</td>
                    <td className="px-6 py-4" dir="ltr">{toPersianNumber(order.totalPrice)} تومان</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          statusColors[order.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/products"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <Package size={32} className="mx-auto text-blue-500 mb-2" />
          <div className="font-bold">مدیریت محصولات</div>
          <div className="text-sm text-gray-500 mt-1">اضافه، ویرایش و حذف محصولات</div>
        </Link>
        <Link
          href="/admin/categories"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <Layers size={32} className="mx-auto text-green-500 mb-2" />
          <div className="font-bold">مدیریت دسته‌بندی‌ها</div>
          <div className="text-sm text-gray-500 mt-1">ساختار کتگوری‌های محصولات</div>
        </Link>
        <Link
          href="/admin/orders"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center"
        >
          <ShoppingCart size={32} className="mx-auto text-purple-500 mb-2" />
          <div className="font-bold">مدیریت سفارشات</div>
          <div className="text-sm text-gray-500 mt-1">پیگیری و مدیریت سفارشات</div>
        </Link>
      </div>
    </div>
  );
}
