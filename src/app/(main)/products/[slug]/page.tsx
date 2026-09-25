import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import ProductView from "./ProductView";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400;
export const dynamic = "force-static";

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

export default async function ProductPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  let specs: Record<string, string> = {};
  if (product.specifications) {
    try {
      specs = JSON.parse(product.specifications);
    } catch {}
  }

  const images = product.images.map((img) => ({
    url: img.url,
    alt: img.alt || "",
    isPrimary: img.isPrimary,
  }));

  const ldImage =
    product.images.find((i) => i.isPrimary)?.url || product.images[0]?.url;

  const productLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: ldImage ? [ldImage] : undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/products/${slug}`,
      priceCurrency: "IRR",
      price: product.price ? Math.round(product.price).toString() : undefined,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "شیک" },
    },
  })
    .replace(/</g, "\\u003c");

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "محصولات", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: product.category?.name, item: `${SITE_URL}/products?category=${product.category?.slug}` },
      { "@type": "ListItem", position: 4, name: product.name, item: `${SITE_URL}/products/${slug}` },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <ProductView
        slug={slug}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          price: product.price,
          sourceUrl: product.sourceUrl || undefined,
          isMeter: product.isMeter,
          specs,
          category: {
            slug: product.category?.slug || "",
            name: product.category?.name || "",
          },
          brand: {
            slug: product.brand?.slug || "",
            name: product.brand?.name || "",
          },
          images,
        }}
      />
    </>
  );
}