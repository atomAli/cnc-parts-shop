import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAllCategoriesIndex, collectDescendantIds } from "@/lib/category-tree";

export type CardProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  isMeter: boolean;
  brandName: string;
  image: { url: string; alt: string } | null;
};

const cardInclude = {
  brand: { select: { name: true } },
  images: {
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }] as Prisma.ProductImageOrderByWithRelationInput[],
    take: 1,
    select: { url: true, alt: true },
  },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function toCardProduct(p: CardRow): CardProduct {
  const img = p.images[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    isMeter: p.isMeter === true,
    brandName: p.brand?.name ?? "",
    image: img?.url ? { url: img.url, alt: img.alt ?? "" } : null,
  };
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: { slug, active: true },
    include: {
      parent: { select: { slug: true, name: true } },
      children: {
        where: { active: true },
        orderBy: { order: "asc" },
        select: { slug: true, name: true },
      },
    },
  });
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findUnique({ where: { slug } });
}

export async function getCategoryAndDescendantIds(categoryId: string): Promise<string[]> {
  const index = await getAllCategoriesIndex();
  return [categoryId, ...collectDescendantIds(index, categoryId)];
}

export async function fetchProductsPage(
  where: Prisma.ProductWhereInput,
  page: number,
  perPage: number
): Promise<{ items: CardProduct[]; total: number; pages: number }> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: [{ createdAt: "desc" }],
      skip: (safePage - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);
  return {
    items: rows.map(toCardProduct),
    total,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}
