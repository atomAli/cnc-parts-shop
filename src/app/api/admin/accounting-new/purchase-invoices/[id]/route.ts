import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { deleteDailyPurchaseInvoice } from "@/lib/accounting-new";

// DELETE — حذف فاکتوری که در همین تب ساخته شده (بچ‌ها دوباره «بدون فاکتور» می‌شوند)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await context.params;
  try {
    const res = await deleteDailyPurchaseInvoice(id);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "حذف ناموفق بود" },
      { status: 400 }
    );
  }
}
