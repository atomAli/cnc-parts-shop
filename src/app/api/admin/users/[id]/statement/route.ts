import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { getPartyStatement, type PartyStatement } from "@/lib/accounting-new";

// GET — صورت حساب چاپی یک کاربر.
// منبع: دفتر کل (ledger_entries) همان طرف‌حساب — دقیقاً همان چیزی که
// تب «حساب افراد» در حسابداری جدید نشان می‌دهد، تا دو بخش با هم سینک باشند.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

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
    return NextResponse.json(
      { error: "تاریخ شروع باید قبل از تاریخ پایان باشد" },
      { status: 400 }
    );

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, party: { select: { id: true, name: true } } },
  });
  if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });

  const empty: PartyStatement = {
    rows: [],
    totals: { count: 0, debit: 0, credit: 0, balance: 0 },
  };

  if (!user.party) {
    // کاربر بدون طرف‌حساب — سندی در دفتر کل ندارد
    return NextResponse.json({ party: null, noParty: true, ...empty });
  }

  const statement = await getPartyStatement(user.party.id, { from, to });
  return NextResponse.json({
    party: { id: user.party.id, name: user.party.name },
    noParty: false,
    from,
    to,
    ...statement,
  });
}
