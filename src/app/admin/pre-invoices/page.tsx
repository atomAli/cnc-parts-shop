"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown, Phone, User } from "lucide-react";

interface PreInvoiceItem {
  name: string;
  slug: string;
  price: number;
  quantity: number;
}

interface PreInvoice {
  id: string;
  customerName: string;
  customerPhone: string;
  items: PreInvoiceItem[];
  totalPrice: number;
  status: string;
  notes: string | null;
  createdAt: string;
  user?: { name: string | null; phone: string | null } | null;
}

const STATUS_OPTIONS = ["PENDING", "PROCESSING", "CONTACTED", "DONE"];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  PROCESSING: "در حال پردازش",
  CONTACTED: "تماس گرفته شد",
  DONE: "تکمیل شده",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-green-100 text-green-700",
  DONE: "bg-gray-100 text-gray-600",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
}

export default function AdminPreInvoicesPage() {
  const [invoices, setInvoices] = useState<PreInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    const url = filter ? "/api/pre-invoices?status=" + filter : "/api/pre-invoices";
    const res = await fetch(url);
    const data = await res.json();
    setInvoices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch("/api/pre-invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchInvoices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">پیش فاکتورها</h1>
          <p className="text-sm text-gray-500 mt-1">مشاهده و مدیریت پیش فاکتورهای ثبت شده</p>
        </div>
        <button onClick={fetchInvoices} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          بروزرسانی
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-3 flex-wrap">
        <button onClick={() => setFilter("")} className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (!filter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
          همه
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading && <div className="text-center py-8 text-gray-400">در حال بارگذاری...</div>}
        {!loading && invoices.length === 0 && <div className="text-center py-8 text-gray-400">پیش فاکتوری یافت نشد</div>}
        {invoices.map((inv) => {
          const isExpanded = expanded === inv.id;
          return (
            <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex flex-wrap items-center gap-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(isExpanded ? null : inv.id)}>
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{inv.customerName}</div>
                    <div className="text-xs text-gray-500" dir="ltr">{inv.customerPhone}</div>
                  </div>
                </div>

                <div className="text-sm text-gray-500">{new Date(inv.createdAt).toLocaleDateString("fa-IR")}</div>
                <div className="text-sm font-bold text-blue-600">{formatPrice(inv.totalPrice)}</div>
                <div className="text-sm text-gray-500">{inv.items.length} کالا</div>
                <span className={"px-3 py-1 rounded-full text-xs font-bold " + (STATUS_COLORS[inv.status] || STATUS_COLORS.PENDING)}>
                  {STATUS_LABELS[inv.status] || STATUS_LABELS.PENDING}
                </span>
                <ChevronDown size={18} className={"text-gray-400 transition-transform " + (isExpanded ? "rotate-180" : "")} />
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <table className="w-full text-sm">
                    <thead className="text-gray-500 text-xs">
                      <tr>
                        <th className="text-right py-1">نام کالا</th>
                        <th className="text-right py-1">قیمت واحد</th>
                        <th className="text-right py-1">تعداد</th>
                        <th className="text-right py-1">جمع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((item, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="py-2">
                            <a href={"/products/" + item.slug} className="text-blue-600 hover:underline">{item.name}</a>
                          </td>
                          <td className="py-2">{formatPrice(item.price)}</td>
                          <td className="py-2">{item.quantity}</td>
                          <td className="py-2 font-bold">{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap">
                    <span className="text-sm text-gray-600">تغییر وضعیت:</span>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(inv.id, s)}
                        className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " + (inv.status === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-2">
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      <a href={"tel:+98" + inv.customerPhone.replace(/^0/, "")} className="text-blue-600 hover:underline" dir="ltr">{inv.customerPhone}</a>
                    </div>
                    {inv.user && <div className="text-xs text-gray-400">کاربر سایت: {inv.user.name}</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
