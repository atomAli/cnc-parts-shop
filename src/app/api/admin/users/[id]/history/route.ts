import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { toJalali } from "@/lib/accounting-new";

// برچسب نوع سند در دفتر — همان کدهای فایل Access
const LEDGER_LABEL: Record<number, string> = {
  0: "مانده اول دوره",
  20: "دریافتی",
  25: "واریزی",
  30: "بدهی / فروش",
  31: "تخفیف فروش",
  40: "خرید",
  41: "تخفیف خرید",
};

function byDateDesc<T extends { date: string }>(a: T, b: T) {
  return (b.date || "").localeCompare(a.date || "");
}

// GET — سوابق کاربر:
//   فاکتورها   = فاکتورهای فروش قدیم (دیتابیس قدیم) + فاکتورهای ثبت‌شده روی سایت/پنل
//   واریزی/دریافتی = نقدینگی قدیم (دیتابیس قدیم) + اسناد دفترِ ثبت‌شده روی سایت
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  // بازهٔ تاریخ شمسی — خالی = بدون محدودیت
  const sp = req.nextUrl.searchParams;
  const from = (sp.get("from") || "").trim();
  const to = (sp.get("to") || "").trim();
  const DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;
  if (from && !DATE_RE.test(from))
    return NextResponse.json(
      { error: "تاریخ شروع نامعتبر است (مثال: ۱۴۰۴/۰۱/۰۱)" },
      { status: 400 }
    );
  if (to && !DATE_RE.test(to))
    return NextResponse.json(
      { error: "تاریخ پایان نامعتبر است (مثال: ۱۴۰۵/۱۲/۲۹)" },
      { status: 400 }
    );
  if (from && to && from > to)
    return NextResponse.json({ error: "تاریخ شروع باید قبل از تاریخ پایان باشد" }, { status: 400 });
  // رکورد بدون تاریخ همیشه نمایش داده می‌شود
  const inRange = (d: string) => !d || (d >= from && d <= to);

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, party: { select: { id: true, name: true } } },
  });
  if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });

  const partyId = user.party?.id ?? null;

  const [salesInvoices, siteInvoices, cashMovements, newEntries] = await Promise.all([
    partyId
      ? prisma.salesInvoice.findMany({ where: { partyId } })
      : Promise.resolve([]),
    prisma.preInvoice.findMany({
      where: { userId: id, source: { not: "ACCESS" } },
      select: {
        id: true,
        invoiceNumber: true,
        totalPrice: true,
        notes: true,
        status: true,
        source: true,
        createdAt: true,
      },
    }),
    partyId
      ? prisma.cashMovement.findMany({ where: { partyId } })
      : Promise.resolve([]),
    partyId
      ? prisma.ledgerEntry.findMany({ where: { partyId, source: "NEW" } })
      : Promise.resolve([]),
  ]);

  const invoices = [
    ...salesInvoices.map((s) => ({
      id: s.id,
      number: s.number,
      date: s.date || "",
      total: s.total,
      discount: s.discount || 0,
      note: s.note || "",
      status: s.status,
      source: "قدیم",
      kind: "salesInvoice",
    })),
    ...siteInvoices.map((i) => ({
      id: i.id,
      number: i.invoiceNumber,
      date: i.createdAt ? toJalali(i.createdAt.toISOString().slice(0, 10)) : "",
      total: i.totalPrice,
      discount: 0,
      note: i.notes || "",
      status: i.status,
      source: i.source === "ADMIN" ? "پنل" : "سایت",
      kind: "preInvoice",
    })),
  ].filter((x) => inRange(x.date)).sort((a, b) => byDateDesc(a, b) || b.number - a.number);

  const movements = [
    ...cashMovements.map((m) => ({
      id: m.id,
      date: m.date || "",
      amount: m.amount,
      label: m.kind === "PAYMENT" ? "واریزی" : "دریافتی",
      note: m.note || "",
      voucher: m.voucher,
      source: "قدیم",
      kind: "cashMovement",
    })),
    ...newEntries.map((e) => ({
      id: e.id,
      date: e.date || "",
      amount: e.amount,
      label: LEDGER_LABEL[e.voucherType] || String(e.voucherType),
      note: e.description || "",
      voucher: e.voucher,
      source: "سایت",
      kind: "ledgerEntry",
    })),
  ].sort((a, b) => byDateDesc(a, b));

  return NextResponse.json({ party: user.party, invoices, movements });
}

// DELETE — حذف یک رکورد (فقط اگر متعلق به همین کاربر باشد)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { party: { select: { id: true } } },
  });
  const partyId = user?.party?.id ?? null;

  const b = await req.json().catch(() => ({}));
  const type = typeof b?.type === "string" ? b.type : "";
  const recId = typeof b?.id === "string" ? b.id : "";
  if (!recId)
    return NextResponse.json({ error: "رکورد انتخاب نشده" }, { status: 400 });

  try {
    if (type === "salesInvoice" || type === "cashMovement") {
      if (!partyId)
        return NextResponse.json({ error: "این کاربر طرف‌حساب ندارد" }, { status: 400 });
      if (type === "salesInvoice") {
        const found = await prisma.salesInvoice.findUnique({
          where: { id: recId },
          select: { id: true, partyId: true },
        });
        if (!found || found.partyId !== partyId)
          return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
        await prisma.salesInvoice.delete({ where: { id: recId } });
      } else {
        const found = await prisma.cashMovement.findUnique({
          where: { id: recId },
          select: { id: true, partyId: true },
        });
        if (!found || found.partyId !== partyId)
          return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
        await prisma.cashMovement.delete({ where: { id: recId } });
      }
    } else if (type === "preInvoice") {
      const found = await prisma.preInvoice.findUnique({
        where: { id: recId },
        select: { id: true, userId: true, cogsAllocation: { select: { id: true } } },
      });
      if (!found || found.userId !== id)
        return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
      if (found.cogsAllocation)
        return NextResponse.json(
          {
            error:
              "این فاکتور محاسبهٔ سود/بهای تمام‌شده دارد؛ ابتدا آن را در «حسابداری جدید» حذف کنید.",
          },
          { status: 400 }
        );
      await prisma.preInvoice.delete({ where: { id: recId } });
    } else if (type === "ledgerEntry") {
      if (!partyId)
        return NextResponse.json({ error: "این کاربر طرف‌حساب ندارد" }, { status: 400 });
      const found = await prisma.ledgerEntry.findUnique({
        where: { id: recId },
        select: { id: true, partyId: true, source: true },
      });
      if (!found || found.partyId !== partyId)
        return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
      if (found.source !== "NEW")
        return NextResponse.json(
          { error: "اسناد دیتابیس قدیم از اینجا حذف نمی‌شوند" },
          { status: 400 }
        );
      await prisma.ledgerEntry.delete({ where: { id: recId } });
    } else {
      return NextResponse.json({ error: "نوع رکورد نامعتبر است" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "حذف ناموفق" },
      { status: 400 }
    );
  }
}
