"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Send, Clock } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setSuccess(true);
    setLoading(false);
    setForm({ name: "", phone: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">تماس با ما</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          ما آماده پاسخگویی به سوالات و ارائه مشاوره فنی به شما هستیم
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-4">اطلاعات تماس</h2>
            <div className="space-y-4">
              <a
                href="tel:+982133532602"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Phone size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">تلفن</div>
                  <div className="font-medium" dir="ltr">021-33532602</div>
                </div>
              </a>

              <a
                href="mailto:info@cncparts.ir"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">ایمیل</div>
                  <div className="font-medium">info@cncparts.ir</div>
                </div>
              </a>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">آدرس</div>
                  <div className="font-medium text-sm">
                    تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی، پلاک ۱۶۷
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">ساعات کاری</div>
                  <div className="font-medium text-sm">
                    شنبه تا پنجشنبه - ۹ صبح تا ۶ عصر
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-4">نقشه</h2>
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <span className="text-gray-400">نقشه گوگل</span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-6">فرم تماس</h2>

            {success && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تلفن</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">موضوع</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">انتخاب کنید</option>
                    <option value="consultation">مشاوره فنی</option>
                    <option value="quote">استعلام قیمت</option>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={18} />
                {loading ? "در حال ارسال..." : "ارسال پیام"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
