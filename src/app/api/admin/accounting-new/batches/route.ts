import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// GET — لیست خرید کالاها (بچ‌های خرید ساخته‌شده از فاکتورهای خرید)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rows = await prisma.productPurchaseBatch.findMany({
    where: q
      ? {
          OR: [
            { product: { name: { contains: q, mode: "insensitive" } } },
            { supplier: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: {
      product: true,
      supplier: true,
      purchaseInvoice: { select: { number: true, date: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ rows });
}
