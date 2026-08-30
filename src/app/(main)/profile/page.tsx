"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { User, ShoppingCart, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">پروفایل کاربری</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <div className="text-xl font-bold">{session.user?.name || "کاربر"}</div>
            <div className="text-gray-500" dir="ltr">{(session.user as any)?.phone || ""}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">نام:</span>
            <span className="font-medium">{session.user?.name || "-"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">تلفن:</span>
            <span className="font-medium" dir="ltr">{(session.user as any)?.phone || "-"}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-gray-600">نقش:</span>
            <span className="font-medium">{(session.user as any)?.role === "ADMIN" ? "مدیر" : "کاربر"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/cart"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="bg-green-100 text-green-600 p-3 rounded-lg">
            <ShoppingCart size={24} />
          </div>
          <div>
            <div className="font-bold">سبد خرید</div>
            <div className="text-sm text-gray-500">مشاهده سبد خرید</div>
          </div>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4 text-left"
        >
          <div className="bg-red-100 text-red-600 p-3 rounded-lg">
            <LogOut size={24} />
          </div>
          <div>
            <div className="font-bold text-red-600">خروج از حساب</div>
            <div className="text-sm text-gray-500">خروج از پروفایل</div>
          </div>
        </button>
      </div>
    </div>
  );
}
