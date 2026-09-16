import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone")?.trim();
  const userId = searchParams.get("userId");

  if (!userId && !phone) {
    return NextResponse.json({ error: "شماره تلفن یا کاربر الزامی است" }, { status: 400 });
  }

  const where = userId ? { userId } : { customerPhone: phone };

  const invoices = await prisma.preInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(invoices);
}