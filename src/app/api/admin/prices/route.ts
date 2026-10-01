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

export const maxDuration = 60;

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

  const factor = mode === "increase" ? 1 + percent / 100 : 1 - percent / 100;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, discountPrice: true },
  });
  const skipped = products.filter((p) => p.price <= 0).length;

  const openRows = await prisma.productPriceHistory.findMany({
    where: { productId: { in: products.map((p) => p.id) }, validUntil: null },
    select: { id: true, productId: true, price: true, discountPrice: true },
  });
  const openById = new Map(openRows.map((r) => [r.productId, r]));

  const now = new Date();
  const changes: { id: string; newPrice: number; newDisc: number; applyDisc: boolean }[] = [];
  const closeIds: string[] = [];
  const newRows: {
    productId: string;
    price: number;
    discountPrice: number | null;
    validFrom: Date;
    createdAt: Date;
  }[] = [];

  for (const p of products) {
    if (p.price <= 0) continue;
    const newPrice = Math.max(0, Math.round(p.price * factor));
    const currentDisc = p.discountPrice ?? 0;
    const applyDisc = p.discountPrice != null && p.discountPrice > 0;
    const newDisc = applyDisc ? Math.max(0, Math.round(currentDisc * factor)) : currentDisc;
    changes.push({ id: p.id, newPrice, newDisc, applyDisc });

    const open = openById.get(p.id);
    const differs = !open || open.price !== newPrice || (open.discountPrice ?? null) !== (applyDisc ? newDisc : null);
    if (differs) {
      if (open) closeIds.push(open.id);
      newRows.push({
        productId: p.id,
        price: newPrice,
        discountPrice: applyDisc ? newDisc : null,
        validFrom: now,
        createdAt: now,
      });
    }
  }

  if (changes.length > 0) {
    await prisma.$transaction(
      async (tx) => {
        if (closeIds.length > 0) {
          await tx.productPriceHistory.updateMany({
            where: { id: { in: closeIds } },
            data: { validUntil: now },
          });
        }
        if (newRows.length > 0) {
          await tx.productPriceHistory.createMany({ data: newRows });
        }
        await tx.$executeRaw`
          UPDATE products p
          SET price = v.new_price,
              "discountPrice" = CASE WHEN v.apply_disc THEN v.new_disc ELSE p."discountPrice" END,
              "updatedAt" = now()
          FROM unnest(
            ${changes.map((c) => c.id)}::text[],
            ${changes.map((c) => c.newPrice)}::double precision[],
            ${changes.map((c) => c.newDisc)}::double precision[],
            ${changes.map((c) => c.applyDisc)}::boolean[]
          ) AS v(id, new_price, new_disc, apply_disc)
          WHERE p.id = v.id
        `;
      },
      { timeout: 50000, maxWait: 15000 }
    );
  }

  return NextResponse.json({ updated: changes.length, skipped });
}
