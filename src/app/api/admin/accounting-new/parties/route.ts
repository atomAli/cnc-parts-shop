import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// GET — طرف‌حساب‌ها + ماندهٔ دفتر (هم قدیم هم جدید) — برای فرم دریافت و تب «حساب افراد»
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const [rows, balances] = await Promise.all([
    prisma.party.findMany({
      select: { id: true, name: true, kind: true, phone: true },
      orderBy: { name: "asc" },
      take: 1000,
    }),
    prisma.$queryRaw<{ partyId: string; balance: number; entries: number; newEntries: number }[]>`
      SELECT
        "partyId",
        SUM(amount)::float AS balance,
        COUNT(*)::int      AS entries,
        COUNT(*) FILTER (WHERE source = 'NEW')::int AS "newEntries"
      FROM ledger_entries
      GROUP BY "partyId"
    `,
  ]);

  const map = new Map(balances.map((b) => [b.partyId, b]));
  return NextResponse.json({
    rows: rows.map((r) => {
      const b = map.get(r.id);
      return {
        ...r,
        balance: Number(b?.balance ?? 0),
        entries: Number(b?.entries ?? 0),
        newEntries: Number(b?.newEntries ?? 0),
      };
    }),
  });
}
