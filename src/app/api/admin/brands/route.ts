import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const category = (req.nextUrl.searchParams.get("category") || "").trim();

  if (!category) {
    const allBrands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(allBrands);
  }

  const allCats = await prisma.category.findMany({
    select: { id: true, parentId: true, slug: true },
  });
  const cat = allCats.find((c) => c.slug === category);
  if (!cat) return NextResponse.json([]);

  const ids: string[] = [];
  const walk = (id: string) => {
    ids.push(id);
    for (const c of allCats) {
      if (c.parentId === id) walk(c.id);
    }
  };
  walk(cat.id);

  const brands = await prisma.brand.findMany({
    where: { products: { some: { categoryId: { in: ids } } } },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(brands);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const slug = body.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");

  const brand = await prisma.brand.create({
    data: {
      name: body.name,
      slug,
      website: body.website || null,
    },
  });

  return NextResponse.json(brand, { status: 201 });
}
