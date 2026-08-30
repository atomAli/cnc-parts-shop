"use client";

import { useState } from "react";
import { Search, Shield, ShieldOff, UserX, UserCheck } from "lucide-react";

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "ADMIN" | "USER";
  ordersCount: number;
  createdAt: string;
  active: boolean;
}

const mockUsers: User[] = [
  { id: "1", name: "علی رجمندی", phone: "09120000000", email: "ali@example.com", role: "ADMIN", ordersCount: 15, createdAt: "۱۴۰۱/۰۱/۰۱", active: true },
  { id: "2", name: "محمد احمدی", phone: "09121234567", email: "", role: "USER", ordersCount: 8, createdAt: "۱۴۰۱/۰۳/۱۵", active: true },
  { id: "3", name: "رضا کریمی", phone: "09198765432", email: "", role: "USER", ordersCount: 3, createdAt: "۱۴۰۲/۰۵/۲۰", active: true },
  { id: "4", name: "مریم محمدی", phone: "09351234567", email: "maryam@example.com", role: "USER", ordersCount: 12, createdAt: "۱۴۰۱/۰۸/۱۰", active: false },
  { id: "5", name: "حسین عباسی", phone: "09129876543", email: "", role: "USER", ordersCount: 0, createdAt: "۱۴۰۳/۰۱/۰۱", active: true },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.includes(searchQuery) ||
      user.phone.includes(searchQuery) ||
      user.email.includes(searchQuery);
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleRole = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? { ...user, role: user.role === "ADMIN" ? "USER" : "ADMIN" }
          : user
      )
    );
  };

  const toggleActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, active: !user.active } : user
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت کاربران</h1>
        <div className="text-sm text-gray-500">{filteredUsers.length} کاربر</div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کاربر..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">همه نقش‌ها</option>
          <option value="ADMIN">ادمین</option>
          <option value="USER">کاربر</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">کاربر</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تلفن</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">ایمیل</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">نقش</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تعداد سفارش</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تاریخ عضویت</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">وضعیت</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {user.name.charAt(0)}
                      </div>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" dir="ltr">{user.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.email || "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role === "ADMIN" ? "ادمین" : "کاربر"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{user.ordersCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.createdAt}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRole(user.id)}
                        className={`p-2 rounded-lg ${
                          user.role === "ADMIN"
                            ? "hover:bg-red-50 text-red-600"
                            : "hover:bg-purple-50 text-purple-600"
                        }`}
                        title={user.role === "ADMIN" ? "حذف دسترسی ادمین" : "ارتقا به ادمین"}
                      >
                        {user.role === "ADMIN" ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                      <button
                        onClick={() => toggleActive(user.id)}
                        className={`p-2 rounded-lg ${
                          user.active
                            ? "hover:bg-red-50 text-red-600"
                            : "hover:bg-green-50 text-green-600"
                        }`}
                        title={user.active ? "غیرفعال کردن" : "فعال کردن"}
                      >
                        {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
