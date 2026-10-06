import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import {
  getPurchaseList,
  getPurchaseListInvoices,
  recordPurchase,
  type PurchaseListScope,
} from "@/lib/accounting-new";

// GET — لیست خرید
//   بدون پارامتر      → جمع همهٔ فاکتورهای تکمیل‌شده
//   ?invoice=<id>     → فقط کالاهای آن فاکتور فروش
//   ?purchaseInvoice=<id> → فقط ردیف‌های آن فاکتور خرید
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const invoice = sp.get("invoice")?.trim() || "";
  const purchaseInvoice = sp.get("purchaseInvoice")?.trim() || "";

  let scope: PurchaseListScope = { kind: "ALL" };
  if (invoice) scope = { kind: "SALES", invoiceId: invoice };
  else if (purchaseInvoice) scope = { kind: "PURCHASE", purchaseInvoiceId: purchaseInvoice };

  const [rows, meta] = await Promise.all([getPurchaseList(scope), getPurchaseListInvoices()]);
  return NextResponse.json({
    rows,
    salesInvoices: meta.sales,
    purchaseInvoices: meta.purchases,
  });
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
