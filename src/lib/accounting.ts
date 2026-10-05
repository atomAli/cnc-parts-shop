import { toFaDigits } from "./phone";

/**
 * کمک‌کننده‌های نمایشی ماژول حسابداری.
 *
 * قرارداد علامت‌ها (از خودِ فایل Access استخراج و با داده‌ها راستی‌آزمایی شد):
 *   مبلغ مثبت  = بستانکار → «ما طلب داریم»
 *   مبلغ منفی  = بدهکار   → «طرف حساب به ما بدهکار است»
 *
 * دلیل: در دفتر اشخاص، اسناد فروش/خرید یک طرف و دریافت/پرداخت طرف دیگر را
 * می‌زنند، پس جمع ساده‌شده مستقیماً می‌گوید چه کسی به چه کسی بدهکار است.
 * مثال راستی‌آزمایی‌شده: «عیسی جهانگرد» ۱٬۶۹۶٬۷۳۵٬۰۰۰ تومان خرید و
 * ۱٬۷۳۵٬۱۱۷٬۸۰۰ تومان پرداخت داشته ⇒ مانده منفی ۳۹٬۶۶۶٬۰۰۰ یعنی
 * ما بیشتر داده‌ایم پس او به ما بدهکار است.
 */

/** مبلغ را با جداکنندهٔ هزارگان و ارقام فارسی برمی‌گرداند */
export function money(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return toFaDigits(v.toLocaleString("en-US"));
}

/** مبلغ با علامت مثبت/منفی صریح */
export function signedMoney(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return sign + money(Math.abs(v));
}

/** عدد ساده با ارقام فارسی */
export function num(n: number | null | undefined): string {
  return toFaDigits(Math.round(Number(n ?? 0)).toLocaleString("en-US"));
}

/** تاریخ شمسی «۱۴۰۵/۰۱/۱۷» — ورودی همان رشتهٔ ثابت‌عرض Access است */
export function jalali(date: string | null | undefined): string {
  if (!date) return "—";
  return toFaDigits(date);
}

/** برچسب خوانا برای کدهای نوع سند دفتر اشخاص */
export const VOUCHER_LABEL: Record<number, string> = {
  0: "مانده اول دوره",
  20: "دریافت",
  25: "پرداخت",
  30: "فاکتور فروش",
  31: "تخفیف فروش",
  40: "فاکتور خرید",
  41: "تخفیف خرید",
};

export const voucherLabel = (vt: number): string =>
  VOUCHER_LABEL[vt] ?? `نوع ${toFaDigits(vt)}`;

/**
 * کدهای وضعیت چک در فایل Access فقط عدد هستند و هیچ جدول مرجعی در نرم‌افزار
 * وجود ندارد (جدول Cheque_Logs هم خالی است). بنابراین کد خام را نشان می‌دهیم
 * و صریح می‌گوییم که معنی‌اش از خود فایل قابل استخراج نبود.
 */
export const CHEQUE_STATUS_LABEL: Record<number, string> = {
  2: "کد ۲ — نامشخص",
  13: "کد ۱۳ — نامشخص",
  15: "کد ۱۵ — نامشخص",
};

export const chequeStatusLabel = (s: number | null | undefined): string => {
  if (s === null || s === undefined) return "بدون وضعیت";
  return CHEQUE_STATUS_LABEL[s] ?? `کد ${toFaDigits(s)} — نامشخص`;
};

/** کدهای عملیات کارتکس */
export const STOCK_OP_LABEL: Record<number, string> = {
  0: "مانده اول دوره",
  1: "ورود (خرید)",
  2: "خروج (فروش)",
};

export const stockOpLabel = (op: number): string =>
  STOCK_OP_LABEL[op] ?? `عملیات ${toFaDigits(op)}`;

/** تعداد روزهای مجاز هر ماه شمسی (اسفند ۲۹ روز، فقط سال کبیسه ۳۰) */
function jalaliMonthDays(month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return 29;
}

/**
 * آیا تاریخ یک تاریخ شمسی معقول است؟
 *
 * نرم‌افزار قدیمی SHIK در ورود داده خطا داشته و تاریخ‌هایی مثل «۱۴۰۵/۰۲/۳۰»
 * و «۱۴۰۵/۰۲/۳۱» ثبت کرده که اصلاً وجود ندارند (اسفند ۲۹ روز است). مقادیر را
 * دست‌نخورده نگه می‌داریم چون بخشی از سابقهٔ واقعی کسب‌وکار هستند، ولی در رابط
 * کاربری هشدار می‌دهیم تا کسی روی تاریخ نامعتبر حساب باز کند.
 */
export function isPlausibleJalali(date: string | null | undefined): boolean {
  if (!date) return true;
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(date);
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= jalaliMonthDays(month);
}

/** رنگ نشانگر مانده — تخت و سازگار با Chrome 109 */
export function balanceTone(n: number): string {
  if (n > 0) return "text-blue-700";
  if (n < 0) return "text-red-700";
  return "text-gray-500";
}

/** عنوان مانده */
export function balanceTitle(n: number): string {
  if (n > 0) return "بستانکار — طلب ما";
  if (n < 0) return "بدهکار — طلب طرف حساب";
  return "تسویه";
}

/** نوع طرف حساب */
export function kindLabel(kind: string): string {
  if (kind === "SUPPLIER") return "تأمین‌کننده";
  if (kind === "BOTH") return "مشتری و تأمین‌کننده";
  return "مشتری";
}

/** رنگ نشان نوع */
export function kindTone(kind: string): string {
  if (kind === "SUPPLIER") return "bg-gray-100 text-gray-700";
  if (kind === "BOTH") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-700";
}