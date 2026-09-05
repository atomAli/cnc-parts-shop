import Link from "next/link";

export default function Logo({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-3 ${className}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-black text-white shadow-lg shadow-blue-600/30 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
        ش
      </span>
      <span className="leading-none">
        <span className={`block text-2xl font-black tracking-tight ${dark ? "text-white" : "text-stone-900"}`}>
          شیک
        </span>
        <span className="mt-1 block text-[11px] font-bold text-blue-500">
          شیک خرید کنید
        </span>
      </span>
    </Link>
  );
}