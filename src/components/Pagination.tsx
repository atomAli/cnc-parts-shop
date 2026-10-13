import Link from "next/link";
import { toFaDigits } from "@/lib/phone";

function pageHref(basePath: string, n: number, query?: string) {
  const sp = new URLSearchParams(query ?? "");
  if (n > 1) sp.set("page", String(n));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({
  basePath,
  page,
  pages,
  query,
}: {
  basePath: string;
  page: number;
  pages: number;
  query?: string;
}) {
  if (pages <= 1) return null;

  const nums: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);

  const cell = "px-3 py-1.5 rounded-lg text-sm border transition-colors duration-150";

  return (
    <nav className="flex items-center justify-center gap-2 mt-8 flex-wrap" aria-label="صفحه‌بندی">
      {page > 1 && (
        <Link href={pageHref(basePath, page - 1, query)} className={`${cell} border-gray-300 text-stone-600 hover:bg-gray-50`}>
          قبلی
        </Link>
      )}
      {nums[0] > 1 && (
        <>
          <Link href={pageHref(basePath, 1, query)} className={`${cell} border-gray-300 text-stone-600 hover:bg-gray-50`}>
            {toFaDigits(1)}
          </Link>
          {nums[0] > 2 && <span className="px-1 text-stone-400">…</span>}
        </>
      )}
      {nums.map((n) => (
        <Link
          key={n}
          href={pageHref(basePath, n, query)}
          aria-current={n === page ? "page" : undefined}
          className={
            n === page
              ? `${cell} border-blue-700 bg-blue-700 text-white font-bold`
              : `${cell} border-gray-300 text-stone-600 hover:bg-gray-50`
          }
        >
          {toFaDigits(n)}
        </Link>
      ))}
      {nums[nums.length - 1] < pages && (
        <>
          {nums[nums.length - 1] < pages - 1 && <span className="px-1 text-stone-400">…</span>}
          <Link href={pageHref(basePath, pages, query)} className={`${cell} border-gray-300 text-stone-600 hover:bg-gray-50`}>
            {toFaDigits(pages)}
          </Link>
        </>
      )}
      {page < pages && (
        <Link href={pageHref(basePath, page + 1, query)} className={`${cell} border-gray-300 text-stone-600 hover:bg-gray-50`}>
          بعدی
        </Link>
      )}
    </nav>
  );
}
