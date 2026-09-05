import Link from "next/link";

export default function Logo({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt="شیک"
        className="h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
      />
      <span className="leading-none">
        <span className={`block text-xl font-black tracking-tight ${dark ? "text-white" : "text-stone-900"}`}>
          شیک
        </span>
        <span className="mt-1 block text-[11px] font-bold text-blue-500">
          شیک خرید کنید
        </span>
      </span>
    </Link>
  );
}