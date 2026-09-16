import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { recordPriceChange } from "@/lib/price-history";
import { searchVariants } from "@/lib/search-variants";

function parseIsMeter(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  return value === true || value === "true";
}

function collectCategoryIds(categories: { id: string; parentId: string | null }[], categoryId: string): string[] {
  const ids: string[] = [];
  const walk = (id: string) => {
    ids.push(id);
    for (const c of categories) {
      if (c.parentId === id) walk(c.id);
    }
  };
  walk(categoryId);
  return ids;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const brandId = searchParams.get("brandId") || "";
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    const v = searchVariants(search);
    where.OR = [
      { name: { contains: v.q, mode: "insensitive" } },
      { sku: { contains: v.q, mode: "insensitive" } },
      { name: { contains: v.ascii, mode: "insensitive" } },
      { sku: { contains: v.ascii, mode: "insensitive" } },
      { name: { contains: v.fa, mode: "insensitive" } },
      { sku: { contains: v.fa, mode: "insensitive" } },
    ];
  }
  if (category) {
    const all = await prisma.category.findMany({
      select: { id: true, parentId: true, slug: true },
    });
    const cat = all.find((c) => c.slug === category);
    if (cat) {
      where.categoryId = { in: collectCategoryIds(all, cat.id) };
    }
  }
  if (brandId) {
    where.brandId = brandId;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
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
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const slug = body.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  const product = await prisma.product.create({
    data: {
      name: body.name,
      slug,
      description: body.description || "",
      price: body.price || 0,
      discountPrice: body.discountPrice || null,
      stock: body.stock || 0,
      sku: body.sku || "",
      isMeter: parseIsMeter(body.isMeter),
      categoryId: body.categoryId,
      brandId: body.brandId || null,
      specifications: body.specifications ? JSON.stringify(body.specifications) : null,
      active: body.active ?? true,
      featured: body.featured ?? false,
      sourceUrl: body.sourceUrl || null,
    },
  });

  if (body.images && Array.isArray(body.images) && body.images.length > 0) {
    await prisma.productImage.createMany({
      data: body.images.map((img: any, index: number) => ({
        productId: product.id,
        url: img.url,
        alt: img.alt || "",
        isPrimary: img.isPrimary ?? index === 0,
        order: index,
      })),
    });
  }

  await recordPriceChange({
    productId: product.id,
    price: body.price || 0,
    discountPrice: body.discountPrice || null,
  });

  return NextResponse.json(product, { status: 201 });
}
