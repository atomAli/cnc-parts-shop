import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { createRecord, getPartyRecords, toJalali } from "@/lib/accounting-new";

// GET — اسناد یک طرف‌حساب (برای باز شدن ردیف در «حساب افراد»)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const partyId = req.nextUrl.searchParams.get("partyId")?.trim() || "";
  if (!partyId)
    return NextResponse.json({ error: "طرف حساب انتخاب نشده" }, { status: 400 });

  const rows = await getPartyRecords(partyId);
  const now = new Date();
  const iso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  return NextResponse.json({ rows, today: toJalali(iso) });
}

// POST — ثبت رکورد دستی روی طرف‌حساب: دریافت (مثبت) یا بدهی (منفی)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const adminId = (admin.user as { id?: string }).id;
  if (!adminId) return unauthorized();

  const b = await req.json().catch(() => ({}));
  const partyId = typeof b?.partyId === "string" ? b.partyId.trim() : "";
  const kind = b?.kind === "DEBT" ? "DEBT" : b?.kind === "RECEIPT" ? "RECEIPT" : null;
  const amount = Number(b?.amount);
  const date = typeof b?.date === "string" ? b.date.trim() : "";

  if (!partyId) return NextResponse.json({ error: "طرف حساب انتخاب نشده" }, { status: 400 });
  if (!kind) return NextResponse.json({ error: "نوع رکورد را انتخاب کنید" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "مبلغ باید بزرگ‌تر از صفر باشد" }, { status: 400 });

  try {
    const out = await createRecord({
      partyId,
      kind,
      amount,
      date,
      note: typeof b?.note === "string" ? b.note : null,
      userId: adminId,
    });
    return NextResponse.json({ ok: true, record: out });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ثبت ناموفق" },
      { status: 400 }
    );
  }
}
