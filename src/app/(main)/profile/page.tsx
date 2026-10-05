"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User, ShoppingCart, LogOut, FileText, ChevronDown, Eye, MapPin, Bell, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { toFaDigits } from "@/lib/phone";

interface PreInvoiceItem {
  name: string;
  slug: string;
  price: number;
  quantity: number;
}

interface PreInvoice {
  id: string;
  invoiceNumber: number;
  customerName: string;
  customerPhone: string;
  items: PreInvoiceItem[];
  totalPrice: number;
  status: string;
  createdAt: string;
  adminEditedAt: string | null;
  adminEditSeenAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "در انتظار بررسی", color: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "در حال پردازش", color: "bg-blue-100 text-blue-700" },
  CONTACTED: { label: "تماس گرفته شد", color: "bg-green-100 text-green-700" },
  DONE: { label: "تکمیل شده", color: "bg-gray-100 text-gray-600" },
  COMPLETED: { label: "ارسال شده", color: "bg-blue-100 text-blue-700" },
};

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price) + " تومان";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<PreInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ackBusy, setAckBusy] = useState(false);

  // فاکتورهایی که مدیر ویرایش کرده و کاربر هنوز اعلانش را ندیده
  const pendingEdits = invoices.filter((i) => i.adminEditedAt && !i.adminEditSeenAt);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/pre-invoices?limit=5")
        .then((r) => r.json())
        .then((data) => { setInvoices(Array.isArray(data) ? data : []); setLoadingInvoices(false); })
        .catch(() => setLoadingInvoices(false));

      fetch("/api/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setAddress(d.address || ""); })
        .catch(() => {});
    }
  }, [session]);

  /** اعلام «دیدم» برای یک فاکتور یا همهٔ اعلان‌های دیده‌نشده */
  const acknowledge = async (invoiceIds?: string[]) => {
    if (ackBusy) return;
    setAckBusy(true);
    // خوش‌بینانه UI را بلافاصله به‌روز می‌کنیم تا حس کند سریع است
    const now = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((i) =>
        i.adminEditedAt && !i.adminEditSeenAt && (!invoiceIds || invoiceIds.includes(i.id))
          ? { ...i, adminEditSeenAt: now }
          : i
      )
    );
    // به هدر خبر می‌دهیم که نشان را پاک کند
    window.dispatchEvent(new Event("profile-invoice-edits-seen"));
    try {
      await fetch("/api/pre-invoices/edits/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceIds ? { invoiceIds } : {}),
      });
    } catch {}
    setAckBusy(false);
  };

  /** باز/بسته کردن جزئیات — با باز شدن، اعلان آن فاکتور دیده‌شده می‌شود */
  const toggleExpand = (inv: PreInvoice) => {
    const next = expanded === inv.id ? null : inv.id;
    setExpanded(next);
    if (next && inv.adminEditedAt && !inv.adminEditSeenAt) acknowledge([inv.id]);
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    setAddressMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddressMsg({ ok: false, text: data.error || "خطا در ذخیره آدرس" });
      } else {
        setAddress(data.address || "");
        setAddressMsg({ ok: true, text: "آدرس ذخیره شد" });
      }
    } catch {
      setAddressMsg({ ok: false, text: "خطا در ارتباط با سرور" });
    }
    setSavingAddress(false);
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-black mb-8">پروفایل کاربری</h1>

      {/* بنر اعلان: مدیر فاکتور را اصلاح کرده */}
      {pendingEdits.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-lg shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                {toFaDigits(pendingEdits.length)} فاکتور شما توسط بخش فروش اصلاح شده
              </div>
              <p className="text-sm text-amber-800 mt-1">
                لطفاً مشخصات و مبلغ فاکتورهای زیر را بررسی کنید.
              </p>
              <ul className="mt-3 space-y-2">
                {pendingEdits.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/profile/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 p-3 bg-white border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-stone-700">
                        فاکتور شماره {toFaDigits(String(inv.invoiceNumber ?? "—"))}
                      </span>
                      <span className="text-xs text-amber-700 font-bold shrink-0">
                        اصلاح {new Date(inv.adminEditedAt!).toLocaleDateString("fa-IR")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => acknowledge()}
                disabled={ackBusy}
                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {ackBusy ? "در حال ثبت..." : "متوجه شدم"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* خریدهای من — بلافاصله زیر عنوان، بالاتر از همه‌چیز */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-lg"><FileText size={22} /></div>
          <div>
            <h2 className="font-bold text-lg">خریدهای من</h2>
            <p className="text-sm text-gray-500">۵ خرید آخر شما</p>
          </div>
        </div>

        {!loadingInvoices && invoices.length >= 5 && (
          <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">
            برای مشاهدهٔ خریدهای قدیمی‌تر با بخش فروش تماس بگیرید.
          </p>
        )}

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
              const wasEdited = !!inv.adminEditedAt;
              return (
                <div
                  key={inv.id}
                  className={`border rounded-xl overflow-hidden ${wasEdited && !inv.adminEditSeenAt ? "border-amber-300" : "border-gray-100"}`}
                >
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50" onClick={() => toggleExpand(inv)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">{new Date(inv.createdAt).toLocaleDateString("fa-IR")}</div>
                      <div className="text-xs text-gray-500">{toFaDigits(inv.items.length)} کالا</div>
                      {wasEdited && (
                        <div className="text-xs text-amber-700 font-medium mt-1">
                          اصلاح‌شده توسط بخش فروش — {new Date(inv.adminEditedAt!).toLocaleDateString("fa-IR")}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-blue-600 text-sm shrink-0">{formatPrice(inv.totalPrice)}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${st.color}`}>{st.label}</span>
                    <Link
                      href={`/profile/invoices/${inv.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title="نمایش و چاپ فاکتور"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors shrink-0"
                    >
                      <Eye size={14} />
                      فاکتور
                    </Link>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-2">
                      {inv.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                          <a href={`/products/${item.slug}`} className="text-blue-600 hover:underline">{item.name}</a>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">×{toFaDigits(item.quantity)}</span>
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

      {/* User Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <div className="text-xl font-bold">{session.user?.name || "کاربر"}</div>
            <div className="text-gray-500" dir="ltr">{toFaDigits((session.user as any)?.phone || "")}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">نام:</span>
            <span className="font-medium">{session.user?.name || "-"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">تلفن:</span>
            <span className="font-medium" dir="ltr">{toFaDigits((session.user as any)?.phone || "")}</span>
          </div>
        </div>
      </div>

      {/* آدرس */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 text-amber-600 p-3 rounded-lg"><MapPin size={22} /></div>
          <div>
            <h2 className="font-bold text-lg">آدرس من</h2>
            <p className="text-sm text-gray-500">برای فاکتور و تحویل سفارش استفاده می‌شود</p>
          </div>
        </div>
        <textarea
          value={address}
          onChange={(e) => { setAddress(e.target.value); setAddressMsg(null); }}
          rows={3}
          placeholder="آدرس خود را وارد کنید (اختیاری)"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={saveAddress}
            disabled={savingAddress}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {savingAddress ? "در حال ذخیره..." : "ذخیره آدرس"}
          </button>
          {addressMsg && (
            <span className={`text-xs ${addressMsg.ok ? "text-green-600" : "text-red-600"}`}>{addressMsg.text}</span>
          )}
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
    </div>
  );
}
