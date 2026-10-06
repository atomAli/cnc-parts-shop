import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// GET — سوابق کاربر از دیتابیس قدیم (Access):
//        فاکتورهای فروش + واریزی/دریافتی‌ها، از روی طرف‌حساب متصل به کاربر
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, party: { select: { id: true, name: true } } },
  });
  if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });

  const partyId = user.party?.id ?? null;

  const [invoices, movements] = await Promise.all([
    partyId
      ? prisma.salesInvoice.findMany({
          where: { partyId },
          orderBy: [{ date: "desc" }, { number: "desc" }],
        })
      : Promise.resolve([]),
    partyId
      ? prisma.cashMovement.findMany({
          where: { partyId },
          orderBy: [{ date: "desc" }, { id: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ party: user.party, invoices, movements });
}

// DELETE — حذف یک رکورد قدیمی (فقط اگر متعلق به طرف‌حساب همین کاربر باشد)
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
  const partyId = user?.party?.id;
  if (!partyId)
    return NextResponse.json({ error: "این کاربر طرف‌حساب ندارد" }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const type = typeof b?.type === "string" ? b.type : "";
  const recId = typeof b?.id === "string" ? b.id : "";
  if (!recId)
    return NextResponse.json({ error: "رکورد انتخاب نشده" }, { status: 400 });

  try {
    if (type === "invoice") {
      const found = await prisma.salesInvoice.findUnique({
        where: { id: recId },
        select: { id: true, partyId: true },
      });
      if (!found || found.partyId !== partyId)
        return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
      await prisma.salesInvoice.delete({ where: { id: recId } });
    } else if (type === "movement") {
      const found = await prisma.cashMovement.findUnique({
        where: { id: recId },
        select: { id: true, partyId: true },
      });
      if (!found || found.partyId !== partyId)
        return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
      await prisma.cashMovement.delete({ where: { id: recId } });
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
