/**
 * ترتیب مهم است:
 * 1. Tailwind استایل‌ها را تولید می‌کند
 * 2. postcss-legacy-compat مواردی را که در Chrome 109 / Firefox 115
 *    از کار می‌افتند اصلاح می‌کند:
 *    بازکردن @layer، بیرون‌آوردن مقادیر اولیهٔ --tw-* از @supports،
 *    و ساده‌سازی selectorهای :is()/:where()
 * 3. postcss-lightningcss خروجی را برای مرورگرهای قدیمی تبدیل می‌کند:
 *    oklch → hex، lab → hex، color-mix → rgba و افزودن پیشوندهای لازم
 *
 * اهداف از فیلد browserslist در package.json خوانده می‌شوند.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "./postcss-legacy-compat.cjs": {},
    "postcss-lightningcss": {},
  },
};

export default config;