"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Cpu,
  Wrench,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Phone,
  Truck,
  Shield,
  Clock,
} from "lucide-react";

const categories = [
  {
    name: "قطعات برقی",
    slug: "electrical",
    icon: Zap,
    description: "PLC، HMI، موتور سروو و استپ موتور",
    color: "bg-blue-500",
  },
  {
    name: "قطعات مکانیکی",
    slug: "mechanical",
    icon: Settings,
    description: "ریل و واگن، بالسکرو، گیربکس و کوپلینگ",
    color: "bg-green-500",
  },
  {
    name: "خدمات",
    slug: "services",
    icon: Wrench,
    description: "تعمیرات، قالب‌سازی و اجرای پروژه",
    color: "bg-purple-500",
  },
  {
    name: "محصولات ویژه",
    slug: "featured",
    icon: Cpu,
    description: "پرفروش‌ترین محصولات با بهترین قیمت",
    color: "bg-orange-500",
  },
];

const features = [
  {
    icon: Truck,
    title: "ارسال سریع",
    description: "ارسال به سراسر کشور",
  },
  {
    icon: Shield,
    title: "ضمانت اصالت",
    description: "تضمین اصالت کالا",
  },
  {
    icon: Clock,
    title: "پشتیبانی ۲۴ ساعته",
    description: "مشاوره تخصصی رایگان",
  },
  {
    icon: Phone,
    title: "مشاوره فنی",
    description: "راهنمایی توسط متخصصین",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              فروش تخصصی قطعات CNC
            </h1>
            <p className="text-lg md:text-xl mb-8 text-blue-100">
              عرضه کننده انواع قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون صنعتی از برندهای معتبر جهانی
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/products"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
              >
                مشاهده محصولات
              </Link>
              <Link
                href="/contact"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
              >
                تماس با ما
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <feature.icon size={24} />
                </div>
                <div>
                  <div className="font-bold text-sm">{feature.title}</div>
                  <div className="text-xs text-gray-500">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">دسته‌بندی محصولات</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            ما طیف وسیعی از قطعات و تجهیزات CNC را با بهترین قیمت و کیفیت عرضه می‌کنیم
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all"
            >
              <div className={`${category.color} text-white w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <category.icon size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                {category.name}
              </h3>
              <p className="text-gray-600 text-sm">{category.description}</p>
              <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                مشاهده همه
                <ChevronLeft size={16} className="mr-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Subcategories - Electrical */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">قطعات برقی</h2>
            <Link href="/products?category=electrical" className="text-blue-600 hover:underline flex items-center">
              مشاهده همه
              <ChevronLeft size={16} className="mr-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {["PLC", "HMI", "سروموتور", "استپ‌موتور", "اینورتر", "کنترلر", "اسپیندل‌موتور", "پمپ‌وکیوم", "اسلیپ‌رینگ", "کابل انکدر", "کنترلر دما", "کارت رله"].map(
              (item) => (
                <Link
                  key={item}
                  href={`/products?category=electrical&sub=${encodeURIComponent(item)}`}
                  className="bg-gray-50 hover:bg-blue-50 p-4 rounded-lg text-center transition-colors border border-gray-100 hover:border-blue-200"
                >
                  <div className="text-sm font-medium">{item}</div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* Popular Subcategories - Mechanical */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">قطعات مکانیکی</h2>
            <Link href="/products?category=mechanical" className="text-blue-600 hover:underline flex items-center">
              مشاهده همه
              <ChevronLeft size={16} className="mr-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {["ریل و واگن", "بالسکرو", "بالبوشینگ", "دنده‌شانه‌ای", "گیربکس", "کوپلینگ", "پروفیل", "یاتاقان", "مهره بالسکرو", "ساپورت‌مهره"].map(
              (item) => (
                <Link
                  key={item}
                  href={`/products?category=mechanical&sub=${encodeURIComponent(item)}`}
                  className="bg-gray-50 hover:bg-green-50 p-4 rounded-lg text-center transition-colors border border-gray-100 hover:border-green-200"
                >
                  <div className="text-sm font-medium">{item}</div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">نیاز به مشاوره دارید؟</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            تیم متخصص ما آماده پاسخگویی به سوالات فنی و ارائه بهترین راه‌حل‌ها برای پروژه‌های شماست
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="tel:+982133532602"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              تماس تلفنی
            </a>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
            >
              فرم تماس
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
