"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowRight } from "lucide-react";
import { toFaDigits } from "@/lib/phone";

interface PrintItem {
  name: string;
  slug?: string;
  price?: number;
  unitPrice?: number;
  quantity: number;
  isMeter?: boolean;
  branchCount?: number;
  branchLength?: number;
  baseLength?: number;
  discountPercent?: number;
}

interface CustomerInvoice {
  id: string;
  invoiceNumber?: number;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  items: PrintItem[];
  totalPrice?: number;
  notes?: string | null;
  status?: string;
  createdAt: string;
  adminEditedAt?: string | null;
  adminEditSeenAt?: string | null;
}

function faNum(value: number | string) {
  return String(value).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(price)) + " تومان";
}

const STATUS_MAP: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  PROCESSING: "در حال پردازش",
  CONTACTED: "تماس گرفته شد",
  DONE: "تکمیل شده",
};

const PAPER_MAP = {
  a4l: { size: "A4 landscape", label: "A4 افقی", w: "297mm", h: "210mm" },
  a4p: { size: "A4 portrait", label: "A4 عمودی", w: "210mm", h: "297mm" },
  a5l: { size: "A5 landscape", label: "A5 افقی", w: "210mm", h: "148mm" },
} as const;

type Paper = keyof typeof PAPER_MAP;

export default function CustomerInvoicePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const [invoice, setInvoice] = useState<CustomerInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [paper, setPaper] = useState<Paper>("a4l");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/pre-invoices/${id}`);
        if (!res.ok) {
          setFailed(true);
          return;
        }
        const data = (await res.json()) as CustomerInvoice;
        setInvoice(data);
        // باز کردن فاکتور یعنی کاربر اعلان را دیده است
        if (data.adminEditedAt && !data.adminEditSeenAt) {
          fetch("/api/pre-invoices/edits/seen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceIds: [data.id] }),
          })
            .then(() => window.dispatchEvent(new Event("profile-invoice-edits-seen")))
            .catch(() => {});
        }
      } catch {
        setFailed(true);
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

  if (failed || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-lg font-bold">فاکتور یافت نشد</div>
        <Link href="/profile" className="mt-4 text-blue-600 hover:underline">
          بازگشت به پروفایل
        </Link>
      </div>
    );
  }

  const title = invoice.status === "DONE" ? "فاکتور فروش" : "پیش فاکتور فروش";
  const sheet = PAPER_MAP[paper];

  const invoiceTotal = Number.isFinite(invoice.totalPrice as number)
    ? (invoice.totalPrice as number)
    : invoice.items.reduce((sum, it) => {
        const p = it.price ?? it.unitPrice ?? 0;
        const isMeter = it.isMeter === true || it.branchLength != null;
        const line = isMeter ? p * (it.branchCount || 1) * ((it.branchLength || 0) / 100) : p * it.quantity;
        const d = Math.min(Math.max(Number(it.discountPercent) || 0, 0), 100);
        return sum + Math.round((line * (100 - d)) / 100);
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
          @page { size: ${sheet.size}; margin: 10mm; }
          html, body { padding: 0 !important; margin: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-scroll { overflow: visible !important; padding: 0 !important; }
          .print-sheet { width: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
          .print-sheet table { break-inside: auto; }
          .print-sheet tr { break-inside: avoid; }
        }`}
      </style>

      <div className="p-4 print:hidden flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/profile" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
          <ArrowRight size={16} />
          بازگشت به پروفایل
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{STATUS_MAP[invoice.status || "PENDING"]}</span>
          <select
            value={paper}
            onChange={(e) => setPaper(e.target.value as Paper)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700"
          >
            <option value="a4l">A4 افقی</option>
            <option value="a4p">A4 عمودی</option>
            <option value="a5l">A5 افقی</option>
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Printer size={16} />
            چاپ / ذخیره PDF
          </button>
        </div>
      </div>

      <div className="print-scroll overflow-auto p-4 print:p-0">
        <div className="print-sheet bg-white text-gray-900 mx-auto print:mx-0 shadow-sm" style={{ width: sheet.w, minHeight: sheet.h }}>
          <div className="py-6 px-7">
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

            <div
              className={`grid grid-cols-2 gap-x-6 border-t border-gray-300 py-1.5 ${
                invoice.address ? "" : "border-b border-gray-300"
              }`}
            >
              <div className="min-w-0 flex items-baseline gap-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">نام مشتری:</span>
                <span className="font-bold text-sm truncate">{invoice.customerName}</span>
              </div>
              <div className="min-w-0 flex items-baseline gap-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">شماره تماس:</span>
                <span className="font-bold text-sm" dir="ltr">{toFaDigits(invoice.customerPhone)}</span>
              </div>
            </div>

            {invoice.address && (
              <div className="py-1.5 border-b border-gray-300">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] text-gray-500 shrink-0">آدرس:</span>
                  <span className="font-bold text-xs leading-relaxed">{invoice.address}</span>
                </div>
              </div>
            )}

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
                  const itemTotal = Math.round(((isMeter ? p * (it.branchCount || 1) * ((it.branchLength || 0) / 100) : p * it.quantity) * (100 - d)) / 100);
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
                      <td className="py-1.5 px-1.5 text-xs text-red-600">{d > 0 ? `${faNum(d)}٪` : "—"}</td>
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
                  <td className="py-2.5 pr-2 text-left">
                    <span className="text-xs text-gray-500 ml-2">جمع کل:</span>
                    <span className="font-bold text-base">{formatPrice(invoiceTotal)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex items-end justify-between mt-10">
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