import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * تعداد فاکتورهایی که مدیر دستی ویرایش کرده و کاربر هنوز اعلانش را ندیده.
 * برای نشان (badge) کنار دکمهٔ «پروفایل» در هدر استفاده می‌شود.
 *
 * عمداً یک count ساده است تا در هر صفحه و هر ۶۰ ثانیه ارزان بماند.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any)?.id;
  if (!userId) return NextResponse.json({ count: 0 });

  const count = await prisma.preInvoice.count({
    where: {
      userId,
      adminEditedAt: { not: null },
      adminEditSeenAt: null,
    },
  });

  return NextResponse.json({ count });
}