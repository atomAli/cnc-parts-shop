/**
 * تلفن — یک منبع واحد برای نرمال‌سازی و نمایش.
 *
 * قانون پروژه:
 *   • ذخیره در دیتابیس  → همیشه ارقام انگلیسی استاندارد (09xxxxxxxxx)
 *   • نمایش به کاربر    → همیشه ارقام فارسی (۰۹۱۲۳۴۵۶۷۸۹)
 */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
// ارقام فارسی (U+06F0) و عربی (U+0660) هر دو به عدد ۰..۹ نگاشت می‌شوند
const DIGIT_RANGE = /[۰-۹٠-٩]/g;

/** ارقام فارسی/عربی → انگلیسی. ارقام لاتین را دست‌نخورده می‌گذارد. */
export function toEnDigits(input: string): string {
  return String(input ?? "").replace(DIGIT_RANGE, (d) =>
    String(d.charCodeAt(0) & 0xf)
  );
}

/** ارقام انگلیسی → فارسی. اگر از قبل فارسی باشد، بدون تغییر برمی‌گردد. */
export function toFaDigits(input: string | number): string {
  return String(input ?? "").replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * تلفن را به قالب استاندارد 09xxxxxxxxx تبدیل می‌کند.
 * همهٔ قالب‌های رایج را می‌پذیرد:
 *   09123456789 · 9123456789 · +989123456789 · 00989123456789
 *   989123456789 · ۰۹۱۲۳۴۵۶۷۸۹ · ٠٩١٢٣٤٥٦٧٨٩ · 0912 000 0001
 *
 * عمداً از normalizeFa استفاده نمی‌کنیم چون PUNCT علامت + را حذف می‌کند.
 */
export function normalizePhone(input: unknown): string {
  let s = toEnDigits(String(input ?? ""))
    .trim()
    .replace(/[\s\-()._]/g, "");

  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (s.startsWith("98") && s.length === 12) s = "0" + s.slice(2);
  else if (/^9\d{9}$/.test(s)) s = "0" + s;

  return s;
}

/** آیا تلفن یک شمارهٔ موبایل ایرانی معتبر است؟ */
export function isValidIranPhone(input: unknown): boolean {
  return /^09\d{9}$/.test(normalizePhone(input));
}

/**
 * برای لینک تماس: 09123456789 → +989123456789
 * روی داده‌های نرمال‌شده کار می‌کند و خودش هم دوباره نرمال می‌کند.
 */
export function toTelHref(input: unknown): string {
  const p = normalizePhone(input);
  return p ? "tel:+98" + p.replace(/^0/, "") : "tel:";
}