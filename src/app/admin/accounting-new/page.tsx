"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { toFaDigits } from "@/lib/phone";

type Line = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  allocatedQty: number;
  unitCogs: number;
  cogsTotal: number;
};

type Alloc = {
  id: string;
  status: string;
  salesTotal: number;
  totalCogs: number;
  grossProfit: number;
  createdAt: string;
  preInvoice: {
    id: string;
    invoiceNumber?: number | null;
    customerName: string;
    customerPhone: string;
    totalPrice: number;
    createdAt: string;
  };
  lines: Line[];
};

type Batch = {
  id: string;
  quantity: number;
  unitCost: number;
  remainingQty: number;
  date: string;
  reference: string | null;
  status: string;
  product: { id: string; name: string };
  supplier: { id: string; name: string };
  purchaseInvoice?: { number: number; date: string } | null;
};

type Receipt = {
  id: string;
  amount: number;
  date: string;
  method: string;
  note: string | null;
  party: { id: string; name: string };
  preInvoice?: { invoiceNumber: number | null } | null;
};

type Kpis = {
  sales: number;
  salesCount: number;
  purchases: number;
  purchaseCount: number;
  cogs: number;
  profit: number;
};

type Party = { id: string; name: string; kind: string; phone: string | null };

const TABS = [
  { id: "pending", label: "در انتظار تأیید" },
  { id: "approved", label: "تأیید شده" },
  { id: "receipts", label: "دریافت‌ها" },
  { id: "batches", label: "لیست خرید کالاها" },
] as const;

const money = (n: number) => toFaDigits(Math.round(Number(n || 0)).toLocaleString("en-US"));

