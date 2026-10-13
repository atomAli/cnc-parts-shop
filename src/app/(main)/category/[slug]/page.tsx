import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { toFaDigits } from "@/lib/phone";
import {
  getCategoryBySlug,
  getCategoryAndDescendantIds,
  fetchProductsPage,
} from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";

export const revalidate = 86400;

const PER_PAGE = 48;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
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
  const description =
    cat.description?.trim().slice(0, 160) ||
    `خرید و قیمت ${cat.name} با ضمانت اصالت و مشاورهٔ تخصصی از فروشگاه شیک — مرجع قطعات CNC و اتوماسیون صنعتی.`;

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

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10) || 1);
  const ids = await getCategoryAndDescendantIds(cat.id);
  const { items, total, pages } = await fetchProductsPage(
    { active: true, categoryId: { in: ids } },
    page,
    PER_PAGE
  );

  const basePath = `/category/${cat.slug}`;

  const intro =
    cat.description?.trim() ||
    `در دستهٔ «${cat.name}» فروشگاه شیک، انواع قطعات با ضمانت اصالت و قیمت رقابتی عرضه می‌شود.` +
      (cat.children.length
        ? ` زیردسته‌های این گروه شامل ${cat.children.map((c) => c.name).join("، ")} است.`
        : "") +
      " برای انتخاب دقیق‌تر یا مشاورهٔ فنی با کارشناسان ما تماس بگیرید.";

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

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: collectionLd }} />

      {/* Breadcrumb */}
      <nav className="text-sm text-stone-500 mb-6" aria-label="مسیر">
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
      <p className="text-stone-600 leading-relaxed max-w-3xl mb-6">{intro}</p>

      {cat.children.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-bold text-stone-700 mb-2">زیردسته‌ها</div>
          <div className="flex flex-wrap gap-2">
            {cat.children.map((child) => (
              <Link
                key={child.slug}
                href={`/category/${child.slug}`}
                className="chip chip-muted"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-stone-500">{toFaDigits(total)} محصول</span>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-stone-500">
          هنوز محصولی در این دسته ثبت نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination basePath={basePath} page={page} pages={pages} />
    </div>
  );
}
