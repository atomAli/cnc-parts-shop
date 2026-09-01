"use client";

import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-xl">
                CNC
              </div>
              <div>
                <div className="font-bold text-white">مارکت CNC</div>
                <div className="text-xs text-gray-400">فروشگاه تخصصی</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              فروش تخصصی قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون صنعتی
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-4">دسترسی سریع</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  خانه
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  محصولات
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  درباره ما
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  تماس با ما
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-white mb-4">دسته‌بندی‌ها</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products?category=electrical" className="hover:text-white transition-colors">
                  قطعات برقی
                </Link>
              </li>
              <li>
                <Link href="/products?category=mechanical" className="hover:text-white transition-colors">
                  قطعات مکانیکی
                </Link>
              </li>
              <li>
                <Link href="/repairs" className="hover:text-white transition-colors">
                  خدمات تعمیرات
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-white mb-4">ارتباط با ما</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={16} />
                <span dir="ltr">021-33532602</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <span>info@cncmarket.ir</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-1 shrink-0" />
                <span>تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی، پلاک ۱۶۷</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © {year} فروشگاه مارکت CNC. تمامی حقوق محفوظ است.
        </div>
      </div>
    </footer>
  );
}
