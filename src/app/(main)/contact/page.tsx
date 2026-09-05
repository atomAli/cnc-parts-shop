"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Send, Clock, ChevronLeft, MessageSquareText, User } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSuccess(true);
    setLoading(false);
    setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    setTimeout(() => setSuccess(false), 6000);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-amber-50 via-background to-blue-50">
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-16 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="container-page relative py-14 md:py-20 text-center">
          <span className="eyebrow mb-6">
            <MessageSquareText size={15} />
            شیک خرید کنید
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-4 mt-4 text-stone-900">تماس با ما</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            برای مشاوره فنی، استعلام قیمت و همکاری، کارشناسان ما پاسخگوی شما هستند
          </p>
        </div>
      </section>

      <div className="container-page py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MessageSquareText size={20} className="text-blue-600" />
                اطلاعات تماس
              </h2>
              <div className="space-y-4">
                <a
                  href="tel:+982133724136"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">تلفن و مشاوره</div>
                    <div className="font-bold" dir="ltr">021-33724136</div>
                  </div>
                </a>

                <a
                  href="mailto:info@cncmarket.ir"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">ایمیل</div>
                    <div className="font-bold">info@cncmarket.ir</div>
                  </div>
                </a>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">آدرس</div>
                    <div className="font-bold text-sm leading-relaxed">
                      تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">ساعات کاری</div>
                    <div className="font-bold text-sm">شنبه تا پنجشنبه - ۹ صبح تا ۶ عصر</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services quick links */}
            <div className="card p-6">
              <h2 className="font-bold text-lg mb-4">سرویس‌های پشتیبانی</h2>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/repairs" className="group flex items-center justify-between text-gray-700 hover:text-blue-600 transition-colors">
                    <span>خدمات تعمیرات CNC</span>
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="group flex items-center justify-between text-gray-700 hover:text-blue-600 transition-colors">
                    <span>استعلام قیمت محصولات</span>
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=electrical" className="group flex items-center justify-between text-gray-700 hover:text-blue-600 transition-colors">
                    <span>قطعات برقی و الکترونیک</span>
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=mechanical" className="group flex items-center justify-between text-gray-700 hover:text-blue-600 transition-colors">
                    <span>قطعات مکانیکی</span>
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                فرم تماس
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                اطلاعات خود را وارد کنید تا کارشناس ما در اسرع وقت با شما تماس بگیرد
              </p>

              {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 border border-green-100">
                  پیام شما با موفقیت ارسال شد. در اسرع وقت با شما تماس خواهیم گرفت.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تلفن</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ایمیل (اختیاری)</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">موضوع</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="consultation">مشاوره فنی</option>
                      <option value="quote">استعلام قیمت</option>
                      <option value="repair">خدمات تعمیرات</option>
                      <option value="order">پیگیری سفارش</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">پیام</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Send size={18} />
                    {loading ? "در حال ارسال..." : "ارسال پیام"}
                  </button>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={16} className="text-blue-600" />
                    پاسخگویی فوری: <span dir="ltr">021-33724136</span>
                  </div>
                </div>
              </form>
            </div>

            {/* Map */}
            <div className="mt-8 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                <MapPin size={20} className="text-blue-600" />
                موقعیت ما روی نقشه
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی
              </p>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  title="موقعیت فروشگاه شیک روی نقشه"
                  src="https://maps.google.com/maps?q=%D8%AA%D9%87%D8%B1%D8%A7%D9%86%D8%8C%20%D8%AE%DB%8C%D8%A7%D8%A8%D8%A7%D9%86%20%D8%B3%D8%B9%D8%AF%DB%8C%20%D8%AC%D9%86%D9%88%D8%A8%DB%8C&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="360"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}