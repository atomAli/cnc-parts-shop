import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { products: true } },
    },
    orderBy: { order: "asc" },
  });

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
      _count: { products: child._count.products },
    })),
    _count: { products: cat._count.products },
  }));

  return NextResponse.json(result);
}
