import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getProductListData } from "@/lib/product-list";
import { SITE_URL, catalogTitle } from "@/lib/site";
import SeoListing from "@/components/seo/SeoListing";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function loadBrand(slug: string) {
  return prisma.brand.findFirst({
    where: {
      slug,
      name: { not: "غیره" },
      products: { some: { active: true } },
    },
    select: { name: true, slug: true, _count: { select: { products: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const brand = await loadBrand(slug);
  if (!brand || brand._count.products < 2) return {};

  const path = `/brand/${encodeURI(slug)}`;
  const title = `خرید محصولات ${brand.name} — قیمت و انواع`;
  const description = `انواع محصولات ${brand.name} در فروشگاه شیک با ضمانت اصالت، قیمت رقابتی و مشاورهٔ فنی. مشاهدهٔ لیست قیمت و خرید آنلاین.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${SITE_URL}${path}`, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const page = Math.max(1, Math.floor(parseInt((await searchParams).page || "1", 10) || 1));
  const brand = await loadBrand(slug);
  if (!brand || brand._count.products < 2) notFound();

  const data = await getProductListData({ brand: slug, page });
  const path = `/brand/${encodeURI(slug)}`;
  const crumbs = [
    { name: "خانه", href: "/" },
    { name: "محصولات", href: "/products" },
    { name: brand.name },
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
    name: `محصولات ${brand.name}`,
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
      <SeoListing
        breadcrumbs={crumbs}
        title={catalogTitle(`محصولات ${brand.name}`)}
        intro={`انواع محصولات ${brand.name} در فروشگاه شیک، با ضمانت اصالت و پشتیبانی فنی کارشناسان ما عرضه میشود. در این صفحه میتوانید لیست قیمت و مدلهای موجود از این برند را مشاهده و مقایسه کنید.`}
        note="برای انتخاب مدل مناسب با دستگاه خود، مشخصات فنی مورد نیاز را با کارشناسان ما در میان بگذارید."
        products={data.products}
        total={data.total}
        page={data.page}
        pages={data.pages}
        hrefForPage={(p) => (p === 1 ? path : `${path}?page=${p}`)}
      />
    </>
  );
}
