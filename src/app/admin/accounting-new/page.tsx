"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
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

type PurchaseItem = {
  productId: string;
  name: string;
  soldQty: number;
  purchasedQty: number;
  remainingQty: number;
  shortage: number;
  avgCost: number | null;
  manualTotal: number;
  manual: {
    id: string;
    quantity: number;
    unitCost: number;
    total: number;
    date: string;
    supplier: { id: string; name: string } | null;
  }[];
};

type Kpis = {
  sales: number;
  salesCount: number;
  purchases: number;
  purchaseCount: number;
  cogs: number;
  profit: number;
};

type Party = {
  id: string;
  name: string;
  kind: string;
  phone: string | null;
  balance?: number;
  entries?: number;
  newEntries?: number;
};

const TABS = [
  { id: "approved", label: "تأیید شده" },
  { id: "purchase", label: "لیست خرید" },
  { id: "parties", label: "حساب افراد" },
  { id: "receipts", label: "دریافت‌ها" },
  { id: "batches", label: "آمار خرید کالا" },
] as const;

const money = (n: number) => toFaDigits(Math.round(Number(n || 0)).toLocaleString("en-US"));

export default function AccountingNewPage() {
  const [tab, setTab] = useState<string>("approved");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [approved, setApproved] = useState<Alloc[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // لیست خرید
  const [plist, setPlist] = useState<PurchaseItem[]>([]);
  const [pForm, setPForm] = useState<
    Record<string, { quantity: string; unitCost: string; supplierId: string }>
  >({});

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

      const [main, rec, bat, par, pl] = await Promise.all([
        fetch(`/api/admin/accounting-new${qs ? "?" + qs : ""}`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/receipts${qs ? "?" + qs : ""}`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/batches`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/parties`).then((r) => r.json().catch(() => ({ rows: [] }))),
        fetch(`/api/admin/accounting-new/purchase-list`).then((r) => r.json().catch(() => ({ rows: [] }))),
      ]);

      if (main.kpis) setKpis(main.kpis);
      if (main.approved) setApproved(main.approved);
      if (Array.isArray(pl?.rows)) setPlist(pl.rows);
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

  async function delAlloc(id: string) {
    if (!confirm("تخصیص تأییدشده حذف شود؟ سند دفتر و بهای تمام‌شده پاک و بچ‌ها بازگردانده می‌شود.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/accounting-new/cogs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) notify(false, data.error || "خطا در حذف");
      else notify(true, "تخصیص حذف شد");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function submitPurchase(productId: string) {
    const f = pForm[productId];
    if (!f) return notify(false, "ابتدا تعداد و قیمت را وارد کنید");
    if (!f.quantity || Number(f.quantity) <= 0) return notify(false, "تعداد درست وارد کنید");
    if (!f.supplierId) return notify(false, "تأمین‌کننده را انتخاب کنید");
    setBusy("__buy");
    try {
      const res = await fetch("/api/admin/accounting-new/purchase-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          supplierId: f.supplierId,
          quantity: Number(f.quantity),
          unitCost: Number(f.unitCost || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) return notify(false, data.error || "خطا در ثبت خرید");
      notify(true, "خرید ثبت شد");
      setPForm({ ...pForm, [productId]: { quantity: "", unitCost: f.unitCost, supplierId: f.supplierId } });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function delManual(batchId: string) {
    if (!confirm("این خرید دستی حذف شود؟")) return;
    setBusy(batchId);
    try {
      const res = await fetch(`/api/admin/accounting-new/purchase-list/${batchId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) notify(false, data.error || "خطا در حذف");
      else notify(true, "حذف شد");
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
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-500 py-8 text-center">در حال بارگذاری…</div>}

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
                  <th className="p-3 text-left"></th>
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
                    <td className="p-3 text-left">
                      <button
                        onClick={() => delAlloc(a.id)}
                        disabled={busy === a.id}
                        className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                      >
                        {busy === a.id ? "…" : "حذف"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* لیست خرید */}
      {!loading && tab === "purchase" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 leading-6">
            کالاهایی که در فاکتور فروش آمده‌اند. «کمبود» یعنی هنوز نخریده‌اید؛ هر خریدی که ثبت کنید
            هم کمبود را کم می‌کند و هم به «خرید کل» بالای صفحه می‌پیوندد.
          </div>

          {plist.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              کالایی در فاکتور فروش نیست.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="p-3 text-right">کالا</th>
                    <th className="p-3 text-left">فروش رفته</th>
                    <th className="p-3 text-left">خریداری‌شده</th>
                    <th className="p-3 text-left">در انبار</th>
                    <th className="p-3 text-left">کمبود</th>
                    <th className="p-3 text-left">خرید ثبت‌شده</th>
                  </tr>
                </thead>
                <tbody>
                  {plist.map((it) => {
                    const open = expanded === it.productId;
                    const f = pForm[it.productId] ?? {
                      quantity: it.shortage > 0 ? String(it.shortage) : "",
                      unitCost: it.avgCost != null ? String(Math.round(it.avgCost)) : "",
                      supplierId: "",
                    };
                    const suppliers = parties.filter((pp) => pp.kind === "SUPPLIER");
                    return (
                      <Fragment key={it.productId}>
                        <tr
                          onClick={() => setExpanded(open ? null : it.productId)}
                          className={
                            "border-t border-gray-100 cursor-pointer transition-colors duration-150 " +
                            (open ? "bg-blue-50" : "hover:bg-gray-50")
                          }
                        >
                          <td className="p-3">{it.name}</td>
                          <td className="p-3 text-left text-gray-600">{money(it.soldQty)}</td>
                          <td className="p-3 text-left text-gray-500">{money(it.purchasedQty)}</td>
                          <td className="p-3 text-left text-gray-500">{money(it.remainingQty)}</td>
                          <td className="p-3 text-left">
                            {it.shortage > 0 ? (
                              <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                {money(it.shortage)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-left text-xs text-gray-500">
                            {it.manualTotal > 0 ? money(it.manualTotal) : "—"}
                          </td>
                        </tr>

                        {open && (
                          <tr className="bg-gray-50 border-t border-gray-200">
                            <td colSpan={6} className="p-4">
                              {/* فیلد کمبود */}
                              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2">
                                <span className="text-xs text-gray-500">کمبود این کالا</span>
                                <span className="text-lg font-bold text-red-700">
                                  {money(it.shortage)}
                                </span>
                                <span className="text-xs text-gray-500">عدد</span>
                              </div>

                              {/* ثبت خرید — دقیقاً زیر فیلد کمبود */}
                              <div className="flex flex-wrap gap-3 items-end">
                                <div className="w-[110px]">
                                  <label className="block text-[11px] text-gray-500 mb-1">تعداد</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={f.quantity}
                                    onChange={(e) =>
                                      setPForm({ ...pForm, [it.productId]: { ...f, quantity: e.target.value } })
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="w-[160px]">
                                  <label className="block text-[11px] text-gray-500 mb-1">
                                    قیمت واحد (تومان)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={f.unitCost}
                                    onChange={(e) =>
                                      setPForm({ ...pForm, [it.productId]: { ...f, unitCost: e.target.value } })
                                    }
                                    placeholder={it.avgCost != null ? String(Math.round(it.avgCost)) : "0"}
                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                  <label className="block text-[11px] text-gray-500 mb-1">تأمین‌کننده</label>
                                  <select
                                    value={f.supplierId}
                                    onChange={(e) =>
                                      setPForm({ ...pForm, [it.productId]: { ...f, supplierId: e.target.value } })
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                  >
                                    <option value="">— انتخاب کنید —</option>
                                    {suppliers.map((sp) => (
                                      <option key={sp.id} value={sp.id}>
                                        {sp.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => submitPurchase(it.productId)}
                                  disabled={busy === "__buy"}
                                  className="rounded-lg bg-blue-700 px-4 py-1.5 text-sm text-white hover:bg-blue-800 transition-colors duration-150 disabled:opacity-50"
                                >
                                  {busy === "__buy" ? "…" : "ثبت خرید"}
                                </button>
                              </div>

                              {/* جمع این خرید */}
                              {it.manual.length > 0 && (
                                <div className="mt-4">
                                  <div className="text-xs font-bold text-gray-600 mb-2">
                                    خریدهای ثبت‌شده این کالا — جمع:{" "}
                                    <span className="text-blue-700">{money(it.manualTotal)} تومان</span>
                                  </div>
                                  <table className="w-full text-xs bg-white rounded-lg border border-gray-200">
                                    <tbody>
                                      {it.manual.map((m) => (
                                        <tr key={m.id} className="border-t border-gray-100 first:border-t-0">
                                          <td className="p-2 text-gray-500">{toFaDigits(m.date)}</td>
                                          <td className="p-2">{m.supplier?.name ?? "—"}</td>
                                          <td className="p-2 text-left">{money(m.quantity)} عدد</td>
                                          <td className="p-2 text-left">{money(m.unitCost)}</td>
                                          <td className="p-2 text-left font-bold">{money(m.total)} تومان</td>
                                          <td className="p-2 text-left">
                                            <button
                                              onClick={() => delManual(m.id)}
                                              disabled={busy === m.id}
                                              className="rounded-lg border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                                            >
                                              {busy === m.id ? "…" : "حذف"}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* حساب افراد */}
      {!loading && tab === "parties" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {(() => {
            const rows = parties
              .filter((p) => (p.entries ?? 0) > 0)
              .sort((a, b) => Math.abs(b.balance ?? 0) - Math.abs(a.balance ?? 0));
            const total = rows.reduce((sum, p) => sum + Number(p.balance ?? 0), 0);

            if (rows.length === 0) {
              return (
                <div className="p-6 text-center text-sm text-gray-500">هنوز طرف‌حسابی سند ندارد.</div>
              );
            }

            return (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="p-3 text-right">نام</th>
                      <th className="p-3 text-right">نوع</th>
                      <th className="p-3 text-right">تلفن</th>
                      <th className="p-3 text-left">اسناد</th>
                      <th className="p-3 text-left">مانده</th>
                      <th className="p-3 text-right">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const bal = Number(p.balance ?? 0);
                      const state = bal < -0.5 ? "بدهکار" : bal > 0.5 ? "بستانکار" : "تسویه";
                      const stateCls =
                        bal < -0.5
                          ? "bg-green-100 text-green-700"
                          : bal > 0.5
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600";
                      return (
                        <tr key={p.id} className="border-t border-gray-100">
                          <td className="p-3">{p.name}</td>
                          <td className="p-3 text-xs text-gray-500">{p.kind}</td>
                          <td className="p-3 text-xs text-gray-500">
                            {p.phone ? toFaDigits(p.phone) : "—"}
                          </td>
                          <td className="p-3 text-left text-xs text-gray-500">
                            {toFaDigits(String(p.entries ?? 0))}
                            {(p.newEntries ?? 0) > 0 && (
                              <span className="text-blue-700"> ({toFaDigits(String(p.newEntries))} جدید)</span>
                            )}
                          </td>
                          <td
                            className={
                              "p-3 text-left font-bold " +
                              (bal < -0.5 ? "text-green-700" : bal > 0.5 ? "text-red-700" : "text-gray-600")
                            }
                          >
                            {money(bal)}
                          </td>
                          <td className="p-3 text-right">
                            <span className={"rounded-lg px-2 py-0.5 text-xs " + stateCls}>{state}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50 font-bold">
                      <td className="p-3" colSpan={4}>
                        مجموع {toFaDigits(String(rows.length))} طرف‌حساب
                      </td>
                      <td className={"p-3 text-left " + (total < 0 ? "text-green-700" : total > 0 ? "text-red-700" : "text-gray-600")}>
                        {money(total)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                <div className="p-3 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-200">
                  منفی = طرف حساب بدهکار ماست (طلب ما از او) — مثبت = بستانکار (طلب او از ما)
                </div>
              </>
            );
          })()}
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
