"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن مطابقت ندارند");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "خطا در ثبت نام");
      } else {
        router.push("/auth/login");
      }
    } catch {
      setError("خطا در ثبت نام");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-bl from-amber-50 via-background to-blue-50 py-12 px-4">
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="relative max-w-md w-full">
        <div className="card p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-black text-white shadow-lg shadow-blue-600/30">
              ش
            </div>
            <h1 className="text-2xl font-black text-stone-900">ثبت نام</h1>
            <p className="mt-2 text-stone-500">فروشگاه شیک | شیک خرید کنید</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-stone-700 mb-1.5">
                  نام و نام خانوادگی
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="علی رجمندی"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-stone-700 mb-1.5">
                  شماره تلفن
                </label>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="09120000000"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-1.5">
                  رمز عبور
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-stone-700 mb-1.5">
                  تکرار رمز عبور
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5"
            >
              {loading ? "در حال ثبت نام..." : "ثبت نام"}
            </button>

            <div className="text-center">
              <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">
                قبلا ثبت نام کرده‌اید؟ وارد شوید
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
