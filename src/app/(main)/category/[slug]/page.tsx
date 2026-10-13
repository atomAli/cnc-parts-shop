import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { toFaDigits } from "@/lib/phone";
import {
  getCategoryBySlug,
  getCategoryAndDescendantIds,
  getCategoryFacets,
  parseSort,
  fetchProductsPage,
} from "@/lib/catalog";
import { getCategoryIntro } from "@/lib/category-copy";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";

export const revalidate = 86400;

const PER_PAGE = 48;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; brand?: string; sort?: string }>;
}

function decodeSlug(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const slug = decodeSlug((await params).slug);
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10) || 1);
  const { lead } = getCategoryIntro({
    slug: cat.slug,
    name: cat.name,
    parentSlug: cat.parent?.slug,
    parentName: cat.parent?.name,
  });
  const description = (cat.description?.trim() || lead).slice(0, 160);

  return {
    title: page > 1 ? `${cat.name} — صفحهٔ ${page}` : `${cat.name} — خرید و قیمت`,
    description,
    alternates: { canonical: page > 1 ? `/category/${cat.slug}?page=${page}` : `/category/${cat.slug}` },
    openGraph: {
      title: cat.name,
      description,
      url: `${SITE_URL}/category/${cat.slug}`,
      type: "website",
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const slug = decodeSlug((await params).slug);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const sort = parseSort(sp.sort);
  const brand = (sp.brand || "").trim();

  const ids = await getCategoryAndDescendantIds(cat.id);
  const basePath = `/category/${cat.slug}`;
  const categoryWhere = { active: true, categoryId: { in: ids } };
  const where = brand ? { ...categoryWhere, brand: { slug: brand } } : categoryWhere;

  const [{ items, total, pages }, facets] = await Promise.all([
    fetchProductsPage(where, page, PER_PAGE, sort),
    getCategoryFacets(categoryWhere),
  ]);

  const { lead, note } = getCategoryIntro({
    slug: cat.slug,
    name: cat.name,
    parentSlug: cat.parent?.slug,
    parentName: cat.parent?.name,
  });

  const brandNames = facets.brands.slice(0, 5).map((b) => b.name);

  const statSentence =
    facets.total > 0
      ? `در حال حاضر ${toFaDigits(facets.total)} مدل در این دسته موجود است` +
        (brandNames.length ? `؛ از جملهٔ برندهای ${brandNames.join("، ")}` : "") +
        (facets.minPrice
          ? `. قیمت‌ها از ${new Intl.NumberFormat("fa-IR").format(facets.minPrice)} تومان شروع می‌شود.`
          : ".")
      : "";

  const childrenSentence = cat.children.length
    ? `زیرگروه‌های این دسته شامل ${cat.children.map((c) => c.name).join("، ")} است.`
    : "";

  const intro = lead;

  const buildUrl = (opts: { brand?: string; sort?: string }) => {
    const q = new URLSearchParams();
    const b = opts.brand ?? brand;
    const s = opts.sort ?? (sort === "default" ? "" : sort);
    if (b) q.set("brand", b);
    if (s) q.set("sort", s);
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const filterQuery = (() => {
    const q = new URLSearchParams();
    if (brand) q.set("brand", brand);
    if (sort !== "default") q.set("sort", sort);
    return q.toString();
  })();

  const breadcrumbItems = [
    { name: "خانه", item: `${SITE_URL}/` },
    { name: "محصولات", item: `${SITE_URL}/products` },
    ...(cat.parent
      ? [{ name: cat.parent.name, item: `${SITE_URL}/category/${cat.parent.slug}` }]
      : []),
    { name: cat.name, item: `${SITE_URL}${basePath}` },
  ];

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  }).replace(/</g, "\\u003c");

  const collectionLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    description: intro.slice(0, 300),
    url: `${SITE_URL}${basePath}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: (page - 1) * PER_PAGE + i + 1,
        url: `${SITE_URL}/products/${p.slug}`,
        name: p.name,
      })),
    },
  }).replace(/</g, "\\u003c");

  const hasChildren = cat.children.length > 0;

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: collectionLd }} />

      {/* Hero */}
      <section className="rounded-2xl border border-gray-100 bg-stone-50 px-6 py-7 md:px-8 md:py-9 mb-8">
        <nav className="text-xs text-stone-500 mb-4" aria-label="مسیر">
          <Link href="/" className="hover:text-blue-600">خانه</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-blue-600">محصولات</Link>
          {cat.parent && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/category/${cat.parent.slug}`} className="hover:text-blue-600">
                {cat.parent.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-stone-900 font-medium">{cat.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-black text-stone-900 mb-3">{cat.name}</h1>
        <p className="text-stone-600 leading-relaxed max-w-3xl">{lead}</p>

        {facets.total > 0 && (
          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <div className="text-xl font-black text-stone-900">{toFaDigits(facets.total)}</div>
              <div className="text-xs text-stone-500 mt-0.5">مدل کالا</div>
            </div>
            {facets.brands.length > 0 && (
              <div>
                <div className="text-xl font-black text-stone-900">
                  {toFaDigits(facets.brands.length)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">برند</div>
              </div>
            )}
            {facets.minPrice ? (
              <div>
                <div className="text-xl font-black text-blue-700">
                  {new Intl.NumberFormat("fa-IR").format(facets.minPrice)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">تومان (از)</div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Brand selection — above products */}
      {facets.brands.length > 0 && (
        <section className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-stone-800">انتخاب برند</h2>
            {brand && (
              <Link
                href={buildUrl({ brand: "" })}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                حذف فیلتر برند
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildUrl({ brand: "" })}
              className={!brand ? "chip chip-active" : "chip chip-muted"}
            >
              همه برندها
            </Link>
            {facets.brands.map((b) => (
              <Link
                key={b.id}
                href={buildUrl({ brand: b.slug })}
                className={brand === b.slug ? "chip chip-active" : "chip chip-muted"}
              >
                {b.name}
                <span className="mr-1 text-xs opacity-70">({toFaDigits(b.count)})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-gray-200 mb-6" />

      {/* Subcategories (sidebar) + products */}
      <div
        className={
          hasChildren
            ? "lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:items-start"
            : ""
        }
      >
        {hasChildren && (
          <aside className="hidden lg:block">
            <h2 className="mb-3 pb-2 border-b border-gray-200 text-sm font-bold text-stone-800">
              زیردسته‌ها
            </h2>
            <ul className="space-y-0.5">
              {cat.children.map((child) => (
                <li key={child.slug}>
                  <Link
                    href={`/category/${child.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="min-w-0">
          {hasChildren && (
            <div className="lg:hidden mb-6">
              <div className="mb-2 pb-2 border-b border-gray-200 text-sm font-bold text-stone-700">
                زیردسته‌ها
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.children.map((child) => (
                  <Link key={child.slug} href={`/category/${child.slug}`} className="chip chip-muted">
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-200">
            <span className="text-sm text-stone-500">{toFaDigits(total)} محصول</span>
            <SortSelect basePath={basePath} value={sort} brand={brand || undefined} />
          </div>

          {items.length === 0 ? (
            <div className="card p-12 text-center text-stone-500">
              {brand ? (
                <>
                  <p className="text-stone-800 font-bold mb-4">
                    محصولی از این برند در این دسته یافت نشد.
                  </p>
                  <Link href={buildUrl({ brand: "" })} className="btn-primary inline-flex">
                    حذف فیلتر برند
                  </Link>
                </>
              ) : (
                "هنوز محصولی در این دسته ثبت نشده است."
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <Pagination basePath={basePath} page={page} pages={pages} query={filterQuery} />
        </div>
      </div>

      {/* SEO content */}
      <section className="mt-12 border-t border-gray-200 pt-8">
        <div className="max-w-3xl space-y-3 text-stone-600 leading-relaxed">
          {statSentence && <p>{statSentence}</p>}
          {childrenSentence && <p>{childrenSentence}</p>}
          <p>{note}</p>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
          {[
            "ضمانت اصالت کالا",
            "مشاورهٔ فنی تخصصی و رایگان",
            "ارسال سریع به سراسر کشور",
            "تأمین قطعات یدکی و پشتیبانی پس از فروش",
          ].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
