import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true, children: true } },
      children: true,
    },
    where: { parentId: null },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const slug = body.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

  const category = await prisma.category.create({
    data: {
      name: body.name,
      slug,
      description: body.description || "",
      parentId: body.parentId || null,
      order: body.order || 0,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
