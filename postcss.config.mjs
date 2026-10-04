/**
 * ترتیب مهم است:
 * 1. Tailwind استایل‌ها را تولید می‌کند
 * 2. postcss-lightningcss خروجی را برای مرورگرهای قدیمی تبدیل می‌کند:
 *    oklch → hex، color-mix → rgba و افزودن پیشوندهای لازم (مثل -webkit-backdrop-filter)
 *
 * اهداف از فیلد browserslist در package.json خوانده می‌شود
 * (Chrome 60+ / iOS 10+ / Android 5+ / Firefox 60+ / Safari 10+).
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-lightningcss": {},
  },
};

export default config;