import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAllCategoriesIndex, collectDescendantIds } from "@/lib/category-tree";

export async function GET() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { order: "asc" },
    }),
    prisma.product.groupBy({ by: ["categoryId"], where: { active: true }, _count: { _all: true } }),
  ]);

  const countMap: Record<string, number> = {};
  for (const g of counts) countMap[g.categoryId] = g._count._all;

  const index = await getAllCategoriesIndex();
  const deepCount = (id: string) => {
    let total = countMap[id] ?? 0;
    for (const d of collectDescendantIds(index, id)) total += countMap[d] ?? 0;
    return total;
  };

  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: cat.image || "📁",
    children: cat.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      icon: child.image || "📁",
      parentId: cat.id,
      _count: { products: deepCount(child.id) },
    })),
    _count: { products: deepCount(cat.id) },
  }));

  return NextResponse.json(result);
}