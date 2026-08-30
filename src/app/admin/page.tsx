"use client";

import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "تعداد محصولات",
    value: "۱۲۸",
    change: "+۱۲",
    trend: "up",
    icon: Package,
    color: "bg-blue-500",
    href: "/admin/products",
  },
  {
    label: "سفارشات امروز",
    value: "۵",
    change: "+۲",
    trend: "up",
    icon: ShoppingCart,
    color: "bg-green-500",
    href: "/admin/orders",
  },
  {
    label: "کاربران ثبت‌نام شده",
    value: "۳۴۲",
    change: "+۲۸",
    trend: "up",
    icon: Users,
    color: "bg-purple-500",
    href: "/admin/users",
  },
  {
    label: "فروش ماه جاری",
    value: "۱۵,۰۰۰,۰۰۰",
    change: "+۲۳%",
    trend: "up",
    icon: TrendingUp,
    color: "bg-orange-500",
    href: "/admin/orders",
    suffix: " تومان",
  },
];

const recentOrders = [
  { id: "۱۰۲۱", customer: "علی رجمندی", total: "۲۵,۰۰۰,۰۰۰", status: "تایید شده", date: "۱۴۰۳/۰۴/۱۵" },
  { id: "۱۰۲۰", customer: "محمد احمدی", total: "۸,۵۰۰,۰۰۰", status: "در انتظار", date: "۱۴۰۳/۰۴/۱۵" },
  { id: "۱۰۱۹", customer: "رضا کریمی", total: "۱۲,۰۰۰,۰۰۰", status: "ارسال شده", date: "۱۴۰۳/۰۴/۱۴" },
  { id: "۱۰۱۸", customer: "مریم محمدی", total: "۳۵,۰۰۰,۰۰۰", status: "تحویل شده", date: "۱۴۰۳/۰۴/۱۴" },
  { id: "۱۰۱۷", customer: "حسین عباسی", total: "۶,۲۰۰,۰۰۰", status: "تایید شده", date: "۱403/04/13" },
];

const statusColors: Record<string, string> = {
  "در انتظار": "bg-yellow-100 text-yellow-700",
  "تایید شده": "bg-blue-100 text-blue-700",
  "ارسال شده": "bg-purple-100 text-purple-700",
  "تحویل شده": "bg-green-100 text-green-700",
  "لغو شده": "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">داشبورد</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} text-white p-3 rounded-lg`}>
                <stat.icon size={24} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}
                {stat.change}
              </div>
            </div>
            <div className="text-2xl font-bold">
              {stat.value}
              {stat.suffix && (
                <span className="text-sm font-normal text-gray-500">{stat.suffix}</span>
              )}
            </div>
            <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
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
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">شماره سفارش</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">مشتری</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">مبلغ</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">وضعیت</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">#{order.id}</td>
                  <td className="px-6 py-4">{order.customer}</td>
                  <td className="px-6 py-4" dir="ltr">{order.total} تومان</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[order.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
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
          <Package size={32} className="mx-auto text-green-500 mb-2" />
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
