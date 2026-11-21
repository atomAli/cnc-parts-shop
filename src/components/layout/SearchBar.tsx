"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  discountPrice: number | null;
  brand: string;
  category: string;
  parentCategory: string;
  image: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fa-IR").format(price) + " تومان";

const toFa = (n: number) => n.toLocaleString("fa-IR");

export default function SearchBar({
  autoFocus = false,
  className = "",
}: {
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/suggestions?q=${encodeURIComponent(query.trim())}&limit=7`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
          setOpen(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  const goProduct = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/products/${slug}`);
  };

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <form className="w-full flex" onSubmit={goSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && suggestions.length && setOpen(true)}
          placeholder="جستجوی محصولات..."
          autoFocus={autoFocus}
          className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-l-lg hover:bg-blue-700 transition-colors"
        >
          <Search size={20} />
        </button>
      </form>

      {open && query.trim() && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {loading && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">در حال جستجو...</div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                <SearchX size={16} />
                نتیجه‌ای پیدا نشد
              </div>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goProduct(s.slug)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-right transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt={s.name} className="w-full h-full object-contain" />
                    ) : (
                      <Search size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {[s.brand, s.parentCategory || s.category].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-sm whitespace-nowrap shrink-0">
                    {s.price && s.price > 0 ? (
                      <span className="text-blue-600 font-medium">{formatPrice(s.price)}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">تماس بگیرید</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="border-t border-gray-100">
              <Link
                href={`/products?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-medium"
              >
                مشاهده همه نتایج ({toFa(suggestions.length)}+)
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}