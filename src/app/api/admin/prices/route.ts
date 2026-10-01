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

function chunkBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
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
  const skipped = products.filter((p) => p.price <= 0).length;

  const openRows = await prisma.productPriceHistory.findMany({
    where: { productId: { in: products.map((p) => p.id) }, validUntil: null },
    select: { id: true, productId: true, price: true, discountPrice: true },
  });
  const openById = new Map(openRows.map((r) => [r.productId, r]));

  const now = new Date();
  const changes: {
    id: string;
    price: number;
    discountPrice: number | null;
    differs: boolean;
    openRowId: string | null;
  }[] = [];
  for (const p of products) {
    if (p.price <= 0) continue;
    const newPrice = Math.max(0, Math.round(p.price * factor));
    const newDiscount =
      p.discountPrice != null && p.discountPrice > 0
        ? Math.max(0, Math.round(p.discountPrice * factor))
        : p.discountPrice;
    const open = openById.get(p.id);
    const differs = !open || open.price !== newPrice || (open.discountPrice ?? null) !== (newDiscount ?? null);
    changes.push({ id: p.id, price: newPrice, discountPrice: newDiscount, differs, openRowId: open?.id ?? null });
  }

  const CHUNK = 40;
  const runParallel = <T>(items: T[], fn: (item: T) => Promise<unknown>) =>
    Promise.all(chunkBatches(items, CHUNK).map((batch) => Promise.all(batch.map(fn))));

  await prisma.$transaction(
    async (tx) => {
      await runParallel(changes, (c) =>
        tx.product.update({ where: { id: c.id }, data: { price: c.price, discountPrice: c.discountPrice } })
      );

      const historyChanges = changes.filter((c) => c.differs);
      await runParallel(historyChanges, (c) =>
        tx.productPriceHistory.create({
          data: { productId: c.id, price: c.price, discountPrice: c.discountPrice ?? null, validFrom: now },
        })
      );
      await runParallel(
        historyChanges.filter((c) => c.openRowId),
        (c) => tx.productPriceHistory.update({ where: { id: c.openRowId! }, data: { validUntil: now } })
      );
    },
    { timeout: 120000, maxWait: 20000 }
  );

  return NextResponse.json({ updated: changes.length, skipped });
}