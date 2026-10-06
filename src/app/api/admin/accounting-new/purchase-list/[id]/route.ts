import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { deleteManualPurchase } from "@/lib/accounting-new";

// DELETE — حذف خرید دستی (فقط رکوردهای بدون فاکتور خرید)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { id } = await context.params;
  try {
    const out = await deleteManualPurchase(id);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "حذف ناموفق" },
      { status: 400 }
    );
  }
}
