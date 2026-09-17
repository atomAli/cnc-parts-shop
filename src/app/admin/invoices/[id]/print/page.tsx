"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowRight } from "lucide-react";

const A5_MAX_ITEMS = 8;

interface PrintItem {
  name: string;
  slug: string;
  price?: number;
  unitPrice?: number;
  quantity: number;
  isMeter?: boolean;
  branchCount?: number;
  branchLength?: number;
  baseLength?: number;
  discountPercent?: number;
}

interface PrintInvoice {
  id: string;
  invoiceNumber?: number;
  customerName: string;
  customerPhone: string;
  items: PrintItem[];
  totalPrice?: number;
  notes?: string | null;
  status?: string;
  createdAt: string;
}

function faNum(value: number | string) {
  return String(value).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(price)) + " تومان";
}

export default function InvoicePrintPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const [invoice, setInvoice] = useState<PrintInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paper, setPaper] = useState<"auto" | "a5l" | "a4p" | "a4l">("auto");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/admin/invoices/${id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setInvoice((await res.json()) as PrintInvoice);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <Printer size={28} className="animate-pulse" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-lg font-bold">فاکتور یافت نشد</div>
        <Link href="/admin/invoices" className="mt-4 text-blue-600 hover:underline">
          بازگشت به ثبت فاکتور
        </Link>
      </div>
    );
  }

  const effective = paper === "auto" ? (invoice.items.length <= A5_MAX_ITEMS ? "a5l" : "a4p") : paper;
  const paperSize =
    effective === "a5l" ? "A5 landscape" : effective === "a4p" ? "A4 portrait" : "A4 landscape";
  const [contentWidth, contentHeight] =
    effective === "a5l"
      ? ["210mm", "148mm"]
      : effective === "a4p"
        ? ["210mm", "297mm"]
        : ["297mm", "210mm"];
  const paperLabel = effective === "a5l" ? "A5 افقی" : effective === "a4p" ? "A4 عمودی" : "A4 افقی";

  const title = invoice.status === "DONE" ? "فاکتور فروش" : "پیش فاکتور فروش";

  const invoiceTotal = Number.isFinite(invoice.totalPrice as number)
    ? (invoice.totalPrice as number)
    : invoice.items.reduce((sum, it) => {
        const p = it.price ?? it.unitPrice ?? 0;
        const isMeter = it.isMeter === true || it.branchLength != null;
        const line = isMeter ? p * (it.branchCount || 1) * ((it.branchLength || 0) / 100) : p * it.quantity;
        const d = Math.min(Math.max(Number(it.discountPercent) || 0, 0), 100);
        return sum + Math.round(line * (100 - d) / 100);
      }, 0);

  const dateStr = new Date(invoice.createdAt).toLocaleString("fa-IR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>
        {`@media print {
          @page { size: ${paperSize}; margin: 6mm 5mm; }
          html, body { padding: 0 !important; margin: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-scroll { overflow: visible !important; padding: 0 !important; }
          .print-sheet { width: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
          .print-inner { padding: 0 !important; }
          .print-sheet table { break-inside: auto; }
          .print-sheet tr { break-inside: avoid; }
        }`}
      </style>

      <div className="p-4 print:hidden flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/admin/invoices" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
          <ArrowRight size={16} />
          بازگشت به ثبت فاکتور
        </Link>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            کاغذ:
            <select
              value={paper}
              onChange={(e) => setPaper(e.target.value as "auto" | "a5l" | "a4p" | "a4l")}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="auto">خودکار ({invoice.items.length <= A5_MAX_ITEMS ? "A5 افقی" : "A4 عمودی"})</option>
              <option value="a5l">A5 افقی</option>
              <option value="a4p">A4 عمودی</option>
              <option value="a4l">A4 افقی</option>
            </select>
          </label>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Printer size={16} />
            چاپ / ذخیره PDF ({faNum(invoice.items.length)} کالا — {paperLabel})
          </button>
        </div>
      </div>

      <div className="print-scroll overflow-auto p-4 print:p-0">
        <div
          className="print-sheet bg-white text-gray-900 mx-auto print:mx-0"
          style={{ width: contentWidth, minHeight: contentHeight }}
        >
          <div className="print-inner py-5 px-6">
            <div className="flex items-start justify-between pb-3">
              <div>
                <div className="text-lg font-bold">{title}</div>
                <div className="text-sm text-gray-600 mt-1">فروشگاه شیک (shik.app)</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-500">شماره فاکتور: {faNum(invoice.invoiceNumber ?? 0)}</div>
                <div className="text-xs text-gray-500 mt-1">{dateStr}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-gray-300 py-2.5">
              <div>
                <div className="text-xs text-gray-500">نام مشتری</div>
                <div className="font-bold text-sm">{invoice.customerName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">شماره تماس</div>
                <div className="font-bold text-sm" dir="ltr">{invoice.customerPhone}</div>
              </div>
            </div>

            <table className="w-full mt-3 text-sm">
              <thead>
                <tr className="text-xs text-gray-500 text-right">
                  <th className="pb-2 pl-2 w-7">ردیف</th>
                  <th className="pb-2 px-1.5">نام کالا</th>
                  <th className="pb-2 px-1.5">تعداد / شرح</th>
                  <th className="pb-2 px-1.5">قیمت واحد</th>
                  <th className="pb-2 px-1.5">تخفیف</th>
                  <th className="pb-2 pr-2 text-left">جمع</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => {
                  const p = it.price ?? it.unitPrice ?? 0;
                  const isMeter = it.isMeter === true || it.branchLength != null;
                  const d = Math.min(Math.max(Number(it.discountPercent) || 0, 0), 100);
                  const itemTotal = Math.round((isMeter
                    ? p * (it.branchCount || 1) * ((it.branchLength || 0) / 100)
                    : p * it.quantity) * (100 - d) / 100);
                  return (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="py-1.5 pl-2">{faNum(i + 1)}</td>
                      <td className="py-1.5 px-1.5">
                        {it.name}
                        {isMeter && (
                          <span className="mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700">متری</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 text-xs">
                        {isMeter
                          ? `${faNum(it.branchLength ?? 0)} سانتی‌متر × ${faNum(it.branchCount || 1)} شاخه`
                          : `${faNum(it.quantity)} عدد`}
                      </td>
                      <td className="py-1.5 px-1.5 text-xs">
                        {new Intl.NumberFormat("fa-IR").format(Math.round(p))} تومان
                        {isMeter && <span className="text-gray-500"> / متر</span>}
                      </td>
                      <td className="py-1.5 px-1.5 text-xs text-red-600">
                        {d > 0 ? `${faNum(d)}٪` : "—"}
                      </td>
                      <td className="py-1.5 pr-2 text-left font-bold">{formatPrice(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={5} className="py-2.5 pl-2 text-xs text-gray-500">
                    {invoice.notes ? `توضیحات: ${invoice.notes}` : "\u00A0"}
                  </td>
                  <td colSpan={1} className="py-2.5 pr-2 text-left">
                    <span className="text-xs text-gray-500 ml-2">جمع کل:</span>
                    <span className="font-bold text-base">{formatPrice(invoiceTotal)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex items-end justify-between mt-8">
              <div className="text-xs text-gray-500">مهر و امضای فروشنده</div>
              <div className="text-xs text-gray-500">امضای مشتری</div>
            </div>
            <div className="border-t border-gray-300 mt-2 pt-1.5 text-center text-[10px] text-gray-400">
              فروشگاه شیک — قطعات صنعتی CNC — shik.app
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}