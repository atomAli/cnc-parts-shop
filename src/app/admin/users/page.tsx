"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { toFaDigits } from "@/lib/phone";

const toPersianNumber = (n: number) => n.toLocaleString("fa-IR");
const formatPrice = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n)) + " تومان";

const roleLabels: Record<string, string> = { ADMIN: "مدیر", USER: "کاربر" };

const INVOICE_STATUS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  CONTACTED: "تماس گرفته شده",
  DONE: "انجام شده",
  PROCESSING: "در حال انجام",
};

interface User {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  city: string | null;
  invoiceCount: number;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: number;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  status: string;
  source: string;
  createdAt: string;
}

interface Detail extends User {
  address: string | null;
  nationalCode: string | null;
  companyName: string | null;
  province: string | null;
  city: string | null;
  postalCode: string | null;
  cartCount: number;
  totalSpent: number;
  byStatus: Record<string, number>;
  updatedAt: string;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  nationalCode: "",
  companyName: "",
  province: "",
  city: "",
  postalCode: "",
};

const inputCls =
  "w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
const labelCls = "block text-xs font-medium text-gray-600 mb-1";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- مودال ---
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [role, setRole] = useState("USER");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // --- رمز ---
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // debounce جستجو — دیتابیس آلمان است، هر حرف یک کوئری ۱۰۰ms طول می‌کشد
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", search });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "خطا در دریافت کاربران");
        setUsers([]);
        return;
      }
      setUsers(data.users);
      setTotalPages(Math.max(1, data.pagination.pages));
    } catch {
      setError("ارتباط با سرور برقرار نشد");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setMsg(null);
    setPwMsg(null);
    setNewPassword("");
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "خطا در دریافت اطلاعات کاربر");
        return;
      }
      const u: Detail = data.user;
      setDetail(u);
      setInvoices(data.invoices || []);
      setForm({
        name: u.name || "",
        phone: u.phone || "",
        email: u.email || "",
        address: u.address || "",
        nationalCode: u.nationalCode || "",
        companyName: u.companyName || "",
        province: u.province || "",
        city: u.city || "",
        postalCode: u.postalCode || "",
      });
      setRole(u.role);
      setIsActive(u.isActive);
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setInvoices([]);
  };

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saveProfile = async () => {
    if (!detail) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role, isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || "خطا در ذخیره‌سازی" });
        return;
      }
      setMsg({ ok: true, text: "تغییرات ذخیره شد" });
      fetchUsers();
      openDetail(detail.id);
    } catch {
      setMsg({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!detail) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ ok: false, text: data?.error || "خطا در تغییر رمز" });
        return;
      }
      setPwMsg({ ok: true, text: "رمز عبور تغییر کرد" });
      setNewPassword("");
    } catch {
      setPwMsg({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setPwSaving(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fa-IR");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مدیریت کاربران</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="جستجو بر اساس نام، تلفن، ایمیل، کد ملی، شرکت یا شهر..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">نام</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">تلفن</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">ایمیل</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">نقش</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">وضعیت</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">فاکتور</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">عضویت</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">در حال بارگذاری...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">کاربری یافت نشد</td></tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openDetail(user.id)}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium">
                      {user.name || "-"}
                      {user.city && <span className="text-xs text-gray-400"> · {user.city}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm" dir="ltr">{user.phone ? toFaDigits(user.phone) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {user.isActive ? "فعال" : "مسدود"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{toPersianNumber(user.invoiceCount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(user.id); }}
                        className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150"
                      >
                        ویرایش
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <span className="text-sm text-gray-500">صفحه {toPersianNumber(page)} از {toPersianNumber(totalPages)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-lg disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded-lg disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- مودال جزئیات ---------- */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeDetail} />
          <div className="relative z-10 bg-white rounded-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold">اطلاعات کاربر</h2>
              <button onClick={closeDetail} className="p-1 rounded hover:bg-gray-100" aria-label="بستن">
                <X size={18} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                <Loader2 size={18} className="animate-spin" /> در حال بارگذاری...
              </div>
            ) : (
              <div className="space-y-6 p-6">
                {/* آمار */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="تعداد فاکتور" value={toPersianNumber(detail.invoiceCount)} />
                  <StatBox label="مجموع خرید" value={formatPrice(detail.totalSpent)} />
                  <StatBox label="اقلام در سبد" value={toPersianNumber(detail.cartCount)} />
                </div>

                {/* اطلاعات اصلی */}
                <Section title="اطلاعات اصلی">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>نام و نام خانوادگی</label>
                      <input className={inputCls} value={form.name} onChange={(e) => setField("name", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>تلفن همراه</label>
                      <input dir="ltr" className={inputCls} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="09123456789" />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>ایمیل</label>
                      <input dir="ltr" className={inputCls} value={form.email} onChange={(e) => setField("email", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>آدرس</label>
                      <textarea rows={2} className={inputCls} value={form.address} onChange={(e) => setField("address", e.target.value)} />
                    </div>
                  </div>
                </Section>

                {/* اطلاعات تکمیلی — فقط مدیر پر می‌کند */}
                <Section title="اطلاعات تکمیلی (فقط مدیر)" hint="این فیلدها در فرم ثبت‌نام مشتری نیست">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>کد ملی</label>
                      <input dir="ltr" maxLength={10} className={inputCls} value={form.nationalCode} onChange={(e) => setField("nationalCode", e.target.value)} placeholder="۱۰ رقم" />
                    </div>
                    <div>
                      <label className={labelCls}>نام شرکت</label>
                      <input className={inputCls} value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>استان</label>
                      <input className={inputCls} value={form.province} onChange={(e) => setField("province", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>شهر</label>
                      <input className={inputCls} value={form.city} onChange={(e) => setField("city", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>کد پستی</label>
                      <input dir="ltr" maxLength={10} className={inputCls} value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value)} />
                    </div>
                  </div>
                </Section>

                {/* نقش و وضعیت */}
                <Section title="نقش و دسترسی">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>نقش</label>
                      <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="USER">کاربر</option>
                        <option value="ADMIN">مدیر</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>وضعیت حساب</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsActive(true)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                            isActive ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          فعال
                        </button>
                        <button
                          onClick={() => setIsActive(false)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                            !isActive ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          مسدود
                        </button>
                      </div>
                    </div>
                  </div>
                  {!isActive && (
                    <p className="mt-2 text-xs text-red-600">
                      با مسدود کردن، کاربر نمی‌تواند وارد سایت شود. فاکتورها و سوابق او دست‌نخورده باقی می‌ماند.
                    </p>
                  )}
                </Section>

                {/* تاریخچه فاکتور */}
                <Section title={`فاکتورها (${toPersianNumber(invoices.length)})`}>
                  {invoices.length === 0 ? (
                    <p className="text-sm text-gray-500">این کاربر هیچ فاکتوری ندارد.</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">شماره</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">مبلغ</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">وضعیت</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">منبع</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="border-b">
                              <td className="px-3 py-2 text-sm" dir="ltr">#{inv.invoiceNumber}</td>
                              <td className="px-3 py-2 text-sm">{formatPrice(inv.totalPrice)}</td>
                              <td className="px-3 py-2 text-sm">
                                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                  {INVOICE_STATUS[inv.status] || inv.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {inv.source === "WEBSITE" ? "سایت" : "پنل"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">{formatDate(inv.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>

                {/* رمز عبور */}
                <Section title="رمز عبور" hint="کاربر خودش نمی‌تواند رمز عوض کند؛ این تنها راه بازکردن حساب است">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      className={inputCls}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز جدید (حداقل ۶ کاراکتر)"
                    />
                    <button
                      onClick={savePassword}
                      disabled={pwSaving || newPassword.length === 0}
                      className="px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-150 disabled:opacity-50 whitespace-nowrap"
                    >
                      {pwSaving ? "در حال ذخیره..." : "تعیین رمز جدید"}
                    </button>
                  </div>
                  {pwMsg && (
                    <p className={`mt-2 text-sm ${pwMsg.ok ? "text-green-600" : "text-red-600"}`}>{pwMsg.text}</p>
                  )}
                </Section>

                {/* ذخیره */}
                {msg && (
                  <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
                )}
                <div className="flex justify-end gap-2 border-t pt-4">
                  <button onClick={closeDetail} className="px-5 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50">
                    بستن
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50"
                  >
                    {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-2">{title}</h3>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3 text-center bg-gray-50">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}