import Link from "next/link";
import {
  Wrench,
  Award,
  Users,
  Phone,
  Settings,
  Cpu,
  Cog,
  CircuitBoard,
  ArrowLeft,
  ShieldCheck,
  Clock,
} from "lucide-react";

const repairServices = [
  {
    icon: CircuitBoard,
    title: "تعمیر برد الکترونیک و اینورتر",
    description:
      "عیب‌یابی و تعمیر تخصصی بردهای الکترونیکی، اینورترها و درایوهای سروموتور در کارگاه مجهز ما با ضمانت.",
  },
  {
    icon: Cog,
    title: "تعمیر و بازسازی اسپیندل",
    description:
      "کالیبراسیون، تعویض بلبرینگ و بازسازی کامل اسپیندل ماشین‌آلات CNC برای بازگرداندن دقت و عمر دستگاه.",
  },
  {
    icon: Cpu,
    title: "تعمیر سروموتور و انکودر",
    description:
      "تشخیص و رفع خطاهای سروموتور و انکودر، تست کامل و تنظیم پارامترهای کنترلی توسط تکنسین متخصص.",
  },
  {
    icon: Settings,
    title: "سرویس و نگهداری ماشین‌آلات",
    description:
      "برنامه نگهداری دوره‌ای، روان‌کاری، تنظیم دقیق محورها و پیشگیری از خرابی‌های پرهزینه دستگاه.",
  },
  {
    icon: Cog,
    title: "تعمیر گیربکس و سیستم حرکتی",
    description:
      "بازسازی گیربکس، بال‌اسکرو و ریل هدایت برای بازیابی دقت حرکت محورهای ماشین.",
  },
  {
    icon: Award,
    title: "مشاوره و راه‌اندازی",
    description:
      "مشاوره فنی انتخاب قطعات، راه‌اندازی دستگاه جدید و عیب‌یابی کارشناسی قبل از هر سفارشی.",
  },
];

const steps = [
  { number: "۱", title: "ارسال درخواست", desc: "دستگاه یا قطعه را با توضیح مشکل به ما ارسال کنید." },
  { number: "۲", title: "عیب‌یابی رایگان", desc: "کارشناسان ما مشکل را بررسی و برآورد هزینه اعلام می‌کنند." },
  { number: "۳", title: "تأیید و تعمیر", desc: "پس از تأیید شما، فرآیند تعمیر با ضمانت انجام می‌شود." },
  { number: "۴", title: "تحویل و پشتیبانی", desc: "قطعه یا دستگاه تعمیرشده با تست نهایی تحویل می‌شود." },
];

export default function RepairsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">خدمات تعمیرات CNC</h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          عیب‌یابی و تعمیر تخصصی ماشین‌آلات و قطعات CNC
        </p>
      </div>

      {/* Intro */}
      <div className="card p-8 md:p-12 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-black mb-4">تعمیرات تخصصی CNC با ضمانت</h2>
            <div className="space-y-4 text-stone-600 leading-relaxed">
              <p>
                تیم فنی شیک با سال‌ها تجربه در زمینه تعمیر و نگهداری ماشین‌آلات CNC، آماده ارائه
                خدمات تعمیرات تخصصی الکترونیکی، الکتریکی و مکانیکی برای انواع دستگاه‌های صنعتی است.
              </p>
              <p>
                دستگاه شما را با دقت عیب‌یابی، هزینه و زمان تعمیر را شفاف اعلام کرده و پس از تأیید شما،
                تعمیر را با قطعات اصلی و ضمانت انجام می‌دهیم تا ماشین‌آلات شما در کوتاه‌ترین زمان به چرخه
                تولید بازگردد. شیک خرید کنید.
              </p>
              <p>
                برای دریافت مشاوره فنی رایگان و برآورد هزینه، همین حالا با کارشناسان ما تماس بگیرید.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-amber-50 h-64 flex items-center justify-center">
            <Wrench size={64} className="text-blue-600" />
          </div>
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {repairServices.map((s, i) => (
          <div key={i} className="card p-6 transition-all duration-300 hover:-translate-y-1">
            <s.icon size={32} className="text-blue-600 mb-4" />
            <h3 className="font-bold text-lg mb-2">{s.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Process */}
      <div className="card p-8 md:p-12 mb-12">
        <h2 className="text-2xl font-bold text-center mb-10">مراحل دریافت خدمات تعمیرات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                {s.number}
              </div>
              <h3 className="font-bold mb-1">{s.title}</h3>
              <p className="text-gray-600 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { icon: Settings, label: "تخصص و تجربه", value: "۱۰+ سال" },
          { icon: Users, label: "ماشین‌آلات تعمیرشده", value: "۱۰۰۰+" },
          { icon: ShieldCheck, label: "ضمانت تعمیر", value: "اطمینان کامل" },
          { icon: Clock, label: "زمان تعمیر سریع", value: "کمتر از انتظار" },
        ].map((stat, i) => (
          <div key={i} className="card p-6 text-center">
            <stat.icon size={32} className="mx-auto text-blue-600 mb-3" />
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-gray-600 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Consultation CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-600 via-blue-700 to-blue-800 p-8 md:p-12 text-center text-white">
        <h3 className="text-2xl font-bold mb-3">مشاوره فنی و برآورد هزینه رایگان</h3>
        <p className="text-blue-100 mb-6">
          کارشناسان ما آماده پاسخگویی به سوالات فنی شما درباره تعمیر و نگهداری ماشین‌آلات CNC هستند
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="tel:+982133724136"
            className="btn-white px-6 py-3"
          >
            <Phone size={18} />
            تماس تلفنی: ۰۲۱-۳۳۷۲۴۱۳۶
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-800 transition-colors"
          >
            فرم تماس
            <ArrowLeft size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}