export default function AccountingNewPage() {
  const [tab, setTab] = useState<string>("pending");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [pending, setPending] = useState<Alloc[]>([]);
  const [approved, setApproved] = useState<Alloc[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // فرم دریافت
  const [rForm, setRForm] = useState({
    partyId: "",
    amount: "",
    date: "",
    method: "CASH",
    note: "",
  });

  const notify = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const qs = q.toString();

      const [main, rec, bat, par] = await Promise.all([
        fetch(`/api/admin/accounting-new${qs ? "?" + qs : ""}`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/receipts${qs ? "?" + qs : ""}`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/batches`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/parties`).then((r) => r.json().catch(() => ({ rows: [] }))),
      ]);

      if (main.kpis) setKpis(main.kpis);
      if (main.pending) setPending(main.pending);
      if (main.approved) setApproved(main.approved);
      if (rec.rows) setReceipts(rec.rows);
      if (bat.rows) setBatches(bat.rows);
      const pr = par?.rows ?? par?.parties ?? [];
      if (Array.isArray(pr)) setParties(pr);
    } catch (e) {
      notify(false, "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("این پیش‌نویس رد شود؟")) return;
    if (action === "approve" && !confirm("تأیید نهایی؟ دفتر و بهای تمام‌شده ثبت می‌شود.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/accounting-new/cogs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { action, reason: "رد توسط مدیر" } : { action }),
      });
      const data = await res.json();
      if (!res.ok) notify(false, data.error || "خطا");
      else notify(true, action === "approve" ? "تأیید و ثبت شد" : "رد شد");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function syncBatches() {
    setBusy("__sync");
    try {
      const res = await fetch("/api/admin/accounting-new/sync-batches", { method: "POST" });
      const data = await res.json();
      notify(res.ok, res.ok ? `ساخته‌شده: ${money(data.created)} — ردشده: ${money(data.skipped)}` : data.error);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function submitReceipt() {
    if (!rForm.partyId) return notify(false, "طرف حساب را انتخاب کنید");
    if (!rForm.amount || Number(rForm.amount) <= 0) return notify(false, "مبلغ درست وارد کنید");
    setBusy("__receipt");
    try {
      const res = await fetch("/api/admin/accounting-new/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rForm,
          amount: Number(rForm.amount),
          preInvoiceId: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return notify(false, data.error || "خطا");
      notify(true, "دریافت ثبت شد");
      setRForm({ partyId: "", amount: "", date: "", method: "CASH", note: "" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const kpiCard = (
    label: string,
    value: number,
    sub: string,
    Icon: typeof TrendingUp,
    tone: string
  ) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${tone}`}>{money(value)}</div>
      <div className="text-[11px] text-gray-400 mt-1">{sub}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">حسابداری جدید</h1>
        <Link href="/admin/accounting" className="text-xs text-blue-700 hover:underline">
          حسابداری قدیمی (Access)
        </Link>
      </div>

      {/* فیلتر تاریخ دلخواه */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">از تاریخ</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="۱۴۰۵/۰۱/۰۱"
            className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">تا تاریخ</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="۱۴۰۵/۰۷/۱۴"
            className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-blue-700 text-white px-4 py-1.5 text-sm hover:bg-blue-800 transition-colors duration-150"
        >
          اعمال
        </button>
        <button
          onClick={() => {
            setFrom("");
            setTo("");
          }}
          className="rounded-lg bg-gray-100 text-gray-700 px-4 py-1.5 text-sm hover:bg-gray-200 transition-colors duration-150"
        >
          پاک کردن
        </button>
      </div>

      {/* سه مبلغ بالا */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCard(
          "فروش (کل)",
          kpis?.sales ?? 0,
          `${toFaDigits(String(kpis?.salesCount ?? 0))} فاکتور تأییدشده`,
          TrendingUp,
          "text-blue-700"
        )}
        {kpiCard(
          "خرید (کل)",
          kpis?.purchases ?? 0,
          `${toFaDigits(String(kpis?.purchaseCount ?? 0))} بچ خرید`,
          ShoppingCart,
          "text-amber-700"
        )}
        {kpiCard(
          "سود (کل)",
          kpis?.profit ?? 0,
          `فروش − بهای تمام‌شده (${money(kpis?.cogs ?? 0)})`,
          Receipt,
          (kpis?.profit ?? 0) >= 0 ? "text-green-700" : "text-red-700"
        )}
      </div>

      {msg && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* تب‌ها */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors duration-150 ${
              tab === t.id ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t.label}
            {t.id === "pending" && pending.length > 0 && (
              <span
                className={`mr-2 rounded-full px-1.5 text-[11px] ${
                  tab === t.id ? "bg-white text-blue-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {toFaDigits(String(pending.length))}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-500 py-8 text-center">در حال بارگذاری…</div>}

      {/* در انتظار تأیید */}
      {!loading && tab === "pending" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {pending.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              موردی در انتظار تأیید نیست.
              <br />
              <span className="text-[11px] text-gray-400">
                فاکتورها بعد از «تکمیل شده» اینجا ظاهر می‌شوند و تا تأیید شما هیچ سندی ثبت نمی‌شود.
              </span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="p-3 text-right">شماره فاکتور</th>
                  <th className="p-3 text-right">مشتری</th>
                  <th className="p-3 text-left">مبلغ فروش</th>
                  <th className="p-3 text-left">بهای تمام‌شده</th>
                  <th className="p-3 text-left">سود ناخالص</th>
                  <th className="p-3 text-center">موجودی بچ</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((a) => {
                  const missing = a.lines.filter((l) => l.allocatedQty < l.quantity);
                  return (
                    <tr key={a.id} className="border-t border-gray-100 align-top">
                      <td className="p-3">
                        <div className="font-medium">
                          {toFaDigits(String(a.preInvoice.invoiceNumber ?? "—"))}
                        </div>
                        <button
                          onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                          className="text-[11px] text-blue-700 hover:underline"
                        >
                          {expanded === a.id ? "بستن" : `اقلام (${toFaDigits(String(a.lines.length))})`}
                        </button>
                      </td>
                      <td className="p-3">
                        <div>{a.preInvoice.customerName}</div>
                        <div className="text-[11px] text-gray-400">
                          {toFaDigits(a.preInvoice.customerPhone || "")}
                        </div>
                      </td>
                      <td className="p-3 text-left">{money(a.salesTotal)}</td>
                      <td className="p-3 text-left">{money(a.totalCogs)}</td>
                      <td
                        className={`p-3 text-left font-bold ${
                          a.grossProfit >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {money(a.grossProfit)}
                      </td>
                      <td className="p-3 text-center">
                        {missing.length === 0 ? (
                          <span className="text-green-700 text-xs">کامل</span>
                        ) : (
                          <span className="text-red-700 text-xs">
                            {toFaDigits(String(missing.length))} قلم کمبود
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          disabled={busy === a.id}
                          onClick={() => act(a.id, "approve")}
                          className="rounded-lg bg-green-700 text-white px-3 py-1 text-xs hover:bg-green-800 transition-colors duration-150 disabled:opacity-50"
                        >
                          تأیید
                        </button>
                        <button
                          disabled={busy === a.id}
                          onClick={() => act(a.id, "reject")}
                          className="rounded-lg bg-gray-100 text-gray-700 px-3 py-1 text-xs hover:bg-gray-200 transition-colors duration-150 disabled:opacity-50 mr-2"
                        >
                          رد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* جزئیات اقلام */}
      {!loading && tab === "pending" && expanded && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-bold mb-2">اقلام فاکتور و تخصیص FIFO</div>
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="p-2 text-right">کالا</th>
                <th className="p-2 text-left">تعداد</th>
                <th className="p-2 text-left">قیمت فروش</th>
                <th className="p-2 text-left">تخصیص‌یافته</th>
                <th className="p-2 text-left">بهای واحد</th>
                <th className="p-2 text-left">بهای تمام‌شده</th>
              </tr>
            </thead>
            <tbody>
              {(pending.find((x) => x.id === expanded)?.lines ?? []).map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="p-2">{l.nameSnapshot}</td>
                  <td className="p-2 text-left">{toFaDigits(String(l.quantity))}</td>
                  <td className="p-2 text-left">{money(l.unitPrice)}</td>
                  <td className="p-2 text-left">
                    {l.allocatedQty < l.quantity ? (
                      <span className="text-red-700">
                        {toFaDigits(String(l.allocatedQty))} / {toFaDigits(String(l.quantity))}
                      </span>
                    ) : (
                      toFaDigits(String(l.allocatedQty))
                    )}
                  </td>
                  <td className="p-2 text-left">{money(l.unitCogs)}</td>
                  <td className="p-2 text-left">{money(l.cogsTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* تأیید شده */}
      {!loading && tab === "approved" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {approved.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">هنوز فاکتوری تأیید نشده است.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="p-3 text-right">شماره</th>
                  <th className="p-3 text-right">مشتری</th>
                  <th className="p-3 text-right">تاریخ</th>
                  <th className="p-3 text-left">فروش</th>
                  <th className="p-3 text-left">بهای تمام‌شده</th>
                  <th className="p-3 text-left">سود</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="p-3">{toFaDigits(String(a.preInvoice.invoiceNumber ?? "—"))}</td>
                    <td className="p-3">{a.preInvoice.customerName}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {toFaDigits(String(a.preInvoice.createdAt ?? "").slice(0, 10))}
                    </td>
                    <td className="p-3 text-left">{money(a.salesTotal)}</td>
                    <td className="p-3 text-left">{money(a.totalCogs)}</td>
                    <td className="p-3 text-left font-bold text-green-700">{money(a.grossProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* دریافت‌ها */}
      {!loading && tab === "receipts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-bold mb-3">ثبت دریافت (قابل تکرار، چند مرحله‌ای)</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] text-gray-500 mb-1">مشتری</label>
                <select
                  value={rForm.partyId}
                  onChange={(e) => setRForm({ ...rForm, partyId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">— انتخاب —</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.phone ? ` — ${toFaDigits(p.phone)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">مبلغ (تومان)</label>
                <input
                  value={rForm.amount}
                  onChange={(e) => setRForm({ ...rForm, amount: e.target.value })}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-40 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">تاریخ</label>
                <input
                  value={rForm.date}
                  onChange={(e) => setRForm({ ...rForm, date: e.target.value })}
                  placeholder="۱۴۰۵/۰۷/۱۴"
                  className="w-32 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">روش</label>
                <select
                  value={rForm.method}
                  onChange={(e) => setRForm({ ...rForm, method: e.target.value })}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="CASH">نقدی</option>
                  <option value="TRANSFER">انتقال</option>
                  <option value="CHEQUE">چک</option>
                  <option value="OTHER">سایر</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[11px] text-gray-500 mb-1">یادداشت</label>
                <input
                  value={rForm.note}
                  onChange={(e) => setRForm({ ...rForm, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={submitReceipt}
                disabled={busy === "__receipt"}
                className="rounded-lg bg-blue-700 text-white px-4 py-1.5 text-sm hover:bg-blue-800 transition-colors duration-150 disabled:opacity-50"
              >
                ثبت دریافت
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-3 text-sm font-bold border-b border-gray-100">
              دریافت‌های ثبت‌شده ({toFaDigits(String(receipts.length))})
            </div>
            {receipts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">دریافتی ثبت نشده است.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="p-3 text-right">تاریخ</th>
                    <th className="p-3 text-right">مشتری</th>
                    <th className="p-3 text-left">مبلغ</th>
                    <th className="p-3 text-right">روش</th>
                    <th className="p-3 text-right">یادداشت</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="p-3 text-xs">{toFaDigits(r.date)}</td>
                      <td className="p-3">{r.party?.name}</td>
                      <td className="p-3 text-left font-medium">{money(r.amount)}</td>
                      <td className="p-3 text-xs">{r.method}</td>
                      <td className="p-3 text-xs text-gray-500">{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* لیست خرید */}
      {!loading && tab === "batches" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-bold">
              لیست خرید کالاها ({toFaDigits(String(batches.length))} بچ)
            </div>
            <button
              onClick={syncBatches}
              disabled={busy === "__sync"}
              className="flex items-center gap-1 rounded-lg bg-blue-700 text-white px-3 py-1.5 text-xs hover:bg-blue-800 transition-colors duration-150 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${busy === "__sync" ? "animate-spin" : ""}`} />
              ساخت از فاکتورهای خرید
            </button>
          </div>
          {batches.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              بچ خریدی ثبت نشده است. با دکمهٔ بالا از فاکتورهای خرید ساخته می‌شود.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="p-3 text-right">کالا</th>
                  <th className="p-3 text-right">تأمین‌کننده</th>
                  <th className="p-3 text-left">تعداد</th>
                  <th className="p-3 text-left">باقی‌مانده</th>
                  <th className="p-3 text-left">قیمت خرید واحد</th>
                  <th className="p-3 text-right">تاریخ خرید</th>
                  <th className="p-3 text-right">مرجع</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="p-3">{b.product?.name}</td>
                    <td className="p-3">{b.supplier?.name}</td>
                    <td className="p-3 text-left">{toFaDigits(String(b.quantity))}</td>
                    <td className="p-3 text-left">
                      {Number(b.remainingQty) <= 0 ? (
                        <span className="text-gray-400 text-xs">تمام شد</span>
                      ) : (
                        <span className="text-green-700">{toFaDigits(String(b.remainingQty))}</span>
                      )}
                    </td>
                    <td className="p-3 text-left">{money(b.unitCost)}</td>
                    <td className="p-3 text-xs">{toFaDigits(b.date)}</td>
                    <td className="p-3 text-xs">{b.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
