import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * کاربر اعلان را دیده است → adminEditSeenAt را می‌زنیم تا badge پاک شود.
 * اگر body خالی باشد، همهٔ اعلان‌های دیده‌نشدهٔ کاربر تأیید می‌شوند
 * (همان چیزی که دکمهٔ «متوجه شدم» در پروفایل می‌فرستد).
 *
 * فقط فاکتورهای خودِ کاربر به‌روزرسانی می‌شوند — کاربر نمی‌تواند
 * اعلان کس دیگری را تأیید کند چون where به userId خودش محدود است.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let invoiceIds: string[] | null = null;
  try {
    const body = await req.json();
    if (Array.isArray(body?.invoiceIds)) {
      invoiceIds = body.invoiceIds.filter((v: unknown): v is string => typeof v === "string");
    }
  } catch {
    // بدنه خالی یا نامعتبر = تأیید همه
  }

  const where: any = {
    userId,
    adminEditedAt: { not: null },
    adminEditSeenAt: null,
  };
  if (invoiceIds) where.id = { in: invoiceIds };

  const result = await prisma.preInvoice.updateMany({
    where,
    data: { adminEditSeenAt: new Date() },
  });

  return NextResponse.json({ acknowledged: result.count });
}