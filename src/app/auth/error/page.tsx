"use client";

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">خطا در ورود</h1>
        <p className="text-gray-600 mb-6">
          ممکن است دیتابیس متصل نباشد. لطفاً ابتدا دیتابیس PostgreSQL را راه‌اندازی کنید.
        </p>
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="block bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            تلاش مجدد
          </Link>
          <Link
            href="/"
            className="block text-blue-600 hover:underline"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
