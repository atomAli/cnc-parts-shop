import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { toFaDigits } from "@/lib/phone";
import { getBrandBySlug, fetchProductsPage, parseSort } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";

export const revalidate = 86400;

const PER_PAGE = 48;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
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
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10) || 1);
  const description = `خرید و قیمت محصولات برند ${brand.name} با ضمانت اصالت و مشاورهٔ تخصصی از فروشگاه شیک — مرجع قطعات CNC و اتوماسیون صنعتی.`;

  return {
    title: page > 1 ? `محصولات ${brand.name} — صفحهٔ ${page}` : `محصولات ${brand.name} — خرید و قیمت`,
    description,
    alternates: { canonical: page > 1 ? `/brand/${brand.slug}?page=${page}` : `/brand/${brand.slug}` },
    openGraph: {
      title: `محصولات ${brand.name}`,
      description,
      url: `${SITE_URL}/brand/${brand.slug}`,
      type: "website",
    },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const slug = decodeSlug((await params).slug);
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const sort = parseSort(sp.sort);
  const { items, total, pages } = await fetchProductsPage(
    { active: true, brandId: brand.id },
    page,
    PER_PAGE,
    sort
  );

  const basePath = `/brand/${brand.slug}`;
  const filterQuery = sort === "default" ? "" : `sort=${sort}`;
  const intro = `محصولات برند ${brand.name} با ضمانت اصالت و قیمت رقابتی در فروشگاه شیک عرضه می‌شود. برای استعلام موجودی، مقایسهٔ مدل‌ها و مشاورهٔ فنی با کارشناسان ما تماس بگیرید.`;

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "محصولات", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: brand.name, item: `${SITE_URL}${basePath}` },
    ],
  }).replace(/</g, "\\u003c");

  const collectionLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `محصولات ${brand.name}`,
    description: intro,
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

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: collectionLd }} />

      <section className="rounded-2xl border border-gray-100 bg-stone-50 px-6 py-7 md:px-8 md:py-9 mb-8">
        <nav className="text-xs text-stone-500 mb-4" aria-label="مسیر">
          <Link href="/" className="hover:text-blue-600">خانه</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-blue-600">محصولات</Link>
          <span className="mx-2">/</span>
          <span className="text-stone-900 font-medium">{brand.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-black text-stone-900 mb-3">
          محصولات {brand.name}
        </h1>
        <p className="text-stone-600 leading-relaxed max-w-3xl">{intro}</p>
      </section>

      <div className="border-t border-gray-200 mb-6" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-200">
        <span className="text-sm text-stone-500">{toFaDigits(total)} محصول</span>
        <SortSelect basePath={basePath} value={sort} />
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-stone-500">
          هنوز محصولی برای این برند ثبت نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination basePath={basePath} page={page} pages={pages} query={filterQuery} />
    </div>
  );
}
