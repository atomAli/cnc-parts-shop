import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const [totalProducts, totalCategories, totalBrands, totalOrders, totalUsers, totalRevenue, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.aggregate({ _sum: { totalPrice: true }, where: { status: { not: "CANCELLED" } } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      }),
    ]);

  return NextResponse.json({
    stats: {
      totalProducts,
      totalCategories,
      totalBrands,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue._sum?.totalPrice || 0,
    },
    recentOrders,
  });
}
