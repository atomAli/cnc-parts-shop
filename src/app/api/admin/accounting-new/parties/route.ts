import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// GET — لیست طرف‌حساب‌ها برای فرم دریافت
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const rows = await prisma.party.findMany({
    select: { id: true, name: true, kind: true, phone: true },
    orderBy: { name: "asc" },
    take: 1000,
  });
  return NextResponse.json({ rows });
}
