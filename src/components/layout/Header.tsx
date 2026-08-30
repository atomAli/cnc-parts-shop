"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { ShoppingCart, User, Menu, X, Search, Phone, ChevronDown, Zap, Settings, Wrench } from "lucide-react";
import { useState, useRef } from "react";

const electricalSubs = [
  { name: "PLC", slug: "plc" },
  { name: "HMI", slug: "hmi" },
  { name: "موتور سروو", slug: "servo-motor" },
  { name: "استپ موتور", slug: "step-motor" },
  { name: "اینورتر", slug: "inverter" },
  { name: "کنترلر", slug: "controller" },
  { name: "موتور اسپیندل", slug: "spindle-motor" },
  { name: "پمپ وکیوم", slug: "vacuum-pump" },
  { name: "انکدر", slug: "encoder" },
  { name: "کانکتور", slug: "connector" },
  { name: "منبع تغذیه", slug: "power-supply" },
  { name: "رله کارت", slug: "relay-card" },
];

const mechanicalSubs = [
  { name: "ریل و واگن", slug: "lm-guide" },
  { name: "بالسکرو", slug: "ballscrew" },
  { name: "بالبوشینگ", slug: "ballbushing" },
  { name: "دنده شانه‌ای", slug: "gear" },
  { name: "گیربکس", slug: "gearbox" },
  { name: "کوپلینگ", slug: "coupling" },
  { name: "پروفیل", slug: "profile" },
  { name: "یاتاقان بالسکرو", slug: "bearing-ballscrew" },
  { name: "مهره بالسکرو", slug: "ballscrew-nut" },
];

const services = [
  { name: "تعمیرات", slug: "repairs" },
  { name: "قالب‌سازی", slug: "plastic-injection" },
  { name: "اجرای پروژه", slug: "project-implementation" },
  { name: "فروش دستگاه", slug: "device-sale" },
];

