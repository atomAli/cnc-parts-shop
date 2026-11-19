import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAllCategoriesIndex, collectDescendantIds } from "@/lib/category-tree";
import { getSearchCandidates, rankProducts } from "@/lib/search-catalog";
import { normalizeFa } from "@/lib/search";
import { kWFromName } from "@/lib/kw";
import { localImages } from "@/lib/local-images";

export const PRODUCTS_PER_PAGE = 48;

export type ProductListFilters = {
  category?: string;
  sub?: string;
  brand?: string;
  q?: string;
  page?: number;
};

export type ListProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  brandName: string;
  categoryName: string;
  categorySlug: string;
  isMeter: boolean;
  subcategory: string;
  kW: number | null;
  categoryOrder: number;
};

export type CategoryFilter = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

export type BrandFilter = { id: string; name: string; slug: string; count: number };

export type FilterNames = {
  category?: { name: string; slug: string };
  /** زیردسته با اسلاگ دستهٔ اصلی، برای ساخت آدرس تو در تو. */
  sub?: { name: string; slug: string; parentSlug?: string };
  brand?: { name: string; slug: string };
};

export type ProductListData = {
  products: ListProduct[];
  total: number;
  pages: number;
  page: number;
  categories: CategoryFilter[];
  brands: BrandFilter[];
  names: FilterNames;
};

const productInclude = {
  category: { include: { parent: true } },
  brand: true,
  images: { where: { isPrimary: true }, take: 1 },
} satisfies Prisma.ProductInclude;

type Row = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function toListItem(p: Row): ListProduct {
  const local = localImages(p.slug, true);
  const image = local?.[0]?.url || p.images[0]?.url || "";
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image,
    brandName: p.brand?.name || "",
    categoryName: p.category?.name || "",
    categorySlug: p.category?.slug || "",
    isMeter: p.isMeter === true,
    subcategory: p.category?.slug || "",
    kW: kWFromName(p.name),
    categoryOrder: p.category?.order || 0,
  };
}

/** فقط نامهای فیلترها — برای ساخت title و description متادیتا. */
export async function getFilterNames(filters: ProductListFilters): Promise<FilterNames> {
  const { category, sub, brand } = filters;
  const slugs = [category, sub, brand].filter((s): s is string => !!s);
  if (!slugs.length) return {};

  const rows = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      name: true,
      parent: { select: { slug: true } },
    },
  });
  const brands = await prisma.brand.findMany({
    where: brand ? { slug: brand } : { slug: { in: [] } },
    select: { slug: true, name: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const categoryRow = category ? bySlug.get(category) : undefined;
  const subRow = sub ? bySlug.get(sub) : undefined;

  return {
    category: categoryRow ? { name: categoryRow.name, slug: categoryRow.slug } : undefined,
    sub: subRow
      ? { name: subRow.name, slug: subRow.slug, parentSlug: subRow.parent?.slug }
      : undefined,
    brand: brand ? brands[0] : undefined,
  };
}

async function getCategoryIds(slug: string): Promise<string[]> {
  const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!cat) return [];
  const index = await getAllCategoriesIndex();
  return [cat.id, ...collectDescendantIds(index, cat.id)];
}

export async function getProductListData(filters: ProductListFilters): Promise<ProductListData> {
  const { category, sub, brand, q } = filters;
  const page = Math.max(1, Math.floor(filters.page || 1) || 1);
  const where: Prisma.ProductWhereInput = { active: true };

  const activeSlug = sub || category;
  if (activeSlug) {
    const ids = await getCategoryIds(activeSlug);
    if (!ids.length) where.id = { in: [] };
    else where.categoryId = { in: ids };
  }
  if (brand) where.brand = { slug: brand };

  const nq = normalizeFa(q || "");
  let rows: Row[] = [];
  let total = 0;

  if (nq) {
    const candidates = await getSearchCandidates(where);
    const ranked = rankProducts(nq, candidates);
    total = ranked.length;
    rows = ranked
      .slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE)
      .map((r) => r.product);
  } else {
    const [found, count] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
        skip: (page - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
      }),
      prisma.product.count({ where }),
    ]);
    rows = found;
    total = count;
  }

  const [categoryRows, brandRows, names] = await Promise.all([
    prisma.category.findMany({
      where: { active: true, parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          where: { active: true },
          select: { id: true, name: true, slug: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    }),
    activeSlug
      ? prisma.brand.findMany({
          where: { products: { some: { categoryId: { in: await getCategoryIds(activeSlug) } } } },
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { products: true } },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    getFilterNames({ category, sub, brand }),
  ]);

  return {
    products: rows.map(toListItem),
    total,
    pages: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
    page,
    categories: categoryRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      children: c.children,
    })),
    brands: brandRows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      count: b._count.products,
    })),
    names,
  };
}
