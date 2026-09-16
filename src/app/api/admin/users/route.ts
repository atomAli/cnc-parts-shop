import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { searchVariants } from "@/lib/search-variants";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    const v = searchVariants(search);
    where.OR = [
      { name: { contains: v.q, mode: "insensitive" } },
      { phone: { contains: v.q, mode: "insensitive" } },
      { email: { contains: v.q, mode: "insensitive" } },
      { name: { contains: v.ascii, mode: "insensitive" } },
      { phone: { contains: v.ascii, mode: "insensitive" } },
      { email: { contains: v.ascii, mode: "insensitive" } },
      { name: { contains: v.fa, mode: "insensitive" } },
      { phone: { contains: v.fa, mode: "insensitive" } },
      { email: { contains: v.fa, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
