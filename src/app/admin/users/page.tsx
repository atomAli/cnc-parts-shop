"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { toFaDigits } from "@/lib/phone";
import { todayJalali } from "@/lib/jalali";
import { LEDGER_LABEL } from "@/lib/ledger";

const toPersianNumber = (n: number) => n.toLocaleString("fa-IR");
const formatPrice = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n)) + " تومان";

const roleLabels: Record<string, string> = { ADMIN: "مدیر", USER: "کاربر" };

const INVOICE_STATUS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  CONTACTED: "تماس گرفته شده",
  DONE: "انجام شده",
  PROCESSING: "در حال انجام",
  CANCELLED: "لغو شده",
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

interface HistoryInvoice {
  id: string;
  number: number;
  date: string;
  total: number;
  discount: number;
  note: string;
  status: string;
  source: string;
  kind: string;
}

interface HistoryMovement {
  id: string;
  date: string;
  amount: number;
  label: string;
  note: string;
  voucher: number;
  source: string;
  kind: string;
}

interface History {
  party: { id: string; name: string } | null;
  invoices: HistoryInvoice[];
  movements: HistoryMovement[];
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

const normalizeDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

const escHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.round(Number(n) || 0)) + " تومان";

/** سند دفتری برای صورت حساب چاپی — ساختار خروجی /api/admin/users/[id]/statement */
interface StatementRow {
  id: string;
  date: string;
  voucherType: number;
  voucher: number;
  amount: number;
  description: string | null;
  source: string;
  running: number;
}

interface StatementData {
  party: { id: string; name: string } | null;
  noParty?: boolean;
  rows?: StatementRow[];
  totals?: { count: number; debit: number; credit: number; balance: number };
}

/**
 * HTML کاملاً مستقل برای پنجرهٔ چاپ — بدون هیچ فایل جانبی.
 * منبع: دفتر کل طرف‌حساب، دقیقاً همان چیزی که تب «حساب افراد» حسابداری جدید نشان می‌دهد.
 */
