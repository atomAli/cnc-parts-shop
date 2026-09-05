"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { ShoppingCart, User, Menu, X, Search, Phone, ChevronDown, Zap, Settings, Wrench, Sparkles } from "lucide-react";
import { useState, useRef } from "react";
import SearchBar from "@/components/layout/SearchBar";
import Logo from "@/components/Logo";

const electricalSubs = [
  { name: "سروموتور و درایو", slug: "servo-motor" },
  { name: "استپ موتور و درایو", slug: "step-motor" },
  { name: "اینورتر", slug: "inverter" },
  { name: "کنترلر", slug: "controller" },
  { name: "اسپیندل موتور", slug: "spindle-motor" },
  { name: "پمپ وکیوم", slug: "vacuum-pump" },
  { name: "اسلیپ رینگ", slug: "slip-ring" },
  { name: "منبع تغذیه", slug: "power-supply" },
  { name: "لیزر فایبر", slug: "laser" },
  { name: "جک برقی", slug: "electric-jack" },
];

const mechanicalSubs = [
  { name: "ریل و واگن خطی", slug: "linear-guide" },
  { name: "بالسکرو و مهره", slug: "ball-screw" },
  { name: "بلبرینگ و یاتاقان", slug: "bearing" },
  { name: "گیربکس", slug: "gearbox" },
  { name: "کوپلینگ", slug: "coupling" },
  { name: "محافظ کابل", slug: "cable-carrier" },
  { name: "شفت و پروفیل", slug: "shaft" },
  { name: "دنده شانه‌ای", slug: "gear-rack" },
];

const services = [
  { name: "تعمیرات", slug: "repairs", href: "/repairs" },
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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      {/* Top bar */}
      <div className="bg-gradient-to-l from-blue-600 via-blue-700 to-blue-800 text-white text-sm">
        <div className="container-page py-2 flex items-center justify-between">
          <a href="tel:+982133724136" className="flex items-center gap-1.5 hover:text-blue-100 transition-colors">
            <Phone size={14} />
            <span dir="ltr">021-33724136</span>
          </a>
          <div className="hidden md:flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-300" />
            <span>شیک خرید کنید | قطعات CNC و اتوماسیون صنعتی</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-page py-4">
        <div className="flex items-center justify-between gap-4">
          <Logo />

          {/* Search bar - desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              className="md:hidden p-2 hover:bg-blue-50 rounded-full transition-colors text-stone-600"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="جستجو"
            >
              <Search size={22} />
            </button>

            <Link href="/cart" className="relative p-2 hover:bg-blue-50 rounded-full transition-colors text-stone-600" aria-label="سبد خرید">
              <ShoppingCart size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 bg-blue-600 text-white text-[11px] w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-stone-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <User size={18} />
                  <span className="text-sm font-medium">{session.user?.name || "پروفایل"}</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-block px-4 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 text-sm transition-colors"
                  >
                    پنل مدیریت
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="hidden sm:inline-block px-4 py-2 text-red-500 hover:bg-red-50 rounded-full text-sm transition-colors"
                >
                  خروج
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="btn-primary"
              >
                <User size={18} />
                <span className="hidden sm:inline">ورود</span>
              </Link>
            )}

            <button
              className="md:hidden p-2 hover:bg-blue-50 rounded-full transition-colors text-stone-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="منو"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden mt-4">
            <SearchBar autoFocus />
          </div>
        )}
      </div>

      {/* Navigation - desktop with mega menu */}
      <nav className="hidden md:block relative border-t border-gray-100">
        <div className="container-page">
          <ul className="flex items-center gap-1">
            <li>
              <Link href="/" className="flex items-center gap-1.5 px-4 py-3 text-stone-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-medium">
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
                className="flex items-center gap-1 px-4 py-3 text-stone-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-medium"
              >
                محصولات
                <ChevronDown size={16} className={`transition-transform duration-200 ${megaMenuOpen ? "rotate-180" : ""}`} />
              </Link>
            </li>
            <li>
              <Link href="/about" className="block px-4 py-3 text-stone-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-medium">
                درباره ما
              </Link>
            </li>
            <li>
              <Link href="/contact" className="block px-4 py-3 text-stone-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-medium">
                تماس با ما
              </Link>
            </li>
          </ul>
        </div>

        {/* Mega Menu Dropdown */}
        <div
          className={`absolute top-full right-0 left-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-[var(--shadow-card)] transition-all duration-200 ${
            megaMenuOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="container-page py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Electrical */}
              <div>
                <Link
                  href="/products?category=electrical"
                  className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-700 font-bold"
                >
                  <div className="grid place-items-center w-9 h-9 rounded-xl bg-blue-100">
                    <Zap size={18} className="text-blue-600" />
                  </div>
                  قطعات برقی
                </Link>
                <ul className="space-y-1.5">
                  {electricalSubs.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=electrical&sub=${sub.slug}`}
                        className="block px-3 py-1.5 text-sm text-stone-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                  className="flex items-center gap-2 mb-4 text-amber-600 hover:text-amber-700 font-bold"
                >
                  <div className="grid place-items-center w-9 h-9 rounded-xl bg-amber-100">
                    <Settings size={18} className="text-amber-600" />
                  </div>
                  قطعات مکانیکی
                </Link>
                <ul className="space-y-1.5">
                  {mechanicalSubs.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/products?category=mechanical&sub=${sub.slug}`}
                        className="block px-3 py-1.5 text-sm text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
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
                  href="/repairs"
                  className="flex items-center gap-2 mb-4 text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  <div className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-100">
                    <Wrench size={18} className="text-emerald-600" />
                  </div>
                  خدمات
                </Link>
                <ul className="space-y-1.5">
                  {services.map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={sub.href}
                        className="block px-3 py-1.5 text-sm text-stone-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        onClick={() => setMegaMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-amber-50 p-6">
                <h3 className="font-black text-lg mb-1.5 text-stone-900">نیاز به مشاوره دارید؟</h3>
                <p className="text-sm text-stone-600 mb-5">
                  شیک خرید کنید؛ تیم متخصص ما آماده راهنمایی شماست
                </p>
                <a
                  href="tel:+982133724136"
                  className="btn-primary w-full"
                >
                  <Phone size={16} />
                  تماس تلفنی
                </a>
                <Link
                  href="/contact"
                  className="block mt-2 text-center text-blue-600 text-sm font-medium hover:underline"
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
        className={`md:hidden border-t border-gray-100 bg-white overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="px-4 py-2">
          <ul className="space-y-1">
            <li>
              <Link href="/" className="block px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                خانه
              </Link>
            </li>
            <li>
              <Link href="/products" className="block px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                همه محصولات
              </Link>
            </li>
            <li>
              <button
                onClick={() => setMobileSubmenu(mobileSubmenu === "electrical" ? null : "electrical")}
                className="flex items-center justify-between w-full px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg font-medium"
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
                        className="block px-4 py-2 text-sm text-stone-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
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
                className="flex items-center justify-between w-full px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg font-medium"
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
                        className="block px-4 py-2 text-sm text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
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
              <Link href="/about" className="block px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                درباره ما
              </Link>
            </li>
            <li>
              <Link href="/contact" className="block px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                تماس با ما
              </Link>
            </li>
            {isLoggedIn && (
              <>
                <li className="border-t border-gray-100 pt-1 mt-1">
                  <Link href="/profile" className="block px-4 py-3 text-stone-700 hover:bg-blue-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    پروفایل
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link href="/admin" className="block px-4 py-3 text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                      پنل مدیریت
                    </Link>
                  </li>
                )}
                <li>
                  <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg">
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