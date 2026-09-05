import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

const siteUrl = SITE_URL;

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, active: true },
    include: {
      category: { select: { slug: true, name: true } },
      brand: { select: { slug: true, name: true } },
      images: {
        where: { url: { not: "" } },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const image = product.images.find((i) => i.isPrimary) || product.images[0];
  const description =
    (product.description || "").slice(0, 160) ||
    `${product.name} - سفارش و مشاوره در فروشگاه شیک`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `${siteUrl}/products/${slug}`,
      type: "website",
      images: image?.url ? [{ url: image.url, alt: product.name }] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductLayout({ params, children }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  const ld = product
    ? JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description || undefined,
          image: product.images.filter((i) => i.url).map((i) => i.url),
          sku: product.sku || undefined,
          brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
          category: product.category.name,
          offers: {
            "@type": "Offer",
            url: `${siteUrl}/products/${slug}`,
            priceCurrency: "IRR",
            price: product.price ? Math.round(product.price).toString() : undefined,
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "شیک" },
          },
        },
        null,
      )
        .replace(/</g, "\\u003c")
    : null;

  const breadcrumbLd = product
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "خانه", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "محصولات", item: `${siteUrl}/products` },
          { "@type": "ListItem", position: 3, name: product.category.name, item: `${siteUrl}/products?category=${product.category.slug}` },
          { "@type": "ListItem", position: 4, name: product.name, item: `${siteUrl}/products/${slug}` },
        ],
      }).replace(/</g, "\\u003c")
    : null;

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ld }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
        />
      )}
      {children}
    </>
  );
}