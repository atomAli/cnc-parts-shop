import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

/**
 * شمارش فاکتور‌های جدیدِ ثبت‌شده از سایت که هنوز بررسی نشده‌اند.
 * برای نشان دادن نشان (badge) کنار «پنل مدیریت» در هدر استفاده می‌شود.
 *
 * عمداً فقط یک count ساده انجام می‌دهد تا در هر صفحه و هر ۶۰ ثانیه
 * ارزان بماند (برخلاف /api/admin/invoices/stats که ۶ کوئری می‌زند).
 */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const count = await prisma.preInvoice.count({
    where: { status: "PENDING", source: "WEBSITE" },
  });

  return NextResponse.json({ count });
}