export default function Header() {
  const { data: session, status } = useSession();
  const itemCount = useCartStore((s) => s.getItemCount());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLoggedIn = status === "authenticated" && session;
  const isAdmin = isLoggedIn && (session.user as any)?.role === "ADMIN";

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMegaMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setMegaMenuOpen(false), 150);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-blue-600 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="tel:+982133532602" className="flex items-center gap-1 hover:text-blue-100">
              <Phone size={14} />
              <span dir="ltr">021-33532602</span>
            </a>
          </div>
          <div className="hidden md:block">
            <span>فروش تخصصی قطعات CNC و اتوماسیون صنعتی</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-xl">
              CNC
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-lg">قطعات CNC</div>
              <div className="text-xs text-gray-500">فروشگاه تخصصی</div>
            </div>
          </Link>

          {/* Search bar - desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <form className="w-full flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="جستجوی محصولات..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-l-lg hover:bg-blue-700 transition-colors">
                <Search size={20} />
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={24} />
            </button>

            <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <User size={20} />
                  <span className="text-sm">{session.user?.name || "پروفایل"}</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    پنل مدیریت
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="hidden sm:inline-block px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                >
                  خروج
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <User size={20} />
                <span className="hidden sm:inline text-sm">ورود</span>
              </Link>
            )}

            <button
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="منو"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden mt-4">
            <form className="w-full flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="جستجوی محصولات..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-l-lg hover:bg-blue-700 transition-colors">
                <Search size={20} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Navigation - desktop with mega menu */}
      <nav className="hidden md:block border-t border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex items-center gap-1">
            <li>
              <Link href="/" className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                خانه
              </Link>
            </li>
            <li
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                href="/products"
                className="flex items-center gap-1 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                محصولات
                <ChevronDown size={16} className={`transition-transform duration-200 ${megaMenuOpen ? "rotate-180" : ""}`} />
              </Link>
            </li>
            <li>
              <Link href="/about" className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                درباره ما
              </Link>
            </li>
            <li>
              <Link href="/contact" className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                تماس با ما
              </Link>
            </li>
          </ul>
        </div>

        {/* Mega Menu Dropdown */}
        <div
          className={`absolute top-full right-0 left-0 bg-white border-t border-gray-100 shadow-lg transition-all duration-200 ${
            megaMenuOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Electrical */}
              <div>
                <Link
                  href="/products?category=electrical"
                  className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-700 font-bold"
                >
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Zap size={20} className="text-blue-600" />
                  </div>
                  قطعات برقی
                </Link>
                <ul className="space-y-2">
                  {electricalSubs.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=electrical&sub=${sub.slug}`}
                        className="block px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        onClick={() => setMegaMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mechanical */}
              <div>
                <Link
                  href="/products?category=mechanical"
                  className="flex items-center gap-2 mb-4 text-green-600 hover:text-green-700 font-bold"
                >
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Settings size={20} className="text-green-600" />
                  </div>
                  قطعات مکانیکی
                </Link>
                <ul className="space-y-2">
                  {mechanicalSubs.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=mechanical&sub=${sub.slug}`}
                        className="block px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        onClick={() => setMegaMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Services + Quick Links */}
              <div>
                <Link
                  href="/products?category=services"
                  className="flex items-center gap-2 mb-4 text-purple-600 hover:text-purple-700 font-bold"
                >
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Wrench size={20} className="text-purple-600" />
                  </div>
                  خدمات
                </Link>
                <ul className="space-y-2">
                  {services.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=services&sub=${sub.slug}`}
                        className="block px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        onClick={() => setMegaMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-2">نیاز به مشاوره دارید؟</h3>
                <p className="text-sm text-gray-600 mb-4">
                  تیم متخصص ما آماده راهنمایی شماست
                </p>
                <a
                  href="tel:+982133532602"
                  className="block bg-blue-600 text-white text-center py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  تماس تلفنی
                </a>
                <Link
                  href="/contact"
                  className="block mt-2 text-center text-blue-600 text-sm hover:underline"
                  onClick={() => setMegaMenuOpen(false)}
                >
                  فرم تماس
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-gray-200 bg-white overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="px-4 py-2">
          <ul className="space-y-1">
            <li>
              <Link href="/" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                خانه
              </Link>
            </li>
            <li>
              <Link href="/products" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                همه محصولات
              </Link>
            </li>
            <li>
              <button
                onClick={() => setMobileSubmenu(mobileSubmenu === "electrical" ? null : "electrical")}
                className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                قطعات برقی
                <ChevronDown size={16} className={`transition-transform ${mobileSubmenu === "electrical" ? "rotate-180" : ""}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${mobileSubmenu === "electrical" ? "max-h-[500px]" : "max-h-0"}`}>
                <ul className="pr-4 pb-2">
                  {electricalSubs.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=electrical&sub=${sub.slug}`}
                        className="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li>
              <button
                onClick={() => setMobileSubmenu(mobileSubmenu === "mechanical" ? null : "mechanical")}
                className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                قطعات مکانیکی
                <ChevronDown size={16} className={`transition-transform ${mobileSubmenu === "mechanical" ? "rotate-180" : ""}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${mobileSubmenu === "mechanical" ? "max-h-[500px]" : "max-h-0"}`}>
                <ul className="pr-4 pb-2">
                  {mechanicalSubs.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=mechanical&sub=${sub.slug}`}
                        className="block px-4 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li>
              <Link href="/about" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                درباره ما
              </Link>
            </li>
            <li>
              <Link href="/contact" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                تماس با ما
              </Link>
            </li>
            {isLoggedIn && (
              <>
                <li className="border-t border-gray-100 pt-1 mt-1">
                  <Link href="/profile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    پروفایل
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link href="/admin" className="block px-4 py-3 text-green-600 hover:bg-green-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                      پنل مدیریت
                    </Link>
                  </li>
                )}
                <li>
                  <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg">
                    خروج
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
