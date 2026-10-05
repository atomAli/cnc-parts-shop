import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { createReceipt, parseRange } from "@/lib/accounting-new";

// GET — لیست دریافت‌های مشتری‌ها
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const r = parseRange(req.nextUrl.searchParams);
  const rows = await prisma.customerReceipt.findMany({
    where: {
      AND: [
        r.from ? { date: { gte: r.from } } : {},
        r.to ? { date: { lte: r.to } } : {},
      ],
    },
    include: { party: true, preInvoice: true, ledgerEntry: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json({ rows });
}

// POST — ثبت دریافت (چندمرحله‌ای)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const adminId = (admin.user as { id?: string }).id;
  if (!adminId) return unauthorized();

  const b = await req.json().catch(() => ({}));
  const partyId = typeof b?.partyId === "string" ? b.partyId : "";
  const amount = Number(b?.amount);
  const date = typeof b?.date === "string" ? b.date.trim() : "";
  const method = typeof b?.method === "string" ? b.method : "CASH";

  if (!partyId) return NextResponse.json({ error: "طرف حساب انتخاب نشده" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "مبلغ باید بزرگ‌تر از صفر باشد" }, { status: 400 });
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date))
    return NextResponse.json({ error: "تاریخ شمسی (۱۴۰۵/۰۷/۱۴) وارد کنید" }, { status: 400 });

  try {
    const out = await createReceipt({
      partyId,
      preInvoiceId:
        typeof b?.preInvoiceId === "string" && b.preInvoiceId ? b.preInvoiceId : null,
      amount,
      date,
      method,
      note: typeof b?.note === "string" ? b.note : null,
      userId: adminId,
    });
    return NextResponse.json({ ok: true, receipt: out });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ثبت ناموفق" },
      { status: 400 }
    );
  }
}
