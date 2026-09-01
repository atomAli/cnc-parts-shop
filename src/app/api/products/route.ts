import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeFa } from "@/lib/search";
import { getSearchCandidates, rankProducts } from "@/lib/search-catalog";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  discountPrice: number | null;
  stock: number;
  category?: {
    id: string;
    slug: string;
    name: string;
    parent?: { slug: string; name: string } | null;
  } | null;
  brand?: { id: string; slug: string; name: string } | null;
  images?: {
    id: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
    order?: number;
    productId?: string;
  }[];
}

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    discountPrice: p.discountPrice,
    subcategory: p.category?.slug || "",
    category: {
      id: p.category?.id || "",
      slug: p.category?.slug || "",
      name: p.category?.name || "",
      parentSlug: p.category?.parent?.slug || "",
      parentName: p.category?.parent?.name || "",
    },
    brand: p.brand
      ? { id: p.brand.id, slug: p.brand.slug, name: p.brand.name }
      : { id: "", slug: "", name: "" },
    images: (p.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
    })),
    stock: p.stock,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const sub = searchParams.get("sub");
  const search = searchParams.get("search");
  const brand = searchParams.get("brand");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");

  const subSlug = subcategory || sub;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = { active: true };

  if (subSlug) {
    const subCat = await prisma.category.findUnique({ where: { slug: subSlug } });
    if (subCat) {
      where.categoryId = subCat.id;
    }
  } else if (category) {
    const parentCat = await prisma.category.findUnique({ where: { slug: category } });
    if (parentCat) {
      const childIds = (await prisma.category.findMany({ where: { parentId: parentCat.id } })).map((c) => c.id);
      where.categoryId = { in: [parentCat.id, ...childIds] };
    }
  }

  if (brand) {
    where.brand = { slug: brand };
  }

  const nq = normalizeFa(search || "");

  if (nq) {
    const candidates = await getSearchCandidates(where);
    const ranked = rankProducts(nq, candidates);
    const total = ranked.length;
    const pageProducts = ranked.slice(skip, skip + limit).map((r) => r.product);

    return NextResponse.json({
      products: pageProducts.map(mapProduct),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { include: { parent: true } },
        brand: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map(mapProduct),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}