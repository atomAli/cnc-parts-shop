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

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}