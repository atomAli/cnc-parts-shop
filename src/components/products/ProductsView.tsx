"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Grid, List, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { isRailOrScrew } from "@/lib/meter-product";
import { catalogTitle } from "@/lib/site";
import type { ProductListData, ProductListFilters, ListProduct } from "@/lib/product-list";

type Props = {
  data: ProductListData;
  filters: ProductListFilters;
};

type SortMode = "kw" | "newest" | "price-asc" | "price-desc" | "name";

function hrefFor(filters: ProductListFilters, changes: Partial<ProductListFilters>) {
  const sp = new URLSearchParams();
  const next = { ...filters, ...changes };
  if (next.category) sp.set("category", next.category);
  if (next.sub) sp.set("sub", next.sub);
  if (next.brand) sp.set("brand", next.brand);
  if (next.q) sp.set("q", next.q);
  if (next.page && next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
}

function ProductCard({
  product,
  viewMode,
}: {
  product: ListProduct;
  viewMode: "grid" | "list";
}) {
  const addItem = useCartStore((s) => s.addItem);
  const meter = isRailOrScrew(product);

  return (
    <div
      className={`card overflow-hidden transition-colors duration-150 hover:shadow-[var(--shadow-card)] ${
        viewMode === "list" ? "flex" : ""
      }`}
    >
      <Link
        href={`/products/${encodeURI(product.slug)}`}
        className={`block bg-gray-50 relative overflow-hidden ${
          viewMode === "list" ? "w-48 shrink-0" : "h-48"
        }`}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="opacity-60 max-h-full max-w-full object-contain p-4"
          />
        )}
        {meter && (
          <span className="absolute top-3 left-3 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow">
            متری
          </span>
        )}
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        {product.brandName && (
          <div className="text-xs text-stone-500 font-medium mb-1">{product.brandName}</div>
        )}
        <Link
          href={`/products/${encodeURI(product.slug)}`}
          className="font-bold text-stone-800 hover:text-blue-600 transition-colors line-clamp-2"
        >
          {product.name}
        </Link>
        <div className="mt-2">
          {product.price > 0 ? (
            <span className="text-lg font-bold text-blue-700">{formatPrice(product.price)}</span>
          ) : (
            <span className="text-sm text-stone-500 font-medium">تماس بگیرید</span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          {meter ? (
            <Link
              href={`/products/${encodeURI(product.slug)}`}
              className="btn-primary w-full justify-center"
            >
              <ShoppingCart size={16} />
              انتخاب متراژ
            </Link>
          ) : (
            <button
              type="button"
              onClick={() =>
                addItem({
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  image: product.image || undefined,
                })
              }
              className="btn-primary w-full"
            >
              <ShoppingCart size={16} />
              افزودن به سبد خرید
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsView({ data, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { products, categories, brands, names, total, pages, page } = data;

  const [sortBy, setSortBy] = useState<SortMode>("kw");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchInput, setSearchInput] = useState(filters.q || "");

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case "kw": {
        const ka = a.kW ?? Infinity;
        const kb = b.kW ?? Infinity;
        if (ka !== kb) return ka - kb;
        const oa = a.categoryOrder || 0;
        const ob = b.categoryOrder || 0;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name, "fa");
      }
      case "newest":
        return b.id.localeCompare(a.id);
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name, "fa");
      default:
        return 0;
    }
  });

  const activeCat = categories.find((c) => c.slug === filters.category);
  const activeSub = activeCat?.children.find((c) => c.slug === filters.sub);
  const currentBrandName = brands.find((b) => b.slug === filters.brand)?.name || names.brand?.name;

  const heading = filters.q
    ? `نتایج جستجو: «${filters.q}»`
    : catalogTitle(names.sub?.name || names.category?.name || "محصولات");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (searchInput.trim()) sp.set("q", searchInput.trim());
    router.push(`${pathname}${sp.size ? `?${sp.toString()}` : ""}`);
  };

  const pageNumbers = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 3, pages - 6));
    return start + i;
  }).filter((p) => p <= pages);

  return (
    <div className="container-page py-8">
      {/* Breadcrumb — کاملاً سرور-رندر و قابل خزیدن */}
      <nav className="text-sm text-stone-500 mb-6" aria-label="مسیر">
        <Link href="/" className="hover:text-blue-600">
          خانه
        </Link>
        <span className="mx-2">/</span>
        {activeCat || names.category ? (
          <Link href="/products" className="hover:text-blue-600">
            محصولات
          </Link>
        ) : (
          <span className="text-stone-900 font-medium">محصولات</span>
        )}
        {(activeCat || names.category) && (
          <>
            <span className="mx-2">/</span>
            {activeSub || names.sub ? (
              <Link
                href={hrefFor(filters, { sub: "", brand: "", page: 1 })}
                className="hover:text-blue-600"
              >
                {names.category?.name || activeCat?.name}
              </Link>
            ) : (
              <span className="text-stone-900 font-medium">
                {names.category?.name || activeCat?.name}
              </span>
            )}
          </>
        )}
        {(activeSub || names.sub) && (
          <>
            <span className="mx-2">/</span>
            <span className="text-stone-900 font-medium">
              {names.sub?.name || activeSub?.name}
            </span>
          </>
        )}
        {currentBrandName && (
          <>
            <span className="mx-2">/</span>
            <span className="text-stone-900 font-medium">{currentBrandName}</span>
          </>
        )}
      </nav>

      <h1 className="text-2xl font-black text-stone-900 mb-6">{heading}</h1>

      {/* Main category chips — لینک به صفحات فرود SSR دستهها */}
      {categories.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className={!filters.category && !filters.sub ? "chip chip-active" : "chip chip-muted"}
            >
              همه محصولات
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${encodeURI(c.slug)}`}
                className={activeCat?.id === c.id || filters.category === c.slug ? "chip chip-active" : "chip chip-muted"}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

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
          <span className="text-sm text-stone-500">
            {new Intl.NumberFormat("fa-IR").format(total)} محصول
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="kw">پیشفرض</option>
            <option value="newest">جدیدترین</option>
            <option value="price-asc">ارزانترین</option>
            <option value="price-desc">گرانترین</option>
            <option value="name">نام</option>
          </select>
          <div className="hidden sm:flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-500 hover:text-blue-600"
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-full ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-500 hover:text-blue-600"
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Subcategory chips */}
      {activeCat && activeCat.children.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={hrefFor(filters, { sub: "", brand: "", page: 1 })}
            className={!filters.sub ? "chip-sub chip-sub-active" : "chip-sub"}
          >
            همه {activeCat.name}
          </Link>
          {activeCat.children.map((child) => (
            <Link
              key={child.id}
              href={hrefFor(filters, { sub: child.slug, brand: "", page: 1 })}
              className={filters.sub === child.slug ? "chip-sub chip-sub-active" : "chip-sub"}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {/* Brand chips */}
      {brands.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-700 text-white text-xs font-black shadow">
              ۱
            </span>
            <span className="text-sm font-bold text-stone-700">برند</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={hrefFor(filters, { brand: "", page: 1 })}
              className={!filters.brand ? "chip chip-active" : "chip chip-muted"}
            >
              همه برندها
            </Link>
            {brands.map((b) => (
              <Link
                key={b.id}
                href={hrefFor(filters, { brand: b.slug, page: 1 })}
                className={filters.brand === b.slug ? "chip chip-active" : "chip chip-muted"}
              >
                {b.name}
                <span className="mr-1 text-xs opacity-70">
                  ({new Intl.NumberFormat("fa-IR").format(b.count)})
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products — لینک کالاها در HTML اولیه موجود است */}
      {sortedProducts.length === 0 ? (
        <div className="card p-12 text-center">
          {filters.q ? (
            <>
              <p className="text-stone-800 text-lg font-bold">
                نتیجهای برای «<span dir="auto">{filters.q}</span>» پیدا نشد
              </p>
              <p className="text-gray-400 text-sm mt-2">
                عبارت دیگری امتحان کنید یا برند / مدل دقیقتر را جستجو کنید.
              </p>
            </>
          ) : (
            <p className="text-stone-500 text-lg">محصولی یافت نشد</p>
          )}
          <Link href="/products" className="btn-primary mt-5">
            مشاهده همه محصولات
          </Link>
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
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))}
        </div>
      )}

      {/* Pagination — لینک واقعی */}
      {pages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={hrefFor(filters, { page: page - 1 })}
              className="chip chip-muted"
            >
              قبلی
            </Link>
          )}
          {pageNumbers.map((p) => (
            <Link
              key={p}
              href={hrefFor(filters, { page: p })}
              className={p === page ? "chip chip-active" : "chip chip-muted"}
            >
              {new Intl.NumberFormat("fa-IR").format(p)}
            </Link>
          ))}
          {page < pages && (
            <Link
              href={hrefFor(filters, { page: page + 1 })}
              className="chip chip-muted"
            >
              بعدی
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
