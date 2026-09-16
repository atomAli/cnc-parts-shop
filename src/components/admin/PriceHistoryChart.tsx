"use client";

import { useEffect, useMemo, useState } from "react";

interface HistoryRow {
  id: string;
  price: number;
  discountPrice: number | null;
  validFrom: string;
  validUntil: string | null;
}

function faDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function faNum(n: number) {
  return n.toLocaleString("fa-IR");
}

export default function PriceHistoryChart({ productId }: { productId: string }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/admin/products/${productId}/price-history`)
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  const sortedAsc = useMemo(
    () => [...rows].sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime()),
    [rows],
  );

  const { points, xScale, yScale, maxPrice } = useMemo(() => {
    if (sortedAsc.length === 0) {
      return { points: [] as [number, number][], xScale: () => 0, yScale: () => 0, maxPrice: 0 };
    }
    const W = 560;
    const H = 180;
    const PAD = 28;
    const dates = sortedAsc.flatMap((r) => [new Date(r.validFrom).getTime(), r.validUntil ? new Date(r.validUntil).getTime() : new Date(r.validFrom).getTime()]);
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const maxVal = Math.max(...sortedAsc.map((r) => r.price)) * 1.1 || 1;
    const xScale = (t: number) => PAD + ((t - minDate) / Math.max(maxDate - minDate, 1)) * (W - 2 * PAD);
    const yScale = (p: number) => H - PAD - (p / maxVal) * (H - 2 * PAD);

    const pts: [number, number][] = [];
    let prevPriceY: number | null = null;
    for (const r of sortedAsc) {
      const x = xScale(new Date(r.validFrom).getTime());
      const y = yScale(r.price);
      if (!pts.length) pts.push([x, y]);
      else {
        pts.push([x, prevPriceY!]);
        pts.push([x, y]);
      }
      prevPriceY = y;
    }
    return { points: pts, xScale, yScale, maxPrice: maxVal };
  }, [sortedAsc]);

  const sortedDesc = useMemo(() => [...rows].sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()), [rows]);

  if (loading) {
    return <div className="text-sm text-gray-400 py-2">در حال بارگذاری تاریخچه قیمت...</div>;
  }

  if (rows.length === 0) {
    return <div className="text-sm text-gray-400 py-2">تاریخچه‌ای ثبت نشده است.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
      <h3 className="font-bold">تاریخچه قیمت</h3>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 560 180" className="w-full h-auto min-w-[360px]" preserveAspectRatio="none">
          <line x1="28" y1="152" x2="532" y2="152" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="28" y1="28" x2="28" y2="152" stroke="#e5e7eb" strokeWidth="1" />
          {points.length >= 2 && (
            <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2" />
          )}
          {sortedAsc.map((r) => {
            const cx = xScale(new Date(r.validFrom).getTime());
            const cy = yScale(r.price);
            return (
              <g key={r.id}>
                <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />
                <title>{`${r.price.toLocaleString("fa-IR")} تومان\nاز ${faDate(r.validFrom)} تا ${r.validUntil ? faDate(r.validUntil) : "اکنون"}`}</title>
              </g>
            );
          })}
          <text x="10" y={yScale(maxPrice)} className="text-[10px] fill-gray-500" textAnchor="start">
            تومان
          </text>
        </svg>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2">از</th>
              <th className="px-3 py-2">تا</th>
              <th className="px-3 py-2">قیمت</th>
              <th className="px-3 py-2">قیمت تخفیفی</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedDesc.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 whitespace-nowrap">{faDate(r.validFrom)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.validUntil ? faDate(r.validUntil) : "اکنون"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{faNum(r.price)} تومان</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.discountPrice ? `${faNum(r.discountPrice)} تومان` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}