import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const [totalProducts, totalUsers] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
  ]);

  return NextResponse.json({
    stats: { totalProducts, totalUsers },
  });
}
