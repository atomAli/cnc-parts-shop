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

const BLOCKED_BRANDS = new Set([
  "غیره",
  "سایر",
  "متفرقه",
  "نامشخص",
  "نامعلوم",
  "بدون برند",
  "other",
  "unknown",
  "n/a",
  "none",
  "-",
]);

export type ProductSort = "default" | "newest" | "price-asc" | "price-desc" | "name";

export type BrandFacet = { id: string; name: string; slug: string; count: number };

function productOrderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, { name: "asc" }];
    case "price-desc":
      return [{ price: "desc" }, { name: "asc" }];
    case "name":
      return [{ name: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      return [{ category: { order: "asc" } }, { name: "asc" }];
  }
}

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

export async function getCategoryFacets(
  where: Prisma.ProductWhereInput
): Promise<{ brands: BrandFacet[]; total: number; minPrice: number | null }> {
  const [groups, agg, total] = await Promise.all([
    prisma.product.groupBy({
      by: ["brandId"],
      where: { ...where, brandId: { not: null } },
      _count: { _all: true },
    }),
    prisma.product.aggregate({ where, _min: { price: true } }),
    prisma.product.count({ where }),
  ]);

  const minPrice = agg._min.price ?? null;
  const ids = groups.map((g) => g.brandId).filter((id): id is string => !!id);
  const countById = new Map(groups.map((g) => [g.brandId, g._count._all]));

  if (!ids.length) return { brands: [], total, minPrice };

  const rows = await prisma.brand.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  });

  const brands = rows
    .filter((b) => !!b.slug && !BLOCKED_BRANDS.has(b.name.trim()))
    .map((b) => ({ id: b.id, name: b.name, slug: b.slug, count: countById.get(b.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fa"));

  return { brands, total, minPrice };
}

const SORTS: ProductSort[] = ["default", "newest", "price-asc", "price-desc", "name"];

export function parseSort(value: string | undefined): ProductSort {
  return SORTS.includes(value as ProductSort) ? (value as ProductSort) : "default";
}

export async function fetchProductsPage(
  where: Prisma.ProductWhereInput,
  page: number,
  perPage: number,
  sort: ProductSort = "default"
): Promise<{ items: CardProduct[]; total: number; pages: number }> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: productOrderBy(sort),
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
