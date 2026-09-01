import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const sub = searchParams.get("sub") || "";

  let categoryId: string | undefined;

  if (sub) {
    const subCat = await prisma.category.findUnique({ where: { slug: sub } });
    categoryId = subCat?.id;
  } else if (category) {
    const parentCat = await prisma.category.findUnique({ where: { slug: category } });
    if (parentCat) {
      const childIds = (await prisma.category.findMany({
        where: { parentId: parentCat.id },
        select: { id: true },
      })).map((c) => c.id);
      categoryId = parentCat.id;
      // For parent category, we need brands from all children
      const brands = await prisma.brand.findMany({
        where: {
          products: {
            some: {
              categoryId: { in: [parentCat.id, ...childIds] },
            },
          },
        },
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(brands);
    }
  }

  if (!categoryId) {
    return NextResponse.json([]);
  }

  const brands = await prisma.brand.findMany({
    where: {
      products: {
        some: { categoryId },
      },
    },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(brands);
}
