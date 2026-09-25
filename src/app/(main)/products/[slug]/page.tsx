import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProductView from "./ProductView";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400;

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

  return (
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
  );
}