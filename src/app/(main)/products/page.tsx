"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Filter, Grid, List, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  brand: string | { name: string };
  category: { name: string; slug: string; parentSlug?: string; parentName?: string };
  subcategory?: string;
  images: { url: string; isPrimary: boolean }[];
  stock: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const cat = searchParams.get("category") || "";
  const sub = searchParams.get("sub") || "";
  const brand = searchParams.get("brand") || "";
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState(q);

  const fetchProducts = useCallback(async (category: string, subcategory: string, brandSlug: string, search: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "1000" });
    if (subcategory) params.set("sub", subcategory);
    else if (category) params.set("category", category);
    if (brandSlug) params.set("brand", brandSlug);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }, []);

  const fetchBrands = useCallback(async (category: string, subcategory: string) => {
    const params = new URLSearchParams();
    if (subcategory) params.set("sub", subcategory);
    else if (category) params.set("category", category);
    if (!params.toString()) { setBrands([]); return; }

    try {
      const res = await fetch(`/api/brands?${params}`);
      const data = await res.json();
      setBrands(data || []);
    } catch {
      setBrands([]);
    }
  }, []);

  useEffect(() => {
    fetchProducts(cat, sub, brand, q);
    fetchBrands(cat, sub);
    setSearchInput(q);
  }, [cat, sub, brand, q, fetchProducts, fetchBrands]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d || []));
  }, []);

  const navigate = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`${pathname}?${sp.toString()}`);
  };

  const handleCategoryClick = (slug: string) => {
    navigate({ category: slug, sub: "", brand: "" });
  };

  const handleSubcategoryClick = (slug: string) => {
    navigate({ sub: slug, brand: "" });
  };

  const handleBrandClick = (slug: string) => {
    navigate({ brand: slug });
  };

  const handleClearFilter = () => {
    router.push(pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ q: searchInput });
  };

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-asc": return (a.price || 0) - (b.price || 0);
      case "price-desc": return (b.price || 0) - (a.price || 0);
      case "name": return a.name.localeCompare(b.name, "fa");
      default: return 0;
    }
  });

  const getBrandName = (b: string | { name: string }) =>
    typeof b === "string" ? b : b?.name || "";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fa-IR").format(price) + " تومان";

  const currentCategory = categories.find((c) => c.slug === cat);
  const currentSubName = currentCategory?.children?.find((s) => s.slug === sub)?.name || "";
  const currentBrandName = brands.find((b) => b.slug === brand)?.name || "";

  const showBrands = (cat || sub) && brands.length > 0;
  const activeCat = currentCategory;
  const activeSub = activeCat?.children?.find((c) => c.slug === sub);

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-stone-500 mb-6">
        <Link href="/" className="hover:text-blue-600">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900 font-medium">محصولات</span>
        {activeCat && (
          <>
            <span className="mx-2">/</span>
            <button onClick={() => handleCategoryClick(activeCat.slug)} className="hover:text-blue-600">{activeCat.name}</button>
          </>
        )}
        {activeSub && (
          <>
            <span className="mx-2">/</span>
            <button onClick={() => handleSubcategoryClick(activeSub.slug)} className="hover:text-blue-600">{activeSub.name}</button>
          </>
        )}
        {currentBrandName && (
          <>
            <span className="mx-2">/</span>
            <span className="text-stone-900 font-medium">{currentBrandName}</span>
          </>
        )}
      </div>

      {/* Search + Sort */}
      <div className="card mb-6 p-4 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجوی محصول..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search size={18} className="text-gray-400 hover:text-blue-600" />
          </button>
        </form>

        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">{total} محصول</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">جدیدترین</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
            <option value="name">نام</option>
          </select>
          <div className="hidden sm:flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full ${viewMode === "grid" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-blue-600"}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-full ${viewMode === "list" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-blue-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-black shadow">۱</span>
          <span className="text-sm font-bold text-stone-700">دسته‌بندی</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClearFilter}
            className={!cat ? "chip chip-active" : "chip chip-muted"}
          >
            همه
          </button>
          {categories.map((c) => (
            <div key={c.id} className="relative group">
              <button
                onClick={() => handleCategoryClick(c.slug)}
                className={cat === c.slug ? "chip chip-active" : "chip chip-muted"}
              >
                {c.name}
              </button>
              {/* Subcategory dropdown */}
              {c.children && c.children.length > 0 && (
                <div className="absolute top-full right-0 mt-1 hidden group-hover:block z-50 min-w-[200px] rounded-2xl border border-gray-100 bg-white p-2 shadow-[var(--shadow-card)]">
                  {c.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleSubcategoryClick(child.slug)}
                      className={`block w-full text-right px-3 py-2 rounded-lg text-sm ${
                        sub === child.slug
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "hover:bg-gray-50 text-stone-700"
                      }`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active subcategory chips */}
      {activeCat && activeCat.children && activeCat.children.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate({ sub: "" })}
              className={`chip-sub ${!sub ? "chip-sub-active" : ""}`}
            >
              همه {activeCat.name}
            </button>
            {activeCat.children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleSubcategoryClick(child.slug)}
                className={`chip-sub ${sub === child.slug ? "chip-sub-active" : ""}`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Brand chips */}
      {showBrands && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white text-xs font-black shadow">۲</span>
            <span className="text-sm font-bold text-stone-700">برند</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate({ brand: "" })}
              className={!brand ? "chip chip-active" : "chip chip-muted"}
            >
              همه برندها
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBrandClick(b.slug)}
                className={brand === b.slug ? "chip chip-active" : "chip chip-muted"}
              >
                {b.name}
                {b._count && <span className="mr-1 text-xs opacity-70">({b._count.products})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-stone-500 mt-4">در حال بارگذاری...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="card p-12 text-center">
          {q ? (
            <>
              <p className="text-stone-800 text-lg font-bold">
                نتیجه‌ای برای «<span dir="auto">{q}</span>» پیدا نشد
              </p>
              <p className="text-gray-400 text-sm mt-2">
                عبارت دیگری امتحان کنید یا برند / مدل دقیق‌تر را جستجو کنید.
              </p>
            </>
          ) : (
            <p className="text-stone-500 text-lg">محصولی یافت نشد</p>
          )}
          <button
            onClick={handleClearFilter}
            className="btn-primary mt-5"
          >
            مشاهده همه محصولات
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className={`group card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] ${
                viewMode === "list" ? "flex" : ""
              }`}
            >
              <Link href={`/products/${product.slug}`} className={`block bg-gradient-to-b from-gray-50 to-blue-50/60 relative overflow-hidden ${
                viewMode === "list" ? "w-48 shrink-0" : "h-48"
              }`}>
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">تصویر محصول</div>
                )}
              </Link>
              <div className="p-5 flex-1 flex flex-col">
                <div className="text-xs text-stone-500 font-medium mb-1">{getBrandName(product.brand)}</div>
                <Link href={`/products/${product.slug}`} className="font-bold text-stone-800 hover:text-blue-600 transition-colors line-clamp-2">
                  {product.name}
                </Link>
                <div className="mt-2">
                  {product.price ? (
                    <span className="text-lg font-black text-blue-600">{formatPrice(product.price)}</span>
                  ) : (
                    <span className="text-sm text-stone-500 font-medium">تماس بگیرید</span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() =>
                      addItem({ id: product.id, name: product.name, slug: product.slug, price: product.price || 0, image: product.images?.[0]?.url })
                    }
                    className="btn-primary w-full"
                  >
                    <ShoppingCart size={16} />
                    افزودن به سبد خرید
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container-page py-8">
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-stone-500 mt-4">در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}