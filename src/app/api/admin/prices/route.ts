import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

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
  const categoryId = searchParams.get("categoryId") || "";
  const search = searchParams.get("search") || "";

  const where: any = {};
  if (categoryId) {
    const cats = await prisma.category.findMany();
    where.categoryId = { in: collectCategoryIds(cats, categoryId) };
  }
  if (search) {
    where.OR = [{ name: { contains: search } }, { sku: { contains: search } }];
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      discountPrice: true,
      brandId: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products, total: products.length });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const productIds = Array.isArray(body.productIds) ? (body.productIds as string[]).filter(Boolean) : [];
  const percent = Number(body.percent);
  const mode = body.mode;

  if (!productIds.length) {
    return NextResponse.json({ error: "هیچ محصولی انتخاب نشده است" }, { status: 400 });
  }
  if (!Number.isFinite(percent) || percent === 0) {
    return NextResponse.json({ error: "درصد تغییر نامعتبر است" }, { status: 400 });
  }
  if (mode !== "increase" && mode !== "decrease") {
    return NextResponse.json({ error: "نوع تغییر نامعتبر است" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, discountPrice: true },
  });

  const factor = mode === "increase" ? 1 + percent / 100 : 1 - percent / 100;
  let skipped = 0;

  const updates = products.flatMap((p) => {
    if (p.price <= 0) {
      skipped++;
      return [];
    }
    const newPrice = Math.max(0, Math.round(p.price * factor));
    const newDiscount =
      p.discountPrice != null && p.discountPrice > 0
        ? Math.max(0, Math.round(p.discountPrice * factor))
        : p.discountPrice;
    return prisma.product.update({
      where: { id: p.id },
      data: { price: newPrice, discountPrice: newDiscount },
    });
  });

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return NextResponse.json({ updated: updates.length, skipped });
}