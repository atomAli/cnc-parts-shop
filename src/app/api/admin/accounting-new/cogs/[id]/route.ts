import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { approveAllocation, rejectAllocation } from "@/lib/accounting-new";

// POST — تأیید یا رد پیش‌نویس تخصیص COGS
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const adminId = (admin.user as { id?: string }).id;
  if (!adminId) return unauthorized();

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const action = String(body?.action ?? "");

  if (action === "approve") {
    const res = await approveAllocation(id, adminId);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res);
  }

  if (action === "reject") {
    const note = typeof body?.reason === "string" ? body.reason : "";
    const out = await rejectAllocation(id, adminId, note);
    return NextResponse.json({ ok: true, allocation: out });
  }

  return NextResponse.json({ error: "action نامعتبر است" }, { status: 400 });
}
