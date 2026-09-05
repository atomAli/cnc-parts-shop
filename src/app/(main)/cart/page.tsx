"use client";

import { useCartStore } from "@/store/cart";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Trash2, Plus, Minus, ShoppingCart, FileText, CheckCircle, Loader2 } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fa-IR").format(price) + " تومان";

  const handleSubmit = async () => {
    if (!isLoggedIn && (!name.trim() || !phone.trim())) return;

    setLoading(true);
    try {
      const res = await fetch("/api/pre-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: isLoggedIn ? (session.user as any).name || "" : name.trim(),
          customerPhone: isLoggedIn ? (session.user as any).phone || "" : phone.trim(),
          items: items.map((i) => ({
            name: i.name,
            slug: i.slug,
            price: i.price,
            quantity: i.quantity,
            isMeter: i.isMeter,
            branchCount: i.branchCount,
            branchLength: i.branchLength,
            baseLength: i.baseLength,
          })),
          totalPrice: getTotal(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        clearCart();
      }
    } catch {}
    setLoading(false);
  };

  if (items.length === 0 && !submitted) {
    return (
      <div className="container-page py-16 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gray-100 text-gray-300">
          <ShoppingCart size={40} />
        </div>
        <h1 className="text-2xl font-black mb-2">سبد خرید شما خالی است</h1>
        <p className="text-stone-500 mb-7">محصولات مورد نظر خود را به سبد خرید اضافه کنید</p>
        <Link href="/products" className="btn-primary">
          مشاهده محصولات
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container-page py-16 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-green-100 text-green-600">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-2xl font-black mb-2">پیش فاکتور شما ثبت شد</h1>
        <p className="text-stone-500 mb-7">در اسرع وقت با شما تماس خواهیم گرفت</p>
        <Link href="/products" className="btn-primary">
          مشاهده محصولات
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-black mb-8">سبد خرید</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs">تصویر</span>
                )}
              </div>
              <div className="flex-1">
                <Link href={`/products/${item.slug}`} className="font-bold hover:text-blue-600 transition-colors">
                  {item.name}
                </Link>
                {item.isMeter ? (
                  <div className="mt-1 space-y-0.5">
                    <div className="text-sm text-gray-600">
                      تعداد {(item.quantity || 1).toLocaleString("fa-IR")} × ({item.branchCount} شاخه × {item.branchLength} سانتی‌متر)
                    </div>
                    <div className="text-blue-600 font-bold">{formatPrice(item.price)} <span className="text-xs text-gray-500 font-normal">/{item.baseLength || 400} سانتی‌متر</span></div>
                  </div>
                ) : (
                  <div className="text-blue-600 font-bold mt-1">{formatPrice(item.price)}</div>
                )}
                <div className="flex items-center justify-between mt-3">
                  {item.isMeter ? (
                    <div className="text-sm text-gray-500">
                      جمع: <span className="font-bold text-blue-600">{formatPrice(item.price * (item.quantity || 1) * (item.branchCount || 1) * ((item.branchLength || 400) / (item.baseLength || 400)))}</span>
                    </div>
                  ) : (
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-2 hover:bg-gray-100">
                        <Minus size={16} />
                      </button>
                      <span className="px-4 py-2 font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-gray-100">
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{item.isMeter ? formatPrice(item.price * (item.quantity || 1) * (item.branchCount || 1) * ((item.branchLength || 400) / (item.baseLength || 400))) : formatPrice(item.price * item.quantity)}</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={clearCart} className="text-red-500 hover:text-red-700 text-sm">
            خالی کردن سبد خرید
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="font-black text-lg mb-4">خلاصه سفارش</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">تعداد اقلام:</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">تعداد کل:</span>
                <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">جمع کل:</span>
                <span className="font-bold text-lg text-blue-600">{formatPrice(getTotal())}</span>
              </div>
            </div>

            {/* Guest form */}
            {showForm && !isLoggedIn && (
              <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-xl">
                <input
                  type="text"
                  placeholder="نام و نام خانوادگی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="tel"
                  placeholder="شماره تلفن"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  dir="ltr"
                />
              </div>
            )}

            <button
              onClick={() => {
                if (!isLoggedIn && !showForm) {
                  setShowForm(true);
                  return;
                }
                handleSubmit();
              }}
              disabled={loading || (!isLoggedIn && showForm && (!name.trim() || !phone.trim()))}
              className="w-full btn-primary justify-center mb-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileText size={18} />
              )}
              ثبت پیش فاکتور
            </button>

            <p className="text-xs text-stone-500 text-center mb-4">
              بعد از ثبت پیش فاکتور در اسرع وقت با شما تماس خواهیم گرفت
            </p>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span className="font-medium">یا با ما تماس بگیرید</span>
              </div>
              <a href="tel:+982133724136" className="mt-2 block text-center btn-primary">
                021-33724136
              </a>
            </div>

            <Link href="/products" className="block text-center text-blue-600 hover:underline text-sm">
              ادامه خرید
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
