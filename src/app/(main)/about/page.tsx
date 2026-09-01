import { Phone, Mail, MapPin, Building, Users, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">درباره ما</h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          شرکت CNCparts با هدف تأمین قطعات و تجهیزات CNC و اتوماسیون صنعتی فعالیت می‌کند
        </p>
      </div>

      {/* Story */}
      <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">داستان ما</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                شرکت مهندسی بازرگانی CNCparts در سال ۱۳۸۸ با هدف ساخت ماشین‌آلات CNC شروع به کار کرد
                و با بهبود و رفع نقایص صنعت کشور، فعالیت خود را در تولید ماشین‌آلات CNC (برش و فرز) آغاز نمود.
              </p>
              <p>
                پس از دو سال فعالیت در تولید، متوجه شد که خلأ تأمین قطعات صنعتی و ابزارهای اتوماسیون صنعتی
                بسیار زیاد است و از آن پس فعالیت خود را بر تأمین و عرضه انواع محصولات CNC و تجهیزات اتوماسیون صنعتی
                متمرکز کرد.
              </p>
              <p>
                امروزه این شرکت با تیمی متخصص و با تجربه، آماده ارائه مشاوره فنی و تأمین بهترین تجهیزات
                برای پروژه‌های صنعتی شماست.
              </p>
            </div>
          </div>
          <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
            <span className="text-gray-400">تصویر شرکت</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { icon: Building, label: "سال فعالیت", value: "۱۵+" },
          { icon: Users, label: "مشتری راضی", value: "۱۰۰۰+" },
          { icon: Award, label: "محصول متنوع", value: "۵۰۰+" },
          { icon: Phone, label: "پشتیبانی", value: "۲۴/۷" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <stat.icon size={32} className="mx-auto text-blue-600 mb-3" />
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Values */}
      <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-8 text-center">ارزش‌های ما</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "کیفیت",
              description: "تضمین اصالت و کیفیت تمامی محصولات عرضه شده با بهترین برندهای جهانی",
            },
            {
              title: "مشاوره تخصصی",
              description: "ارائه مشاوره فنی رایگان توسط متخصصین با تجربه صنعت اتوماسیون",
            },
            {
              title: "خدمات پس از فروش",
              description: "پشتیبانی و خدمات پس از فروش برای تمامی محصولات ارائه شده",
            },
          ].map((value, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">{i + 1}</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
