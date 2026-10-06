import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { getPurchaseInvoiceBoard, createDailyPurchaseInvoice } from "@/lib/accounting-new";

// GET — تب «فاکتور فروش»: خریدهای بدون فاکتور (هر روز + هر تأمین‌کننده)
//       + فهرست فاکتورهای خرید ثبت‌شده
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const board = await getPurchaseInvoiceBoard();
  return NextResponse.json(board);
}

// POST — ساخت فاکتور خرید برای یک روزِ یک تأمین‌کننده
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  try {
    const inv = await createDailyPurchaseInvoice({
      date: String(body?.date ?? ""),
      supplierId: String(body?.supplierId ?? ""),
    });
    return NextResponse.json({ ok: true, invoice: inv });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ساخت فاکتور ناموفق بود" },
      { status: 400 }
    );
  }
}
