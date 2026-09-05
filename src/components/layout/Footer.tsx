"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative mt-auto overflow-hidden bg-[#211d19] text-stone-300">
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[560px] rounded-full bg-blue-500/20 blur-3xl" />

      <div className="container-page relative py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Logo dark />
            <p className="mt-5 text-sm leading-relaxed text-stone-400">
              شیک خرید کنید؛ فروش تخصصی قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون
              صنعتی از برندهای معتبر جهانی.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-amber-300">
              <Sparkles size={14} />
              شیک خرید کنید
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-4">دسترسی سریع</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">
                  خانه
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-amber-400 transition-colors">
                  محصولات
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-amber-400 transition-colors">
                  درباره ما
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-amber-400 transition-colors">
                  تماس با ما
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-white mb-4">دسته‌بندی‌ها</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/products?category=electrical" className="hover:text-amber-400 transition-colors">
                  قطعات برقی
                </Link>
              </li>
              <li>
                <Link href="/products?category=mechanical" className="hover:text-amber-400 transition-colors">
                  قطعات مکانیکی
                </Link>
              </li>
              <li>
                <Link href="/repairs" className="hover:text-amber-400 transition-colors">
                  خدمات تعمیرات
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-white mb-4">ارتباط با ما</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-blue-400">
                  <Phone size={15} />
                </span>
                <span dir="ltr">021-33724136</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-blue-400">
                  <Mail size={15} />
                </span>
                <span>info@cncmarket.ir</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-blue-400">
                  <MapPin size={15} />
                </span>
                <span className="leading-relaxed">تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-stone-500">
          <span>© {year} فروشگاه شیک. تمامی حقوق محفوظ است.</span>
          <span className="font-bold text-blue-400">شیک خرید کنید</span>
        </div>
      </div>
    </footer>
  );
}