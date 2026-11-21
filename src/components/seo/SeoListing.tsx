import Link from "next/link";
import type { ListProduct } from "@/lib/product-list";

type Crumb = { name: string; href?: string };

export type ListingFilterOption = { name: string; slug: string };

export type ListingFilters = {
  /** زیردسته‌های همین گروه */
  subcategories?: ListingFilterOption[];
  activeSub?: string;
  subHref?: (slug: string) => string;
  allSubHref?: string;
  /** برندهای موجود در همین دسته */
  brands?: ListingFilterOption[];
  activeBrand?: string;
  brandHref?: (slug: string) => string;
  allBrandHref?: string;
};

type Props = {
  breadcrumbs: Crumb[];
  title: string;
  intro?: string;
  note?: string;
  products: ListProduct[];
  total: number;
  page: number;
  pages: number;
  hrefForPage: (page: number) => string;
  filters?: ListingFilters;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
}

export default function SeoListing({
  breadcrumbs,
  title,
  intro,
  note,
  products,
  total,
  page,
  pages,
  hrefForPage,
  filters,
}: Props) {
  const pageNumbers = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 3, pages - 6));
    return start + i;
  }).filter((p) => p <= pages);

  return (
    <div className="container-page py-8">
      <nav className="text-xs text-stone-500 mb-6" aria-label="مسیر">
        {breadcrumbs.map((crumb, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-2">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-blue-600">
                {crumb.name}
              </Link>
            ) : (
              <span className="text-stone-900 font-medium">{crumb.name}</span>
            )}
          </span>
        ))}
      </nav>

      <header className="max-w-3xl mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-stone-900 mb-3">{title}</h1>
      </header>

      {/* فیلتر زیردسته و برند — لینک‌های واقعی و سرور-رندر */}
      {filters && (filters.subcategories?.length || filters.brands?.length) ? (
        <div className="mb-6 space-y-4">
          {filters.subcategories && filters.subcategories.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-bold text-stone-700">زیردسته‌ها</div>
              <div className="flex flex-wrap gap-2">
                {filters.allSubHref && (
                  <Link
                    href={filters.allSubHref}
                    className={!filters.activeSub ? "chip chip-active" : "chip chip-muted"}
                  >
                    همه
                  </Link>
                )}
                {filters.subcategories.map((sub) => (
                  <Link
                    key={sub.slug}
                    href={filters.subHref ? filters.subHref(sub.slug) : "#"}
                    className={filters.activeSub === sub.slug ? "chip chip-active" : "chip chip-muted"}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filters.brands && filters.brands.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-bold text-stone-700">برند</div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={filters.allBrandHref || "#"}
                  className={!filters.activeBrand ? "chip chip-active" : "chip chip-muted"}
                >
                  همه برندها
                </Link>
                {filters.brands.map((brand) => (
                  <Link
                    key={brand.slug}
                    href={filters.brandHref ? filters.brandHref(brand.slug) : "#"}
                    className={filters.activeBrand === brand.slug ? "chip chip-active" : "chip chip-muted"}
                  >
                    {brand.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-2 mb-5 text-sm text-stone-500">
        <span className="font-medium text-stone-700">
          {new Intl.NumberFormat("fa-IR").format(total)} محصول
        </span>
        {pages > 1 && (
          <span>
            — صفحهٔ {new Intl.NumberFormat("fa-IR").format(page)} از{" "}
            {new Intl.NumberFormat("fa-IR").format(pages)}
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card p-10 text-center text-stone-500">محصولی یافت نشد</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="card overflow-hidden">
              <Link
                href={`/products/${encodeURI(product.slug)}`}
                className="block h-44 bg-gray-50 overflow-hidden"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <img src="/logo.png" alt="" aria-hidden="true" className="opacity-50 h-full mx-auto p-6" />
                )}
              </Link>
              <div className="p-4">
                {product.brandName && (
                  <div className="text-xs text-stone-500 mb-1">{product.brandName}</div>
                )}
                <Link
                  href={`/products/${encodeURI(product.slug)}`}
                  className="block font-bold text-stone-800 hover:text-blue-700 line-clamp-2 min-h-[3rem]"
                >
                  {product.name}
                </Link>
                <div className="mt-2">
                  {product.price > 0 ? (
                    <span className="text-base font-bold text-blue-700">{formatPrice(product.price)}</span>
                  ) : (
                    <span className="text-sm text-stone-500">تماس بگیرید</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {intro && <p className="mt-8 text-sm leading-8 text-stone-700 mb-3">{intro}</p>}
      {note && (
        <p className="text-sm leading-7 text-stone-600 border-r-4 border-blue-700 bg-blue-50 pr-4 py-3 rounded-lg">
          {note}
        </p>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="صفحات">
          {page > 1 && (
            <Link href={hrefForPage(page - 1)} className="chip chip-muted">
              قبلی
            </Link>
          )}
          {pageNumbers.map((p) => (
            <Link
              key={p}
              href={hrefForPage(p)}
              className={p === page ? "chip chip-active" : "chip chip-muted"}
            >
              {new Intl.NumberFormat("fa-IR").format(p)}
            </Link>
          ))}
          {page < pages && (
            <Link href={hrefForPage(page + 1)} className="chip chip-muted">
              بعدی
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
