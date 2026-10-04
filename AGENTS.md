# قوانین پروژه — shik.app

## دستگاه هدف

سایت روی یک لپ‌تاپ قدیمی (Core 2 Duo / 4GB / گرافیک نرم‌افزاری) استفاده می‌شود.
مرورگرهای هدف: **Chrome 109** و **Firefox 115**.

هرگز از قابلیتی استفاده نکن که در این دو نباشد. قبل از افزودن هر ویژگی CSS یا
کتابخانهٔ جدید، بپرس: «روی Chrome 109 و Firefox 115 کار می‌کند؟»

## قانون طلایی UI — سادگی

ظاهر سایت باید **ساده و تخت** بماند. هنگام تغییر هر المان، همان سطح سادگی فعلی را حفظ کن.

### ممنوع

| مورد | دلیل |
|---|---|
| `bg-gradient-*` / `bg-linear-*` | کندی رندر روی GPU نرم‌افزاری |
| `blur-*` / `backdrop-blur` | بسیار سنگین؛ قبلاً حذف شد و برنمی‌گردد |
| `bg-clip-text` + `text-transparent` | در Chrome 109 متن را **کاملاً نامرئی** می‌کند |
| `shadow-2xl` / سایه‌های سنگین | افت فریم |
| `group-hover:scale/rotate` و انیمیشن‌های غیرضروری | افت فریم |
| `rounded-3xl` و بزرگ‌تر | `rounded-lg` / `rounded-xl` / `rounded-2xl` کافی است |
| `text-blue-100` / `text-amber-100` روی زمینهٔ تیره | تضاد بسیار کم؛ از `text-white` یا `text-*-50` استفاده کن |
| `oklch()` / `lab()` / `color-mix()` | فقط داخل `@supports` مجاز است |

### مجاز و ترجیحی

- رنگ تخت: `bg-blue-700`، `text-white`، `hover:bg-blue-800`
- `rounded-2xl`، `shadow` یا `shadow-md` فقط برای تعامل‌های مهم
- `transition-colors` با `duration-150` — فقط برای hover ساده
- انیمیشن فقط برای اسپینرهای حین بارگذاری (`animate-spin`)

## چطور مطمئن شویم

بعد از هر تغییر UI:

```bash
npm run build
npx tsc --noEmit          # باید ۰ خطا در src/ بدهد
```

و در CSS خروجی نباید باشد:

- `backdrop-filter`
- `@layer`
- `oklch` (بیرون از `@supports`)
- `background-image: linear-gradient`
- `.rounded-3xl` / `.shadow-2xl`

## قواعد کسب‌وکار — قابل تغییر نیست

- قیمت `price=0` در تغییر گروهی رد شود.
- checkout مهمان: حساب ساخته، auto-login، و مستقیم به فاکتور برود.
- آدرس کاربر و snapshot فاکتور nullable باشند.
- فاکتور پیش‌فرض A4 landscape باشد.
- `PreInvoice.userId` برای فاکتور قدیمی مهمان `null` می‌ماند.

## بکاپ قبل از تغییر

قبل از هر تغییر بزرگ:

```bash
TS=$(date +%Y%m%d-%H%M)
git tag "backup/pre-change-$TS" && git branch "backup/pre-change-$TS"
```

## دیپلوی

`git push origin main` → دیپلوی خودکار. تأیید با:

```bash
sleep 30 && curl -s https://shik.app/ | grep -o '/_next/static/css/[a-z0-9]*\.css' | head -1
```