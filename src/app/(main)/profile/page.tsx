"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User, ShoppingCart, LogOut, FileText, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";

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
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "در انتظار بررسی", color: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "در حال پردازش", color: "bg-blue-100 text-blue-700" },
  CONTACTED: { label: "تماس گرفته شد", color: "bg-green-100 text-green-700" },
  DONE: { label: "تکمیل شده", color: "bg-gray-100 text-gray-600" },
};

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price) + " تومان";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<PreInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/pre-invoices")
        .then((r) => r.json())
        .then((data) => { setInvoices(Array.isArray(data) ? data : []); setLoadingInvoices(false); })
        .catch(() => setLoadingInvoices(false));
    }
  }, [session]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">پروفایل کاربری</h1>

      {/* User Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <div className="text-xl font-bold">{session.user?.name || "کاربر"}</div>
            <div className="text-gray-500" dir="ltr">{(session.user as any)?.phone || ""}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">نام:</span>
            <span className="font-medium">{session.user?.name || "-"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">تلفن:</span>
            <span className="font-medium" dir="ltr">{(session.user as any)?.phone || "-"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">نقش:</span>
            <span className="font-medium">{(session.user as any)?.role === "ADMIN" ? "مدیر" : "کاربر"}</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link href="/cart" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="bg-green-100 text-green-600 p-3 rounded-lg"><ShoppingCart size={24} /></div>
          <div>
            <div className="font-bold">سبد خرید</div>
            <div className="text-sm text-gray-500">مشاهده سبد خرید</div>
          </div>
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4 text-left">
          <div className="bg-red-100 text-red-600 p-3 rounded-lg"><LogOut size={24} /></div>
          <div>
            <div className="font-bold text-red-600">خروج از حساب</div>
            <div className="text-sm text-gray-500">خروج از پروفایل</div>
          </div>
        </button>
      </div>

      {/* خریدهای من */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-lg"><FileText size={22} /></div>
          <div>
            <h2 className="font-bold text-lg">خریدهای من</h2>
            <p className="text-sm text-gray-500">پیش فاکتورها و سفارشات شما</p>
          </div>
        </div>

        {loadingInvoices && <div className="text-center py-8 text-gray-400">در حال بارگذاری...</div>}

        {!loadingInvoices && invoices.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p>هنوز پیش فاکتوری ثبت نکرده‌اید</p>
            <Link href="/products" className="mt-3 inline-block text-sm text-blue-600 hover:underline">مشاهده محصولات</Link>
          </div>
        )}

        {!loadingInvoices && invoices.length > 0 && (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const isExpanded = expanded === inv.id;
              const st = STATUS_MAP[inv.status] || STATUS_MAP.PENDING;
              return (
                <div key={inv.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50" onClick={() => setExpanded(isExpanded ? null : inv.id)}>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{new Date(inv.createdAt).toLocaleDateString("fa-IR")}</div>
                      <div className="text-xs text-gray-500">{inv.items.length} کالا</div>
                    </div>
                    <div className="font-bold text-blue-600 text-sm">{formatPrice(inv.totalPrice)}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-2">
                      {inv.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                          <a href={`/products/${item.slug}`} className="text-blue-600 hover:underline">{item.name}</a>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">×{item.quantity}</span>
                            <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