function buildStatementHtml(user: User, data: StatementData, from: string, to: string) {
  const rows = data.rows || [];
  const totals = data.totals || { count: 0, debit: 0, credit: 0, balance: 0 };
  const person = data.party?.name || user.name || user.phone || "-";
  const range = from || to ? `از ${from || "ابتدای تاریخ"} تا ${to || "امروز"}` : "کل دوره";

  const docRows = rows.length
    ? rows
        .map((r, idx) => {
          const kind = `${toFaDigits(String(r.voucherType))} — ${LEDGER_LABEL[r.voucherType] || ""}`;
          const cls = r.amount < 0 ? "g" : r.amount > 0 ? "r" : "";
          return `<tr>
        <td class="c">${toFaDigits(String(idx + 1))}</td>
        <td class="c">${r.date ? toFaDigits(r.date) : "-"}</td>
        <td>${escHtml(r.description || "")}</td>
        <td class="c">${escHtml(kind)}</td>
        <td class="n ${cls}">${fmtMoney(r.amount)}</td>
        <td class="n">${fmtMoney(r.running)}</td>
      </tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">${
        data.noParty
          ? "این کاربر در دفتر کل طرف‌حسابی ندارد."
          : "سندی در این بازه ثبت نشده است."
      }</td></tr>`;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>صورت حساب — ${escHtml(person)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Tahoma, Arial, sans-serif; font-size: 12px; color: #111; background: #fff; margin: 0; padding: 14px; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .head { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
  .sub { font-size: 12px; color: #333; margin: 1px 0; }
  h2 { font-size: 13px; margin: 14px 0 5px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #888; padding: 4px 6px; text-align: right; }
  th { background: #eee; font-weight: bold; }
  td.c { text-align: center; }
  td.n { white-space: nowrap; }
  td.empty { text-align: center; color: #777; }
  td.g { color: #15803d; }
  td.r { color: #b91c1c; }
  .totals { width: 70%; margin-top: 10px; border-collapse: collapse; }
  .totals td { border: 1px solid #888; padding: 5px 7px; }
  .totals td.v { text-align: left; white-space: nowrap; }
  .totals tr.t { background: #f3f3f3; font-weight: bold; }
  .note { font-size: 11px; color: #444; margin-top: 5px; }
  .sign { margin-top: 34px; display: flex; justify-content: space-between; }
  .sign div { width: 45%; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 11px; color: #444; }
  @page { size: A4; margin: 12mm; }
  @media print { body { padding: 0; } h2 { page-break-after: avoid; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="head">
    <h1>صورت حساب</h1>
    <p class="sub">مشتری / طرف‌حساب: <b>${escHtml(person)}</b></p>
    <p class="sub">شماره تماس: <span dir="ltr">${escHtml(user.phone ? toFaDigits(user.phone) : "-")}</span></p>
    <p class="sub">بازه: ${escHtml(range)} — تاریخ چاپ: ${escHtml(todayJalali())}</p>
    <p class="sub">منبع: دفتر کل (همان تب «حساب افراد» در حسابداری جدید)</p>
  </div>

  <h2>اسناد دفتر (${toFaDigits(String(totals.count))})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>تاریخ</th><th>شرح</th><th>نوع سند</th><th>مبلغ</th><th>مانده</th>
      </tr>
    </thead>
    <tbody>${docRows}</tbody>
  </table>

  <table class="totals">
    <tr><td>تعداد اسناد</td><td class="v">${toFaDigits(String(totals.count))}</td></tr>
    <tr><td>جمع اسناد بدهکار (طلب ما از او)</td><td class="v">${fmtMoney(Math.abs(totals.debit))}</td></tr>
    <tr><td>جمع اسناد بستانکار (طلب او از ما)</td><td class="v">${fmtMoney(totals.credit)}</td></tr>
    <tr class="t"><td>مانده حساب</td><td class="v">${fmtMoney(totals.balance)}</td></tr>
  </table>

  <p class="note">
    منفی = طرف حساب بدهکار ماست (طلب ما از او) — مثبت = بستانکار (طلب او از ما).
    ماندهٔ بالا همان «مانده» تب «حساب افراد» در حسابداری جدید است.
  </p>

  <div class="sign">
    <div>امضای مشتری</div>
    <div>مهر و امضای فروش</div>
  </div>
</body>
</html>`;
}

/** چاپ در iframe مخفی — بدون popup blocker */
function printHtml(html: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return false;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow;
    setTimeout(() => {
      try {
        win?.focus();
        win?.print();
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }, 350);
    return true;
  } catch {
    return false;
  }
}

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

  // --- سوابق کاربر (دیتابیس قدیم) ---
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDeleting, setHistoryDeleting] = useState("");
  const [historyMsg, setHistoryMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // --- صورت حساب (پرینت) ---
  const [stmtUser, setStmtUser] = useState<User | null>(null);
  const [stmtFrom, setStmtFrom] = useState("");
  const [stmtTo, setStmtTo] = useState("");
  const [stmtLoading, setStmtLoading] = useState(false);
  const [stmtMsg, setStmtMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  const loadHistory = async (uid: string, range?: { from?: string; to?: string }) => {
    setHistoryLoading(true);
    setHistoryMsg(null);
    setHistory(null);
    try {
      const qs = new URLSearchParams();
      if (range?.from) qs.set("from", range.from);
      if (range?.to) qs.set("to", range.to);
      const q = qs.toString();
      const res = await fetch(`/api/admin/users/${uid}/history${q ? `?${q}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setHistoryMsg({ ok: false, text: data?.error || "خطا در دریافت سوابق" });
        return;
      }
      setHistory({
        party: data.party || null,
        invoices: data.invoices || [],
        movements: data.movements || [],
      });
    } catch {
      setHistoryMsg({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = (user: User) => {
    setHistoryUser(user);
    loadHistory(user.id);
  };

  const closeHistory = () => {
    setHistoryUser(null);
    setHistory(null);
    setHistoryMsg(null);
    setHistoryDeleting("");
  };

  const deleteHistoryRecord = async (type: string, recId: string, label: string) => {
    if (!historyUser) return;
    const ok = window.confirm(
      `رکورد زیر برای همیشه حذف شود؟\n\n${label}\n\nاین رکورد از دیتابیس قدیم پاک می‌شود و قابل بازگشت نیست.`
    );
    if (!ok) return;

    setHistoryDeleting(recId);
    setHistoryMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${historyUser.id}/history`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: recId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHistoryMsg({ ok: false, text: data?.error || "حذف ناموفق بود" });
        return;
      }
      setHistoryMsg({ ok: true, text: "رکورد حذف شد" });
      await loadHistory(historyUser.id);
    } catch {
      setHistoryMsg({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setHistoryDeleting("");
    }
  };

  // ---------- صورت حساب / پرینت ----------
  const openStatement = (user: User) => {
    setStmtUser(user);
    // پیش‌فرض «کل دوره» تا ماندهٔ چاپی دقیقاً با «حساب افراد» یکی باشد
    setStmtFrom("");
    setStmtTo("");
    setStmtMsg(null);
  };

  const closeStatement = () => {
    setStmtUser(null);
    setStmtMsg(null);
  };

  const printStatement = async () => {
    if (!stmtUser) return;
    const from = normalizeDigits(stmtFrom.trim());
    const to = normalizeDigits(stmtTo.trim());
    const DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;
    if (from && !DATE_RE.test(from)) {
      setStmtMsg({ ok: false, text: "تاریخ شروع نامعتبر است (مثال: ۱۴۰۴/۰۱/۰۱)" });
      return;
    }
    if (to && !DATE_RE.test(to)) {
      setStmtMsg({ ok: false, text: "تاریخ پایان نامعتبر است (مثال: ۱۴۰۵/۱۲/۲۹)" });
      return;
    }
    if (from && to && from > to) {
      setStmtMsg({ ok: false, text: "تاریخ شروع باید قبل از تاریخ پایان باشد" });
      return;
    }

    setStmtLoading(true);
    setStmtMsg(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const q = qs.toString();
      const res = await fetch(`/api/admin/users/${stmtUser.id}/statement${q ? `?${q}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setStmtMsg({ ok: false, text: data?.error || "خطا در دریافت صورت حساب" });
        return;
      }
      const ok = printHtml(buildStatementHtml(stmtUser, data, from, to));
      setStmtMsg(
        ok
          ? { ok: true, text: "پنجرهٔ چاپ باز شد — در آن «ذخیره به‌صورت PDF» یا پرینتر را انتخاب کنید." }
          : { ok: false, text: "مرورگر پنجرهٔ چاپ را مسدود کرد؛ دوباره تلاش کنید." }
      );
    } catch {
      setStmtMsg({ ok: false, text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setStmtLoading(false);
    }
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
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetail(user.id); }}
                          className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openHistory(user); }}
                          className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors duration-150"
                        >
                          سوابق
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openStatement(user); }}
                          className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors duration-150"
                        >
                          صورت حساب
                        </button>
                      </div>
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

      {/* ---------- مودال سوابق کاربر (دیتابیس قدیم) ---------- */}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeHistory} />
          <div className="relative z-10 bg-white rounded-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold">
                سوابق کاربر — {historyUser.name || toFaDigits(historyUser.phone || "")}
              </h2>
              <button onClick={closeHistory} className="p-1 rounded hover:bg-gray-100" aria-label="بستن">
                <X size={18} />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                <Loader2 size={18} className="animate-spin" /> در حال بارگذاری...
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <p className="text-xs text-gray-500">
                  هر دو منبع: رکوردهای دیتابیس قدیم (Access) و فاکتور/سند ثبت‌شده روی همین سایت.
                </p>

                {historyMsg && (
                  <p className={`text-sm ${historyMsg.ok ? "text-green-600" : "text-red-600"}`}>{historyMsg.text}</p>
                )}

                {history && !history.party && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    این کاربر طرف‌حساب ندارد؛ فقط فاکتورهای ثبت‌شده روی سایت نمایش داده می‌شود.
                  </p>
                )}

                {history ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatBox label="تعداد فاکتور" value={toPersianNumber(history.invoices.length)} />
                      <StatBox
                        label="مجموع فاکتور"
                        value={formatPrice(history.invoices.reduce((s, i) => s + (i.total || 0), 0))}
                      />
                      <StatBox label="تعداد واریزی/دریافتی" value={toPersianNumber(history.movements.length)} />
                      <StatBox
                        label="مجموع دریافتی"
                        value={formatPrice(
                          history.movements.filter((m) => m.label === "دریافتی").reduce((s, m) => s + (m.amount || 0), 0)
                        )}
                      />
                    </div>

                    {/* فاکتورها */}
                    <Section title={`فاکتورها (${toPersianNumber(history.invoices.length)})`}>
                      {history.invoices.length === 0 ? (
                        <p className="text-sm text-gray-500">فاکتوری ثبت نشده است.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">شماره</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">تاریخ</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">مبلغ</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">تخفیف</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">منبع</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">شرح</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">عملیات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.invoices.map((inv) => (
                                <tr key={inv.id} className="border-b">
                                  <td className="px-3 py-2 text-sm" dir="ltr">#{inv.number}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{inv.date ? toFaDigits(inv.date) : "-"}</td>
                                  <td className="px-3 py-2 text-sm">{formatPrice(inv.total)}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{inv.discount ? formatPrice(inv.discount) : "-"}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        inv.source === "قدیم"
                                          ? "bg-gray-100 text-gray-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {inv.source}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{inv.note || "-"}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      disabled={historyDeleting === inv.id}
                                      onClick={() =>
                                        deleteHistoryRecord(
                                          inv.kind,
                                          inv.id,
                                          `فاکتور فروش #${inv.number}\nتاریخ: ${inv.date || "-"}\nمبلغ: ${formatPrice(inv.total)}\nمنبع: ${inv.source}`
                                        )
                                      }
                                      className="px-2 py-1 text-xs font-medium bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                                    >
                                      {historyDeleting === inv.id ? "..." : "حذف"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Section>

                    {/* واریزی و دریافتی‌ها */}
                    <Section title={`واریزی و دریافتی‌ها (${toPersianNumber(history.movements.length)})`}>
                      {history.movements.length === 0 ? (
                        <p className="text-sm text-gray-500">واریزی یا دریافتی ثبت نشده است.</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">تاریخ</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">نوع</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">مبلغ</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">سند</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">منبع</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">شرح</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">عملیات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.movements.map((m) => (
                                <tr key={m.id} className="border-b">
                                  <td className="px-3 py-2 text-sm text-gray-500">{m.date ? toFaDigits(m.date) : "-"}</td>
                                  <td className="px-3 py-2 text-sm">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        m.label === "دریافتی"
                                          ? "bg-green-100 text-green-700"
                                          : m.label === "واریزی"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {m.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm">{formatPrice(m.amount)}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500" dir="ltr">{toFaDigits(String(m.voucher))}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        m.source === "قدیم"
                                          ? "bg-gray-100 text-gray-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {m.source}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-500">{m.note || "-"}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      disabled={historyDeleting === m.id}
                                      onClick={() =>
                                        deleteHistoryRecord(
                                          m.kind,
                                          m.id,
                                          `${m.label} ${formatPrice(m.amount)}\nتاریخ: ${m.date || "-"}\nسند: ${m.voucher}\nمنبع: ${m.source}`
                                        )
                                      }
                                      className="px-2 py-1 text-xs font-medium bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                                    >
                                      {historyDeleting === m.id ? "..." : "حذف"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Section>
                  </>
                ) : null}

                <div className="flex justify-end border-t pt-4">
                  <button onClick={closeHistory} className="px-5 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50">
                    بستن
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- مودال پرینت صورت حساب ---------- */}
      {stmtUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeStatement} />
          <div className="relative z-10 bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold">پرینت صورت حساب</h2>
              <button onClick={closeStatement} className="p-1 rounded hover:bg-gray-100" aria-label="بستن">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                مشتری: <b>{stmtUser.name || toFaDigits(stmtUser.phone || "-")}</b>
              </p>
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
                منبع چاپ: دفتر کل طرف‌حساب — دقیقاً همان‌چیزی که تب «حساب افراد» در
                حسابداری جدید نشان می‌دهد، پس مانده‌ها با هم سینک است.
              </p>

              <div>
                <p className="text-xs text-gray-500 mb-2">
                  بازهٔ تاریخ را انتخاب کنید (شمسی). فیلد خالی = بدون محدودیت.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>از تاریخ</label>
                    <input
                      dir="ltr"
                      className={inputCls}
                      value={stmtFrom}
                      onChange={(e) => setStmtFrom(e.target.value)}
                      placeholder={toFaDigits("1404/01/01")}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>تا تاریخ</label>
                    <input
                      dir="ltr"
                      className={inputCls}
                      value={stmtTo}
                      onChange={(e) => setStmtTo(e.target.value)}
                      placeholder={toFaDigits("1405/12/29")}
                    />
                  </div>
                </div>
              </div>

              {stmtMsg && (
                <p className={`text-sm ${stmtMsg.ok ? "text-green-600" : "text-red-600"}`}>{stmtMsg.text}</p>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  onClick={closeStatement}
                  className="px-5 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  onClick={printStatement}
                  disabled={stmtLoading}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50"
                >
                  {stmtLoading ? "در حال آماده‌سازی..." : "پرینت / ذخیره PDF"}
                </button>
              </div>
            </div>
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