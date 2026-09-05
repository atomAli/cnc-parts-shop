import { Phone, Mail, MapPin, Building, Users, Award, ShieldCheck, Headset, Target, Eye, ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";

const stats = [
  { icon: Building, label: "سال تجربه", value: "۱۵+" },
  { icon: Users, label: "مشتری وفادار", value: "۱۰۰۰+" },
  { icon: Award, label: "محصول فعال", value: "۲۳۰۰+" },
  { icon: ShieldCheck, label: "تضمین اصالت", value: "۱۰۰٪" },
];

const values = [
  {
    icon: ShieldCheck,
    title: "اصالت و کیفیت",
    description:
      "همه محصولات از برندهای معتبر جهانی تأمین و با دقت بازرسی می‌شوند تا با خیال راحت روی ماشین‌آلات شما نصب شوند.",
  },
  {
    icon: Headset,
    title: "مشاوره تخصصی",
    description:
      "تیم فنی ما پیش از خرید، حین انتخاب و بعد از نصب در کنار شماست؛ مشاوره فنی رایگان برای هر پروژه‌ای.",
  },
  {
    icon: Award,
    title: "خدمات پس از فروش",
    description:
      "پشتیبانی، تعمیرات و خدمات پس از فروش برای تمامی محصولات، تا ماشین شما همیشه در خط تولید بماند.",
  },
  {
    icon: Target,
    title: "تنوع محصولات",
    description:
      "بیش از ۲۳۰۰ قلم کالای تخصصی CNC و اتوماسیون صنعتی، تا انتخاب شما فقط به یک مرجع کافی باشد.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-amber-50 via-background to-blue-50">
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-16 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="container-page relative py-16 md:py-24 text-center">
          <span className="eyebrow mb-6">
            <Sparkles size={15} className="text-amber-500" />
            شیک خرید کنید
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-4 mt-4 text-stone-900">درباره فروشگاه شیک</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg leading-relaxed">
            از سال ۱۳۸۸ تا امروز، همراه صنعتگران ایرانی در تأمین قطعات CNC و تجهیزات اتوماسیون صنعتی
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container-page py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="eyebrow mb-4">
              <Building size={15} />
              داستان ما
            </span>
            <h2 className="section-title mt-4 mb-6">از کارگاه تا انبار تخصصی</h2>
            <div className="space-y-4 text-stone-600 leading-relaxed">
              <p>
                فروشگاه شیک فعالیت خود را با تولید ماشین‌آلات CNC (برش و فرز) آغاز کرد و در این مسیر با
                نیاز واقعی بازار به قطعات و تجهیزات تخصصی آشنا شد؛ نیازهایی که متأسفانه در بازار داخل
                به‌سختی و غیرقابل‌اعتماد تأمین می‌شد.
              </p>
              <p>
                امروز با یک تیم مهندسی متخصص، زنجیره تأمین مستقیم از برندهای معتبر جهانی و انبار کامل،
                آماده‌ایم تا قطعه‌ای که نیاز دارید را با قیمت منصفانه و کیفیت تضمین‌شده در اختیارتان
                بگذاریم — از یک واگن خطی ۲۰ میلی‌متری تا اسپیندل ۹ کیلووات و سروموتور صنعتی.
              </p>
              <p className="font-bold text-stone-800">
                ما فقط فروشنده نیستیم؛ مشاور فنی پروژه‌های شما هستیم. شیک خرید کنید.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products" className="btn-primary px-7 py-3">
                مشاهده محصولات
                <ChevronLeft size={18} />
              </Link>
              <Link href="/contact" className="btn-ghost px-7 py-3">
                <Phone size={18} />
                تماس با ما
              </Link>
            </div>
          </div>

          <div className="card grid place-items-center h-80 lg:h-[420px] relative overflow-hidden">
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-blue-100 blur-2xl" />
            <div className="relative text-center text-gray-400">
              <img src="/logo.png" alt="شیک" className="mx-auto mb-4 h-24 w-auto object-contain" />
              <p className="text-stone-500 font-bold">فروشگاه شیک</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white/70 border-y border-gray-100 py-16">
        <div className="container-page">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600">
                  <stat.icon size={28} />
                </div>
                <div className="text-3xl md:text-4xl font-black text-stone-900">{stat.value}</div>
                <div className="text-stone-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="container-page py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600 mb-5">
              <Target size={28} />
            </div>
            <h3 className="text-xl font-black mb-3">ماموریت ما</h3>
            <p className="text-stone-600 leading-relaxed">
              تأمین مطمئن و سریع قطعات و تجهیزات CNC و اتوماسیون صنعتی با اصالت تضمین‌شده و قیمت رقابتی،
              تا صنعتگر ایرانی بدون توقف، به تولید بپردازد.
            </p>
          </div>
          <div className="card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600 mb-5">
              <Eye size={28} />
            </div>
            <h3 className="text-xl font-black mb-3">چشم‌انداز ما</h3>
            <p className="text-stone-600 leading-relaxed">
              تبدیل شدن به مرجع تخصصی اتوماسیون و قطعات CNC کشور؛ جایی که هر صنعتگر بداند برای
              هر قطعه‌ای کافی است فقط یک‌بار شیک خرید کند.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white/70 border-y border-gray-100 py-16">
        <div className="container-page">
          <div className="text-center mb-12">
            <span className="eyebrow mb-3">
              <Sparkles size={15} className="text-amber-500" />
              ارزش‌های ما
            </span>
            <h2 className="section-title mt-4">چهار اصلی که به آن‌ها پایبندیم</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div key={i} className="card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-200">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-blue-600">
                  <value.icon size={26} />
                </div>
                <h3 className="font-black text-lg mb-2">{value.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className="container-page py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-600 via-blue-700 to-blue-800 p-8 md:p-12 text-center text-white">
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold backdrop-blur">
              <Sparkles size={15} className="text-amber-300" />
              شیک خرید کنید
            </span>
            <h2 className="text-2xl md:text-3xl font-black mb-3 mt-5">همکاری یا سفارش تخصصی دارید؟</h2>
            <p className="text-blue-100 mb-7 max-w-2xl mx-auto">
              تیم ما آماده است تا در انتخاب قطعات و تجهیزات پروژه شما مشاوره فنی رایگان ارائه دهد
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+982133724136" className="btn-white px-7 py-3">
                <Phone size={18} />
                <span dir="ltr">021-33724136</span>
              </a>
              <Link href="/contact" className="btn-outline border-white text-white hover:bg-white/10 px-7 py-3">
                فرم تماس
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick contact info */}
      <section className="container-page pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <Phone size={22} />
            </div>
            <div>
              <div className="text-sm text-stone-500">تلفن</div>
              <div className="font-black text-stone-800" dir="ltr">021-33724136</div>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <Mail size={22} />
            </div>
            <div>
              <div className="text-sm text-stone-500">ایمیل</div>
              <div className="font-black text-stone-800">info@cncmarket.ir</div>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <MapPin size={22} />
            </div>
            <div>
              <div className="text-sm text-stone-500">آدرس</div>
              <div className="font-black text-sm text-stone-800">تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}