"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { getProductMaxLength, metersToBranches } from "@/lib/meter-product";
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
    date: string;
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

type PurchaseItem = {
  productId: string;
  name: string;
  isMeter: boolean;
  soldQty: number;
  soldBranches: number;
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

type RecRow = {
  id: string;
  date: string;
  voucherType: number;
  amount: number;
  description: string;
  source: string;
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
  { id: "batches", label: "آمار خرید کالا" },
] as const;

const money = (n: number) => toFaDigits(Math.round(Number(n || 0)).toLocaleString("en-US"));

export default function AccountingNewPage() {
  const [tab, setTab] = useState<string>("approved");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [approved, setApproved] = useState<Alloc[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // لیست خرید
  const [plist, setPlist] = useState<PurchaseItem[]>([]);
  const [pForm, setPForm] = useState<
    Record<
      string,
      { quantity: string; unitCost: string; supplierId: string; supplierQuery: string; branchCount: string; branchLength: string }
    >
  >({});

  // رکورد دستی روی طرف‌حساب (باز شدن ردیف در «حساب افراد»)
  const [openParty, setOpenParty] = useState<string | null>(null);
  const [partyRecs, setPartyRecs] = useState<RecRow[]>([]);
  const [partyToday, setPartyToday] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [recForm, setRecForm] = useState({ kind: "RECEIPT", amount: "", date: "", note: "" });

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

      const [main, bat, par, pl] = await Promise.all([
        fetch(`/api/admin/accounting-new${qs ? "?" + qs : ""}`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/batches`).then((r) => r.json()),
        fetch(`/api/admin/accounting-new/parties`).then((r) => r.json().catch(() => ({ rows: [] }))),
        fetch(`/api/admin/accounting-new/purchase-list`).then((r) => r.json().catch(() => ({ rows: [] }))),
      ]);

      if (main.kpis) setKpis(main.kpis);
      if (main.approved) setApproved(main.approved);
      if (Array.isArray(pl?.rows)) setPlist(pl.rows);
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

  async function fetchRecords(partyId: string) {
    setRecLoading(true);
    try {
      const res = await fetch(`/api/admin/accounting-new/records?partyId=${encodeURIComponent(partyId)}`);
      const d = await res.json();
      setPartyRecs(Array.isArray(d.rows) ? d.rows : []);
      const today = typeof d.today === "string" ? d.today : "";
      setPartyToday(today);
      setRecForm((f) => ({ ...f, date: f.date || today }));
    } catch {
      setPartyRecs([]);
    } finally {
      setRecLoading(false);
    }
  }

  async function toggleParty(partyId: string) {
    if (openParty === partyId) {
      setOpenParty(null);
      setPartyRecs([]);
      return;
    }
    setOpenParty(partyId);
    setRecForm({ kind: "RECEIPT", amount: "", date: "", note: "" });
    await fetchRecords(partyId);
  }

  async function submitRecord() {
    if (!openParty) return;
    const amount = Number(recForm.amount);
    if (!amount || amount <= 0) return notify(false, "مبلغ درست وارد کنید");
    const date = recForm.date || partyToday;
    if (!date) return notify(false, "تاریخ را وارد کنید");
    setBusy("rec");
    try {
      const res = await fetch("/api/admin/accounting-new/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: openParty,
          kind: recForm.kind,
          amount,
          date,
          note: recForm.note,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return notify(false, d.error || "خطا در ثبت");
      notify(true, recForm.kind === "DEBT" ? "بدهی ثبت شد" : "دریافت ثبت شد");
      setRecForm({ kind: recForm.kind, amount: "", date, note: "" });
      await fetchRecords(openParty);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function delRec(r: RecRow) {
    const label = `${r.date || "بدون تاریخ"} — ${r.description || "-"} — ${money(r.amount)}`;
    if (
      !confirm(
        `این سند از دفتر کل حذف شود؟\n\n${label}\n\nحذف دائمی است و ماندهٔ «حساب افراد» را تغییر می‌دهد.`
      )
    )
      return;
    setBusy(r.id);
    try {
      const res = await fetch("/api/admin/accounting-new/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, partyId: openParty }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return notify(false, d.error || "حذف ناموفق بود");
      notify(true, "سند حذف شد");
      if (openParty) await fetchRecords(openParty);
      await load();
    } catch {
      notify(false, "ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(null);
    }
  }

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
    if (!f.supplierId) return notify(false, "تأمین‌کننده را از لیست جستجو انتخاب کنید");
    const isMeter = plist.find((x) => x.productId === productId)?.isMeter === true;
    if (isMeter) {
      if (!f.branchCount || Number(f.branchCount) <= 0) return notify(false, "تعداد شاخه را درست وارد کنید");
      if (!f.branchLength || Number(f.branchLength) <= 0) return notify(false, "متراژ هر شاخه را درست وارد کنید");
    } else if (!f.quantity || Number(f.quantity) <= 0) {
      return notify(false, "تعداد درست وارد کنید");
    }
    setBusy("__buy");
    try {
      const res = await fetch("/api/admin/accounting-new/purchase-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          supplierId: f.supplierId,
          quantity: isMeter ? Number(f.branchCount) * Number(f.branchLength) / 100 : Number(f.quantity),
          unitCost: Number(f.unitCost || 0),
          branchCount: isMeter ? Number(f.branchCount) : undefined,
          branchLength: isMeter ? Number(f.branchLength) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return notify(false, data.error || "خطا در ثبت خرید");
      notify(true, "خرید ثبت شد");
      setPForm({
        ...pForm,
        [productId]: {
          quantity: "",
          unitCost: f.unitCost,
          supplierId: f.supplierId,
          supplierQuery: f.supplierQuery,
          branchCount: "",
          branchLength: f.branchLength,
        },
      });
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
        <h1 className="text-lg font-bold">حسابداری</h1>
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
          `${toFaDigits(String(kpis?.salesCount ?? 0))} فاکتور فروش`,
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
          `فروش کل − خرید کل`,
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
                      {toFaDigits(a.preInvoice.date)}
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
            فقط کالاهایی که در <b>فاکتورهای «تکمیل شده»ٔ سایت</b> آمده‌اند — فاکتورهای قدیمی و
            فاکتورهای در جریان حساب نمی‌شوند.
            «کمبود» یعنی هنوز نخریده‌اید؛ هر خریدی که ثبت کنید هم کمبود را کم می‌کند و هم به
            «خرید کل» بالای صفحه می‌پیوندد. برای کالاهای متری، متراژ = تعداد شاخه × متراژ هر شاخه ÷ ۱۰۰؛ مقادیر برای دقتِ بیشتر بر حسب <b>سانتی‌متر</b> نمایش داده می‌شوند (قیمت همچنان «هر متر» است) و کمبود کامل نوشته می‌شود (مثلاً «۳۲۰۰ سانتی‌متر = ۸ شاخهٔ ۴ متری») که همان تعداد به‌صورت پیش‌فرض در فرم خرید می‌نشیند.
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
                    <th className="p-3 text-left">فروش رفته (عدد / سانتی‌متر)</th>
                    <th className="p-3 text-left">خریداری‌شده</th>
                    <th className="p-3 text-left">در انبار</th>
                    <th className="p-3 text-left">کمبود</th>
                    <th className="p-3 text-left">خرید ثبت‌شده</th>
                  </tr>
                </thead>
                <tbody>
                  {plist.map((it) => {
                    const open = expanded === it.productId;
                    // کالای متری: کمبود را کامل می‌نویسیم — «۳۲ متر = ۸ شاخهٔ ۴ متری»
                    const branchLenCm = it.isMeter
                      ? getProductMaxLength({ name: it.name, isMeter: true })
                      : 0;
                    const conv = it.isMeter
                      ? metersToBranches(it.shortage, branchLenCm)
                      : { count: 0, exact: false, lengthM: 0 };
                    const branchText =
                      conv.count > 0
                        ? `${conv.exact ? "=" : "≈"} ${money(conv.count)} شاخهٔ ${money(conv.lengthM)} متری`
                        : "";
                    const f = pForm[it.productId] ?? {
                      quantity: it.shortage > 0 ? String(it.shortage) : "",
                      unitCost: it.avgCost != null ? String(Math.round(it.avgCost)) : "",
                      supplierId: "",
                      supplierQuery: "",
                      branchCount: conv.count > 0 ? String(conv.count) : "",
                      branchLength: it.isMeter ? String(branchLenCm) : "",
                    };
                    const suppliers = parties.filter((pp) => pp.kind === "SUPPLIER");
                    // مقادیر داخلی بر حسب «متر» ثبت می‌شوند؛ برای دقتِ نمایش ×۱۰۰ → سانتی‌متر
                    const u = it.isMeter ? "سانتی‌متر" : "عدد";
                    const q = (v: number) => money(it.isMeter ? v * 100 : v);
                    const meterFrom = Number(f.branchCount) > 0 && Number(f.branchLength) > 0
                      ? (Number(f.branchCount) * Number(f.branchLength)) / 100
                      : 0;
                    return (
                      <Fragment key={it.productId}>
                        <tr
                          onClick={() => setExpanded(open ? null : it.productId)}
                          className={
                            "border-t border-gray-100 cursor-pointer transition-colors duration-150 " +
                            (open ? "bg-blue-50" : "hover:bg-gray-50")
                          }
                        >
                          <td className="p-3">
                            {it.name}
                            {it.isMeter && (
                              <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                متری
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-left text-gray-600">
                            {q(it.soldQty)} <span className="text-[11px] text-gray-400">{u}</span>
                            {it.isMeter && it.soldBranches > 0 && (
                              <div className="text-[11px] text-amber-700">
                                {money(it.soldBranches)} شاخه
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-left text-gray-500">
                            {q(it.purchasedQty)} <span className="text-[11px] text-gray-400">{u}</span>
                          </td>
                          <td className="p-3 text-left text-gray-500">
                            {q(it.remainingQty)} <span className="text-[11px] text-gray-400">{u}</span>
                          </td>
                          <td className="p-3 text-left">
                            {it.shortage > 0 ? (
                              <>
                                <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                  {q(it.shortage)} {u}
                                </span>
                                {branchText && (
                                  <div className="mt-1 text-[11px] font-bold text-amber-700">
                                    {branchText}
                                  </div>
                                )}
                              </>
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
                                  {q(it.shortage)}
                                </span>
                                <span className="text-xs text-gray-500">{u}</span>
                                {branchText && (
                                  <span className="text-xs font-bold text-amber-700">{branchText}</span>
                                )}
                              </div>

                              {/* ثبت خرید — دقیقاً زیر فیلد کمبود */}
                              <div className="flex flex-wrap gap-3 items-end">
                                {it.isMeter ? (
                                  <>
                                    <div className="w-[110px]">
                                      <label className="block text-[11px] text-gray-500 mb-1">تعداد شاخه</label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={f.branchCount}
                                        onChange={(e) =>
                                          setPForm({ ...pForm, [it.productId]: { ...f, branchCount: e.target.value } })
                                        }
                                        placeholder={it.soldBranches > 0 ? String(it.soldBranches) : "1"}
                                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div className="w-[150px]">
                                      <label className="block text-[11px] text-gray-500 mb-1">
                                        متراژ هر شاخه (سانتی‌متر)
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={f.branchLength}
                                        onChange={(e) =>
                                          setPForm({ ...pForm, [it.productId]: { ...f, branchLength: e.target.value } })
                                        }
                                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div className="w-[120px]">
                                      <label className="block text-[11px] text-gray-500 mb-1">متراژ کل (سانتی‌متر)</label>
                                      <div className="border border-dashed border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white text-blue-700 font-bold">
                                        {meterFrom > 0 ? money(meterFrom * 100) : "—"}
                                      </div>
                                    </div>
                                  </>
                                ) : (
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
                                )}
                                <div className="w-[160px]">
                                  <label className="block text-[11px] text-gray-500 mb-1">
                                    {it.isMeter ? "قیمت هر متر (تومان)" : "قیمت واحد (تومان)"}
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
                                <div className="flex-1 min-w-[200px]">
                                  <label className="block text-[11px] text-gray-500 mb-1">تأمین‌کننده</label>
                                  <input
                                    value={f.supplierQuery}
                                    onChange={(e) =>
                                      setPForm({
                                        ...pForm,
                                        [it.productId]: { ...f, supplierQuery: e.target.value, supplierId: "" },
                                      })
                                    }
                                    placeholder="جستجو کنید…"
                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                  />
                                  {!f.supplierId && f.supplierQuery.trim() && (
                                    <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white text-sm">
                                      {(() => {
                                        const q = f.supplierQuery.trim();
                                        const hits = suppliers.filter((sp) => sp.name.includes(q));
                                        if (hits.length === 0)
                                          return (
                                            <li className="px-2 py-1.5 text-gray-400">موردی پیدا نشد</li>
                                          );
                                        return hits.map((sp) => (
                                          <li key={sp.id}>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setPForm({
                                                  ...pForm,
                                                  [it.productId]: {
                                                    ...f,
                                                    supplierId: sp.id,
                                                    supplierQuery: sp.name,
                                                  },
                                                })
                                              }
                                              className="w-full text-right px-2 py-1.5 hover:bg-gray-100 transition-colors duration-150"
                                            >
                                              {sp.name}
                                            </button>
                                          </li>
                                        ));
                                      })()}
                                    </ul>
                                  )}
                                  {f.supplierId && (
                                    <div className="mt-1 text-[11px] text-green-700">✓ انتخاب شد</div>
                                  )}
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
                                          <td className="p-2 text-left">
                                            {q(m.quantity)} {u}
                                          </td>
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
                      const isOpen = openParty === p.id;
                      return (
                        <Fragment key={p.id}>
                          <tr
                            onClick={() => toggleParty(p.id)}
                            className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <span className="text-gray-400">{isOpen ? "▾" : "▸"}</span> {p.name}
                            </td>
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

                          {isOpen && (
                            <tr className="border-t border-gray-200 bg-gray-50">
                              <td colSpan={6} className="p-4">
                                <div className="space-y-4">
                                  {/* ثبت رکورد روی این طرف‌حساب */}
                                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                                    <div className="text-sm font-bold mb-3">ثبت رکورد — {p.name}</div>
                                    <div className="flex flex-wrap gap-3 items-end">
                                      <div>
                                        <label className="block text-[11px] text-gray-500 mb-1">نوع</label>
                                        <select
                                          value={recForm.kind}
                                          onChange={(e) => setRecForm({ ...recForm, kind: e.target.value })}
                                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                        >
                                          <option value="RECEIPT">دریافت (کم می‌شود)</option>
                                          <option value="DEBT">بدهی (اضافه می‌شود)</option>
                                        </select>
                                      </div>
                                      <div className="flex-1 min-w-[160px]">
                                        <label className="block text-[11px] text-gray-500 mb-1">مبلغ (تومان)</label>
                                        <input
                                          type="number"
                                          value={recForm.amount}
                                          onChange={(e) => setRecForm({ ...recForm, amount: e.target.value })}
                                          placeholder="مثلاً 500000"
                                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-gray-500 mb-1">تاریخ</label>
                                        <input
                                          value={recForm.date}
                                          onChange={(e) => setRecForm({ ...recForm, date: e.target.value })}
                                          placeholder="1405/07/14"
                                          className="w-[130px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-[160px]">
                                        <label className="block text-[11px] text-gray-500 mb-1">شرح</label>
                                        <input
                                          value={recForm.note}
                                          onChange={(e) => setRecForm({ ...recForm, note: e.target.value })}
                                          placeholder="اختیاری"
                                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                        />
                                      </div>
                                      <button
                                        onClick={submitRecord}
                                        disabled={busy === "rec"}
                                        className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
                                      >
                                        {busy === "rec" ? "..." : "ثبت"}
                                      </button>
                                    </div>
                                    <div className="mt-2 text-[11px] text-gray-500">
                                      دریافت = مبلغ مثبت در دفتر (نوع ۲۰) — بدهی = مبلغ منفی (نوع ۳۰)
                                    </div>
                                  </div>

                                  {/* اسناد این طرف‌حساب */}
                                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                                    <div className="px-3 py-2 text-sm font-bold border-b border-gray-100">
                                      اسناد این طرف‌حساب ({toFaDigits(String(partyRecs.length))})
                                    </div>
                                    {recLoading ? (
                                      <div className="p-4 text-sm text-gray-500">در حال دریافت…</div>
                                    ) : partyRecs.length === 0 ? (
                                      <div className="p-4 text-sm text-gray-500">سندی ثبت نشده است.</div>
                                    ) : (
                                      <table className="w-full text-xs">
                                        <thead className="bg-gray-50 text-gray-500">
                                          <tr>
                                            <th className="p-2 text-right">تاریخ</th>
                                            <th className="p-2 text-right">شرح</th>
                                            <th className="p-2 text-right">نوع</th>
                                            <th className="p-2 text-left">مبلغ</th>
                                            <th className="p-2 text-left">منبع</th>
                                            <th className="p-2 text-left"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {partyRecs.map((r) => (
                                            <tr key={r.id} className="border-t border-gray-100">
                                              <td className="p-2">{toFaDigits(r.date)}</td>
                                              <td className="p-2">{r.description}</td>
                                              <td className="p-2 text-gray-500">{toFaDigits(String(r.voucherType))}</td>
                                              <td
                                                className={
                                                  "p-2 text-left font-bold " +
                                                  (r.amount < 0 ? "text-green-700" : "text-red-700")
                                                }
                                              >
                                                {money(r.amount)}
                                              </td>
                                              <td className="p-2 text-left text-gray-500">
                                                {r.source === "ACCESS" ? "قدیمی" : "جدید"}
                                              </td>
                                              <td className="p-2 text-left">
                                                <button
                                                  onClick={() => delRec(r)}
                                                  disabled={busy === r.id}
                                                  className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                                                >
                                                  {busy === r.id ? "…" : "حذف"}
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
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
                  منفی = طرف حساب بدهکار ماست (طلب ما از او) — مثبت = بستانکار (طلب او از ما).
                  روی هر ردیف بزنید تا برای همان شخص دریافت یا بدهی ثبت کنید یا سندی را حذف کنید.
                </div>
              </>
            );
          })()}
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
