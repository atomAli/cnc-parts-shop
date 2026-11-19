import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getProductListData } from "@/lib/product-list";
import { getCategoryIntro } from "@/lib/category-copy";
import { categoryPath } from "@/lib/category-url";
import { SITE_URL, catalogTitle } from "@/lib/site";
import SeoListing from "@/components/seo/SeoListing";

type Props = {
  params: Promise<{ slug: string; sub?: string[] }>;
  searchParams: Promise<{ page?: string; brand?: string }>;
};

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  parent: { select: { id: true, name: true, slug: true } },
} as const;

async function loadCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, active: true },
    select: categorySelect,
  });
}

type CategoryRow = NonNullable<Awaited<ReturnType<typeof loadCategory>>>;

/**
 * فقط برای متادیتا: دستهٔ معتبر را بدون ریدایرکت پیدا می‌کند.
 * برای آدرس‌های تخت قدیمی (مثل /category/<sub>) مقدار null برمی‌گرداند و
 * ریدایرکت در خود صفحه انجام می‌شود.
 */
async function findCategory(parentSlug: string, sub?: string[]): Promise<CategoryRow | null> {
  if (sub && sub.length > 1) return null;

  if (sub && sub.length === 1) {
    const child = await loadCategory(sub[0]);
    if (!child || !child.parent || child.parent.slug !== parentSlug) return null;
    return child;
  }

  const root = await loadCategory(parentSlug);
  if (!root || root.parent) return null;
  return root;
}

/** دستهٔ هدف را پیدا می‌کند و آدرس‌های قدیمی/نادرست را به مسیر درست هدایت می‌کند. */
async function resolveCategory(parentSlug: string, sub?: string[]): Promise<CategoryRow | null> {
  if (sub && sub.length > 1) return null;

  if (sub && sub.length === 1) {
    const child = await loadCategory(sub[0]);
    if (!child) return null;
    // /category/<sub> → /category/<parent>/<sub>
    if (!child.parent) permanentRedirect(`/category/${encodeURI(child.slug)}`);
    // /category/<اشتباه>/<sub> → /category/<parent>/<sub>
    if (child.parent.slug !== parentSlug) permanentRedirect(categoryPath(child));
    return child;
  }

  const root = await loadCategory(parentSlug);
  if (!root) return null;
  // آدرس تخت قدیمی زیردسته → آدرس تو در تو
  if (root.parent) permanentRedirect(categoryPath(root));
  return root;
}

function readParams(params: Awaited<Props["params"]>) {
  return {
    parentSlug: decodeURIComponent(params.slug),
    sub: params.sub?.map(decodeURIComponent),
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { parentSlug, sub } = readParams(await params);
  const brand = (await searchParams).brand?.trim() || undefined;
  const category = await findCategory(parentSlug, sub);
  if (!category) return {};

  const intro = getCategoryIntro({
    slug: category.slug,
    name: category.name,
    parentSlug: category.parent?.slug,
    parentName: category.parent?.name,
  });
  const path = categoryPath(category);
  const title = `خرید ${category.name} — قیمت و انواع`;

  return {
    title,
    description: intro.lead.slice(0, 155),
    alternates: { canonical: path },
    openGraph: { title, description: intro.lead.slice(0, 155), url: `${SITE_URL}${path}`, type: "website" },
    // ترکیب فیلتر برند صفحهٔ تکراری است؛ برای کاربر کار می‌کند ولی ایندکس نمی‌شود.
    robots: brand ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { parentSlug, sub } = readParams(await params);
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(parseInt(sp.page || "1", 10) || 1));
  const brand = sp.brand?.trim() || undefined;

  const category = await resolveCategory(parentSlug, sub);
  if (!category) notFound();

  const isSub = !!category.parent;
  const subBaseSlug = category.parent?.slug ?? category.slug;

  const [data, subcategories] = await Promise.all([
    getProductListData({
      category: subBaseSlug,
      sub: isSub ? category.slug : undefined,
      brand,
      page,
    }),
    prisma.category.findMany({
      where: { parentId: category.parentId ?? category.id, active: true },
      select: { name: true, slug: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const intro = getCategoryIntro({
    slug: category.slug,
    name: category.name,
    parentSlug: category.parent?.slug,
    parentName: category.parent?.name,
  });

  const path = categoryPath(category);
  const withBrand = (target: string) =>
    brand ? `${target}?brand=${encodeURIComponent(brand)}` : target;

  const crumbs = [
    { name: "خانه", href: "/" },
    { name: "محصولات", href: "/products" },
    ...(category.parent
      ? [{ name: category.parent.name, href: categoryPath(category.parent) }]
      : []),
    { name: category.name },
  ];

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
    })),
  }).replace(/</g, "\\u003c");

  const itemListLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.name,
    numberOfItems: data.total,
    itemListElement: data.products.map((p, i) => ({
      "@type": "ListItem",
      position: (data.page - 1) * data.products.length + i + 1,
      url: `${SITE_URL}/products/${encodeURI(p.slug)}`,
      name: p.name,
    })),
  }).replace(/</g, "\\u003c");

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (brand) q.set("brand", brand);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListLd }} />
      <SeoListing
        breadcrumbs={crumbs}
        title={catalogTitle(category.name)}
        intro={intro.lead}
        note={intro.note}
        products={data.products}
        total={data.total}
        page={data.page}
        pages={data.pages}
        hrefForPage={pageHref}
        filters={{
          subcategories,
          activeSub: isSub ? category.slug : undefined,
          subHref: (slug) => withBrand(`/category/${encodeURI(subBaseSlug)}/${encodeURI(slug)}`),
          allSubHref: category.parent ? withBrand(categoryPath(category.parent)) : undefined,
          brands: data.brands.filter((b) => b.name !== "غیره"),
          activeBrand: brand,
          brandHref: (b) => `${path}?brand=${encodeURIComponent(b)}`,
          allBrandHref: path,
        }}
      />
    </>
  );
}
