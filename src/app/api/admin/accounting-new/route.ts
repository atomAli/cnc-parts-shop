import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { backfillAutoApprove, computeKpis, parseRange } from "@/lib/accounting-new";

// GET — داشبورد حسابداری جدید: KPI + پیش‌نویس‌های در انتظار تأیید
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  // فرآیند تأیید دستی حذف شده — هر رکورد جامانده همین‌جا خودکار تأیید می‌شود
  try {
    await backfillAutoApprove();
  } catch {
    /* در صورت خطا، خروجی فعلی همچنان برمی‌گردد */
  }

  const range = parseRange(req.nextUrl.searchParams);
  const kpis = await computeKpis(range);

  const pending = await prisma.cogsAllocation.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      preInvoice: true,
      lines: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const approved = await prisma.cogsAllocation.findMany({
    where: { status: "APPROVED" },
    include: {
      preInvoice: {
        select: {
          invoiceNumber: true,
          customerName: true,
          totalPrice: true,
          createdAt: true,
        },
      },
      lines: true,
    },
    orderBy: { approvedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ kpis, pending, approved });
}
