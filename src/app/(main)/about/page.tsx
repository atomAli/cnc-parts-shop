import { Phone, Mail, MapPin, Building, Users, Award, Shield, Headset, Target, Eye, ChevronLeft } from "lucide-react";
import Link from "next/link";

const stats = [
  { icon: Building, label: "سال تجربه", value: "۱۵+" },
  { icon: Users, label: "مشتری وفادار", value: "۱۰۰۰+" },
  { icon: Award, label: "محصول فعال", value: "۲۳۰۰+" },
  { icon: Shield, label: "تضمین اصالت", value: "۱۰۰٪" },
];

const values = [
  {
    icon: Shield,
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
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">درباره مارکت CNC</h1>
          <p className="text-blue-100 max-w-2xl mx-auto text-lg leading-relaxed">
            از سال ۱۳۸۸ تا امروز، همراه صنعتگران ایرانی در تأمین قطعات CNC و تجهیزات اتوماسیون صنعتی
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">داستان ما</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                مارکت CNC فعالیت خود را با تولید ماشین‌آلات CNC (برش و فرز) آغاز کرد و در این مسیر با
                نیاز واقعی بازار به قطعات و تجهیزات تخصصی آشنا شد؛ نیازهایی که متأسفانه در بازار داخل
                به‌سختی و غیرقابل‌اعتماد تأمین می‌شد.
              </p>
              <p>
                امروز با یک تیم مهندسی متخصص، زنجیره تأمین مستقیم از برندهای معتبر جهانی و انبار کامل،
                آماده‌ایم تا قطعه‌ای که نیاز دارید را با قیمت منصفانه و کیفیت تضمین‌شده در اختیارتان
                بگذاریم — از یک واگن خطی ۲۰ میلی‌متری تا اسپیندل ۹ کیلووات و سروموتور صنعتی.
              </p>
              <p>
                ما فقط فروشنده نیستیم؛ مشاور فنی پروژه‌های شما هستیم.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                مشاهده محصولات
                <ChevronLeft size={18} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border-2 border-blue-600 text-blue-700 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
              >
                <Phone size={18} />
                تماس با ما
              </Link>
            </div>
          </div>

          <div className="bg-gray-100 rounded-2xl h-80 lg:h-[420px] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Building size={64} className="mx-auto mb-3 text-blue-500" />
              <p>تصویر مجموعه مارکت CNC</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon size={36} className="mx-auto text-blue-600 mb-3" />
                <div className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Target size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">ماموریت ما</h3>
            <p className="text-gray-600 leading-relaxed">
              تأمین مطمئن و سریع قطعات و تجهیزات CNC و اتوماسیون صنعتی با اصالت تضمین‌شده و قیمت رقابتی،
              تا صنعتگر ایرانی بدون توقف، به تولید بپردازد.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Eye size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">چشم‌انداز ما</h3>
            <p className="text-gray-600 leading-relaxed">
              تبدیل شدن به مرجع تخصصی اتوماسیون و قطعات CNC کشور؛ جایی که هر صنعتگر بداند برای
              هر قطعه‌ای کافی است به مارکت CNC مراجعه کند.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">ارزش‌های ما</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            چهار اصل که همه کارهای ما بر آن استوار است
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-md hover:bg-white transition-all">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <value.icon size={26} />
                </div>
                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-blue-600 text-white rounded-2xl p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">همکاری یا سفارش تخصصی دارید؟</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            تیم ما آماده است تا در انتخاب قطعات و تجهیزات پروژه شما مشاوره فنی رایگان ارائه دهد
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+982133724136"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              <Phone size={18} />
              <span dir="ltr">021-33724136</span>
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border-2 border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
            >
              فرم تماس
            </Link>
          </div>
        </div>
      </section>

      {/* Quick contact info */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Phone size={22} />
            </div>
            <div>
              <div className="text-sm text-gray-500">تلفن</div>
              <div className="font-bold" dir="ltr">021-33724136</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Mail size={22} />
            </div>
            <div>
              <div className="text-sm text-gray-500">ایمیل</div>
              <div className="font-bold">info@cncmarket.ir</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <MapPin size={22} />
            </div>
            <div>
              <div className="text-sm text-gray-500">آدرس</div>
              <div className="font-bold text-sm">تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}