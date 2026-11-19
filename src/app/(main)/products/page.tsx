import type { Metadata } from "next";
import { getFilterNames, getProductListData, type FilterNames, type ProductListFilters } from "@/lib/product-list";
import { getCategoryCopy } from "@/lib/category-copy";
import { categoryPath } from "@/lib/category-url";
import { SITE_URL } from "@/lib/site";
import ProductsView from "@/components/products/ProductsView";

interface Props {
  searchParams: Promise<{
    category?: string;
    sub?: string;
    brand?: string;
    q?: string;
    page?: string;
  }>;
}

function normalizeFilters(sp: {
  category?: string;
  sub?: string;
  brand?: string;
  q?: string;
  page?: string;
}): ProductListFilters {
  return {
    category: sp.category?.trim() || undefined,
    sub: sp.sub?.trim() || undefined,
    brand: sp.brand?.trim() || undefined,
    q: sp.q?.trim() || undefined,
    page: Math.max(1, Math.floor(parseInt(sp.page || "1", 10) || 1)),
  };
}

/**
 * فیلترهای category/sub/brand صفحات فرود اختصاصی دارند؛ canonical به همانها
 * اشاره میکند تا محتوای تکراری ایجاد نشود. جستجو/صفحهٔ ۱ حذف میشوند.
 */
function canonicalFor(filters: ProductListFilters, names: FilterNames): string {
  let path = "/products";
  if (names.sub) {
    path = categoryPath({
      slug: names.sub.slug,
      parent: names.sub.parentSlug ? { slug: names.sub.parentSlug } : null,
    });
  } else if (names.category) path = categoryPath(names.category);
  else if (names.brand) path = `/brand/${encodeURIComponent(names.brand.slug)}`;

  // صفحهبندی فقط در صفحات فرود معنیدار است؛ در /products حذف میشود.
  if (path !== "/products" && (filters.page || 1) > 1) {
    path += `?page=${filters.page}`;
  }
  return path;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = normalizeFilters(await searchParams);
  const names = await getFilterNames(filters);
  const canonical = canonicalFor(filters, names);

  if (filters.q) {
    return {
      title: `جستجو: ${filters.q}`,
      robots: { index: false, follow: true },
      alternates: { canonical: "/products" },
    };
  }

  const target = names.sub || names.category;
  const copy = target ? getCategoryCopy(target.slug, target.name) : null;
  const brandPart = names.brand ? ` | برند ${names.brand.name}` : "";

  const title = names.sub
    ? `خرید ${names.sub.name} — ${names.category?.name || ""}${brandPart}`
    : names.category
      ? `خرید ${names.category.name} — قیمت و انواع${brandPart}`
      : `محصولات — فروشگاه تخصصی قطعات CNC و اتوماسیون${brandPart}`;

  const description = copy
    ? copy.short.length > 155
      ? `${copy.short.slice(0, 152)}…`
      : copy.short
    : "انواع قطعات CNC و اتوماسیون صنعتی با ضمانت اصالت، قیمت رقابتی و مشاورهٔ فنی در فروشگاه شیک.";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const filters = normalizeFilters(await searchParams);
  const data = await getProductListData(filters);

  const crumbs = [
    { name: "خانه", item: `${SITE_URL}/` },
    { name: "محصولات", item: `${SITE_URL}/products` },
    ...(data.names.category
      ? [{ name: data.names.category.name, item: `${SITE_URL}${categoryPath(data.names.category)}` }]
      : []),
    ...(data.names.sub
      ? [{
          name: data.names.sub.name,
          item: `${SITE_URL}${categoryPath({
            slug: data.names.sub.slug,
            parent: data.names.sub.parentSlug ? { slug: data.names.sub.parentSlug } : null,
          })}`,
        }]
      : []),
    ...(data.names.brand
      ? [{ name: `برند ${data.names.brand.name}`, item: `${SITE_URL}/brand/${encodeURIComponent(data.names.brand.slug)}` }]
      : []),
  ];

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  }).replace(/</g, "\\u003c");

  const itemListLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: data.names.sub?.name || data.names.category?.name || "محصولات",
    numberOfItems: data.total,
    itemListElement: data.products.map((p, i) => ({
      "@type": "ListItem",
      position: (data.page - 1) * data.products.length + i + 1,
      url: `${SITE_URL}/products/${encodeURI(p.slug)}`,
      name: p.name,
    })),
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListLd }} />
      <ProductsView data={data} filters={filters} />
    </>
  );
}
