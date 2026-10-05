import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { syncPurchaseBatches } from "@/lib/accounting-new";

// POST — ساخت/به‌روزرسانی بچ‌های خرید از فاکتورهای خرید (idempotent)
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const res = await syncPurchaseBatches();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در همگام‌سازی" },
      { status: 500 }
    );
  }
}
