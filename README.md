# CNC Market — فروشگاه آنلاین مارکت CNC

یک اپلیکیشن فروشگاهی کامل (full-stack) با **Next.js**, **TypeScript** و **Prisma/PostgreSQL** — با احراز هویت، سبد خرید، داشبورد ادمین و API اختصاصی.

## ✨ امکانات

### سمت کاربر (Storefront)
- صفحه اصلی با بنرها و دسته‌بندی‌ها
- لیست محصولات با فیلتر بر اساس دسته، برند و جستجو
- صفحه جزئیات محصول با گالری تصاویر
- سبد خرید (persistent — با zustand)
- ثبت سفارش و مدیریت پروفایل کاربر

### احراز هویت (Auth)
- ثبت‌نام و ورود کاربر
- جلسه امن با **NextAuth.js**
- رمزنگاری رمز عبور با **bcryptjs**

### داشبورد ادمین (Admin Panel)
- مدیریت محصولات، دسته‌بندی‌ها، برندها و بنرها
- مدیریت کاربران و سفارش‌ها
- دسترسی محدود به نقش ADMIN

### بک‌اند (API & Database)
- REST API با **Route Handlers** در Next.js
- دیتابیس **PostgreSQL** با **Prisma ORM**
- مدل‌های: User, Category, Brand, Product, ProductImage, Order, OrderItem, CartItem, Banner, Settings
- روابط سلسله‌مراتبی (خود-مرجع) برای دسته‌بندی‌ها

## 🛠 تکنولوژی‌ها

| بخش | فناوری |
|---|---|
| فرانت‌اند | Next.js (App Router), React, Tailwind CSS |
| زبان | TypeScript |
| بک‌اند | Next.js API Routes |
| پایگاه داده | PostgreSQL, Prisma ORM |
| احراز هویت | NextAuth.js, bcryptjs |
| مدیریت حالت | Zustand |
| آیکون‌ها | lucide-react |

## 🚀 اجرای محلی

### پیش‌نیازها
- Node.js 18+
- PostgreSQL

### مراحل

```bash
# 1. نصب وابستگی‌ها
npm install

# 2. تنظیم متغیرهای محیطی (فایل .env بسازید)
cp .env.example .env
#   → DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ADMIN_PHONE, ADMIN_PASSWORD

# 3. ساخت و اعمال اسکیمای دیتابیس
npx prisma db push

# 4. (اختیاری) پر کردن داده‌های اولیه
npm run db:seed

# 5. اجرا
npm run dev
```

باز کنید: `http://localhost:3000`

## 🧑‍💻 اسکریپت‌ها

| دستور | توضیح |
|---|---|
| `npm run dev` | اجرای سرور توسعه |
| `npm run build` | بیلد production |
| `npm run start` | اجرای bilt |
| `npm run lint` | بررسی کد با ESLint |
| `npm run db:push` | همگام‌سازی اسکیما با دیتابیس |
| `npm run db:migrate` | ساخت migration |
| `npm run db:seed` | پر کردن داده‌های نمونه |
| `npm run db:studio` | باز کردن Prisma Studio |

## 📁 ساختار پروژه

```
src/
├── app/                 # مسیرها و صفحات (App Router)
│   ├── (main)/          # صفحات عمومی (storefront)
│   ├── admin/           # داشبورد ادمین
│   ├── auth/            # ورود / ثبت‌نام
│   └── api/             # REST API Route Handlers
├── components/          # کامپوننت‌های مشترک
├── lib/                 # prisma, auth, data
└── store/               # zustand stores (cart)
prisma/
└── schema.prisma        # مدل‌های دیتابیس
```

## 👤 نقش‌ها

- **USER** — خرید، سبد خرید، مدیریت پروفایل
- **ADMIN** — مدیریت کامل محصولات، سفارش‌ها، کاربران و محتوا

---

ساخته شده با [Next.js](https://nextjs.org)
