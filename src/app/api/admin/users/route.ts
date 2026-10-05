import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { searchVariants } from "@/lib/search-variants";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const parsedPage = parseInt(searchParams.get("page") || "1");
  const parsedLimit = parseInt(searchParams.get("limit") || "20");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const SEARCHABLE = ["name", "phone", "email", "nationalCode", "companyName", "city"];

  const where: any = {};
  if (search) {
    const v = searchVariants(search);
    where.OR = [v.q, v.ascii, v.fa].flatMap((q) =>
      SEARCHABLE.map((field) => ({ [field]: { contains: q, mode: "insensitive" } }))
    );
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        city: true,
        createdAt: true,
        _count: { select: { preInvoices: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  const users = rows.map(({ _count, ...user }) => ({
    ...user,
    invoiceCount: _count.preInvoices,
  }));

  return NextResponse.json({
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
