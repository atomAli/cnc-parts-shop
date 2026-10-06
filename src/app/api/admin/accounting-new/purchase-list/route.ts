import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { getPurchaseList, recordPurchase } from "@/lib/accounting-new";

// GET — لیست خرید: کالاهای فاکتور فروش + کمبود + خریدهای ثبت‌شده
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const rows = await getPurchaseList();
  return NextResponse.json({ rows });
}

// POST — ثبت خرید دستی برای یک کالا (تعداد × قیمت × تأمین‌کننده)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  try {
    const row = await recordPurchase({
      productId: String(body?.productId ?? ""),
      supplierId: String(body?.supplierId ?? ""),
      quantity: Number(body?.quantity),
      unitCost: Number(body?.unitCost),
      note: typeof body?.note === "string" ? body.note : null,
      branchCount: body?.branchCount != null ? Number(body.branchCount) : undefined,
      branchLength: body?.branchLength != null ? Number(body.branchLength) : undefined,
    });
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ثبت ناموفق" },
      { status: 400 }
    );
  }
}
