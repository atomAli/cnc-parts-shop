import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAllCategoriesIndex, collectDescendantIds } from "@/lib/category-tree";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const sub = searchParams.get("sub") || "";

  const slug = sub || category;
  if (!slug) return NextResponse.json([]);

  const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!cat) return NextResponse.json([]);

  const index = await getAllCategoriesIndex();
  const ids = [cat.id, ...collectDescendantIds(index, cat.id)];

  const brands = await prisma.brand.findMany({
    where: {
      products: {
        some: { categoryId: { in: ids } },
      },
    },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(brands);
}