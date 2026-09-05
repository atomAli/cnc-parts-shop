"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Settings,
  Zap,
  ChevronLeft,
  Phone,
  Truck,
  ShieldCheck,
  Headphones,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  brand: { name: string } | null;
  images: { url: string; isPrimary: boolean }[];
  category: { name: string; slug: string; parentSlug?: string };
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fa-IR").format(price) + " تومان";

const features = [
  { icon: Truck, title: "ارسال سریع", description: "ارسال به سراسر کشور" },
  { icon: ShieldCheck, title: "ضمانت اصالت", description: "تضمین اصالت کالا" },
  { icon: Headphones, title: "پشتیبانی", description: "مشاوره تخصصی رایگان" },
  { icon: Phone, title: "مشاوره فنی", description: "راهنمایی توسط متخصصین" },
];

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative h-48 bg-gradient-to-b from-gray-50 to-blue-50/60 flex items-center justify-center overflow-hidden">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="max-h-full max-w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="text-gray-300 text-sm">تصویر محصول</div>
        )}
        {product.brand?.name && (
          <span className="absolute top-3 right-3 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-[11px] font-bold text-stone-500">
            {product.brand.name}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="font-bold text-stone-800 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
          {product.name}
        </div>
        <div className="mt-3">
          {product.price ? (
            <span className="text-lg font-black text-blue-600">{formatPrice(product.price)}</span>
          ) : (
            <span className="text-sm text-gray-500 font-medium">تماس بگیرید</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products?limit=6&sort=updated")
      .then((r) => r.json())
      .then((data) => setRecentProducts(data.products || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-amber-50 via-background to-blue-50">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="container-page relative py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="eyebrow mb-6">
                <Sparkles size={16} className="text-amber-500" />
                فروش تخصصی قطعات CNC و اتوماسیون صنعتی
              </span>
              <h1 className="text-4xl md:text-6xl font-black leading-tight text-stone-900 mb-6">
                شیک
                <span className="bg-gradient-to-l from-blue-500 to-blue-700 bg-clip-text text-transparent">
                  {" "}خرید کنید
                </span>
              </h1>
              <p className="text-lg md:text-xl text-stone-600 leading-relaxed mb-8 max-w-xl">
                انواع قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون صنعتی از برندهای
                معتبر جهانی — با ضمانت اصالت و قیمت منصفانه.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="btn-primary text-base">
                  مشاهده محصولات
                  <ArrowLeft size={18} />
                </Link>
                <Link href="/contact" className="btn-ghost text-base">
                  <Phone size={18} />
                  تماس با ما
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm text-stone-500">
                <a href="tel:+982133724136" className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700" dir="ltr">
                  021-33724136
                </a>
                <span className="h-1 w-1 rounded-full bg-stone-300" />
                <span>پاسخگویی کارشناسان</span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden sm:block">
              <div className="card p-8 rotate-1 transition-transform duration-500 hover:rotate-0">
                <div className="grid place-items-center rounded-2xl bg-gradient-to-br from-stone-100 to-gray-200 p-8">
                  <img src="/logo.png" alt="شیک" className="h-24 w-auto object-contain" />
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-800">فروشگاه شیک</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">شیک خرید کنید</span>
                </div>
              </div>
              <div className="absolute -top-6 -right-4 card px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-stone-700 shadow-[var(--shadow-soft)]">
                <ShieldCheck size={18} className="text-blue-600" />
                ضمانت اصالت
              </div>
              <div className="absolute -bottom-5 -left-2 card px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-stone-700 shadow-[var(--shadow-soft)]">
                <Truck size={18} className="text-blue-600" />
                ارسال سریع
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <div key={i} className="card flex items-center gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
                <feature.icon size={22} />
              </div>
              <div>
                <div className="font-bold text-sm text-stone-800">{feature.title}</div>
                <div className="text-xs text-stone-500 mt-0.5">{feature.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Updated Products */}
      {recentProducts.length > 0 && (
        <section className="container-page py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="eyebrow mb-3">
                <Sparkles size={15} className="text-blue-600" />
                جدیدترین محصولات
              </span>
              <h2 className="section-title mt-3">آخرین محصولات به‌روزرسانی شده</h2>
            </div>
            <Link href="/products" className="btn-ghost text-sm">
              مشاهده همه
              <ChevronLeft size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="container-page py-16">
        <div className="text-center mb-12">
          <span className="eyebrow mb-3">
            <Sparkles size={15} className="text-amber-500" />
            دسته‌بندی محصولات
          </span>
          <h2 className="section-title mt-3">شیک خرید کنید</h2>
          <p className="text-stone-600 max-w-2xl mx-auto mt-3">
            طیف وسیعی از قطعات و تجهیزات CNC را با بهترین قیمت و کیفیت از ما تهیه کنید
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/products?category=electrical"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-600/30"
          >
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Zap size={28} />
            </div>
            <h3 className="font-black text-xl mb-2">قطعات برقی</h3>
            <p className="text-blue-100 text-sm">موتور سروو، پی ال سی، اچ ام آی، اینورتر و کنترلر</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-white/90 group-hover:gap-2 transition-all">
              مشاهده
              <ChevronLeft size={16} />
            </span>
          </Link>
          <Link
            href="/products?category=mechanical"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 p-8 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/30"
          >
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Settings size={28} />
            </div>
            <h3 className="font-black text-xl mb-2">قطعات مکانیکی</h3>
            <p className="text-amber-100 text-sm">ریل و واگن، بالسکرو، گیربکس و کوپلینگ</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-white/90 group-hover:gap-2 transition-all">
              مشاهده
              <ChevronLeft size={16} />
            </span>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-page pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-600 via-blue-700 to-blue-800 px-6 py-14 md:p-14 text-center text-white">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold backdrop-blur">
              <Sparkles size={15} className="text-amber-300" />
              شیک خرید کنید
            </span>
            <h2 className="text-3xl md:text-4xl font-black mt-6 mb-4">نیاز به مشاوره دارید؟</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              تیم متخصص ما آماده پاسخگویی به سوالات فنی و ارائه بهترین راه‌حل‌ها برای پروژه‌های شماست
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:+982133724136" className="btn-white text-base">
                <Phone size={18} />
                <span dir="ltr">021-33724136</span>
              </a>
              <Link href="/contact" className="btn-outline border-white text-white hover:bg-white/10">
                فرم تماس
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}