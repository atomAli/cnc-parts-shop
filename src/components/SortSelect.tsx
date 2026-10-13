"use client";

import { useRouter } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "پیش‌فرض" },
  { value: "newest", label: "جدیدترین" },
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
  { value: "name", label: "نام (الفبا)" },
];

export default function SortSelect({
  basePath,
  value,
  brand,
}: {
  basePath: string;
  value: string;
  brand?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      aria-label="ترتیب نمایش"
      onChange={(e) => {
        const v = e.target.value;
        const sp = new URLSearchParams();
        if (brand) sp.set("brand", brand);
        if (v && v !== "default") sp.set("sort", v);
        const qs = sp.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath);
      }}
      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-blue-500"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
