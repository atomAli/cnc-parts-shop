import Link from "next/link";
import prisma from "@/lib/prisma";
import { localImages } from "@/lib/local-images";
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

export const revalidate = 3600;

type RecentProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  brandName: string;
};

type HeroBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
};

/** بنر فعال با کمترین اولویت — همان چیزی که در پنل مدیریت «بنر» ساخته می‌شود. */
async function getHeroBanner(): Promise<HeroBanner | null> {
  return prisma.banner.findFirst({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true, subtitle: true, image: true, link: true },
  });
}

async function getRecentProducts(): Promise<RecentProduct[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      brand: { select: { name: true } },
      images: { where: { url: { not: "" } }, orderBy: { order: "asc" }, take: 1 },
    },
  });

  return rows.map((p) => {
    const local = localImages(p.slug, true);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      image: local?.[0]?.url || p.images[0]?.url || "",
      brandName: p.brand?.name || "",
    };
  });
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fa-IR").format(price) + " تومان";

const features = [
  { icon: Truck, title: "ارسال سریع", description: "ارسال به سراسر کشور" },
  { icon: ShieldCheck, title: "ضمانت اصالت", description: "تضمین اصالت کالا" },
  { icon: Headphones, title: "پشتیبانی", description: "مشاوره تخصصی رایگان" },
  { icon: Phone, title: "مشاوره فنی", description: "راهنمایی توسط متخصصین" },
];

function ProductCard({ product }: { product: RecentProduct }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="card overflow-hidden transition-colors duration-150 hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain p-4"
          />
        ) : (
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="opacity-60 max-h-full max-w-full object-contain p-4"
          />
        )}
        {product.brandName && (
          <span className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-stone-500">
            {product.brandName}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="font-bold text-stone-800 line-clamp-2 min-h-[3rem]">
          {product.name}
        </div>
        <div className="mt-3">
          {product.price > 0 ? (
            <span className="text-lg font-bold text-blue-700">{formatPrice(product.price)}</span>
          ) : (
            <span className="text-sm text-gray-500 font-medium">تماس بگیرید</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function HeroBannerCard({ banner }: { banner: HeroBanner }) {
  const content = (
    <>
      <div className="grid place-items-center rounded-2xl bg-blue-50 p-8 overflow-hidden">
        <img
          src={banner.image || "/logo.png"}
          alt={banner.title}
          className="h-40 w-full object-contain"
        />
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-bold text-stone-800" title={banner.title}>
          {banner.title}
        </span>
        <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
          شیک خرید کنید
        </span>
      </div>
      {banner.subtitle && (
        <p className="mt-3 text-xs leading-6 text-stone-500 line-clamp-2" title={banner.subtitle}>
          {banner.subtitle}
        </p>
      )}
    </>
  );

  const className = "card block p-8 rotate-1 transition-transform duration-500 hover:rotate-0";

  return banner.link ? (
    <Link href={banner.link} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default async function HomePage() {
  const [recentProducts, heroBanner] = await Promise.all([
    getRecentProducts(),
    getHeroBanner(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-amber-50">
        <div className="container-page relative py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="eyebrow mb-6">
                <Sparkles size={16} className="text-amber-500" />
                فروش تخصصی قطعات CNC و اتوماسیون صنعتی
              </span>
              <h1 className="text-4xl md:text-6xl font-black leading-tight text-stone-900 mb-6">
                شیک
                <span className="text-blue-700"> خرید کنید</span>
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
                <a href="tel:+982133724136" className="inline-flex items-center gap-2 font-bold text-blue-700 hover:text-blue-700" dir="ltr">
                  021-33724136
                </a>
                <span className="h-1 w-1 rounded-full bg-stone-300" />
                <span>پاسخگویی کارشناسان</span>
              </div>
            </div>

            {/* Hero visual — بنر فعال از پنل مدیریت، با بازگشت به کارت پیش‌فرض */}
            <div className="relative hidden sm:block">
              {heroBanner ? (
                <HeroBannerCard banner={heroBanner} />
              ) : (
                <div className="card p-8 rotate-1 transition-transform duration-500 hover:rotate-0">
                  <div className="grid place-items-center rounded-2xl bg-blue-50 p-8">
                    <img src="/logo.png" alt="شیک" className="h-24 w-auto object-contain" />
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-800">فروشگاه شیک</span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">شیک خرید کنید</span>
                  </div>
                </div>
              )}
              <div className="absolute -top-6 -right-4 card px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-stone-700">
                <ShieldCheck size={18} className="text-blue-600" />
                ضمانت اصالت
              </div>
              <div className="absolute -bottom-5 -left-2 card px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-stone-700">
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
            <div key={i} className="card flex items-center gap-3 p-4">
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

      {/* Recently Updated Products — سرور-رندر شده تا لینک محصولات در HTML اولیه باشد */}
      {recentProducts.length > 0 && (
        <section className="container-page py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title">جدیدترین محصولات</h2>
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
            دستهبندی محصولات
          </span>
          <h2 className="section-title mt-3">شیک خرید کنید</h2>
          <p className="text-stone-600 max-w-2xl mx-auto mt-3">
            طیف وسیعی از قطعات و تجهیزات CNC را با بهترین قیمت و کیفیت از ما تهیه کنید
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/category/inverter"
            className="block rounded-2xl bg-blue-700 p-8 text-white hover:bg-blue-800"
          >
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-600 mb-6">
              <Zap size={28} />
            </div>
            <h3 className="font-bold text-xl mb-2">قطعات برقی</h3>
            <p className="text-blue-50 text-sm">موتور سروو، پی ال سی، اچ ام آی، اینورتر و کنترلر</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold">
              مشاهده
              <ChevronLeft size={16} />
            </span>
          </Link>
          <Link
            href="/category/linear-guide"
            className="block rounded-2xl bg-amber-700 p-8 text-white hover:bg-amber-800"
          >
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-amber-600 mb-6">
              <Settings size={28} />
            </div>
            <h3 className="font-bold text-xl mb-2">قطعات مکانیکی</h3>
            <p className="text-amber-50 text-sm">ریل و واگن، بالسکرو، گیربکس و کوپلینگ</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold">
              مشاهده
              <ChevronLeft size={16} />
            </span>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-page pb-16">
        <div className="rounded-2xl bg-blue-800 px-6 py-10 text-center text-white">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-700 px-4 py-1.5 text-sm font-bold">
              <Sparkles size={15} className="text-amber-300" />
              شیک خرید کنید
            </span>
            <h2 className="text-3xl font-bold mt-6 mb-4">نیاز به مشاوره دارید؟</h2>
            <p className="text-blue-50 mb-8 max-w-2xl mx-auto">
              تیم متخصص ما آماده پاسخگویی به سوالات فنی و ارائه بهترین راهحلها برای پروژههای شماست
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
