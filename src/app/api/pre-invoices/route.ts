import { NextRequest, NextResponse } from "next/server";
import { onPreInvoiceStatusChanged } from "@/lib/accounting-new";
import prisma from "@/lib/prisma";
import type { PreInvoice } from "@prisma/client";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { normalizePhone, isValidIranPhone } from "@/lib/phone";
import { authOptions } from "@/lib/auth";
import { sendPreInvoiceEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any)?.id;
  const isAdmin = (session.user as any)?.role === "ADMIN";
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (!isAdmin) where.userId = userId;
  if (status) where.status = status;

  // پنل کاربر فقط «۵ خرید آخر» را می‌خواهد؛ پنل مدیریت این پارامتر را
  // نمی‌فرستد و همهٔ فاکتورها را می‌بیند.
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 100 ? limitRaw : null;

  const orderBy = { createdAt: "desc" } as const;
  const include = { user: { select: { name: true, phone: true } } };

  if (!limit || isAdmin) {
    const all = await prisma.preInvoice.findMany({ where, orderBy, include });
    return NextResponse.json(all);
  }

  const recent = await prisma.preInvoice.findMany({
    where,
    orderBy,
    include,
    take: limit,
  });

  // اگر فاکتوری قدیمی‌تر از این ۵ تا توسط بخش فروش اصلاح شده باشد، باید باز هم
  // دیده شود — وگرنه نشانِ هدر عددی نشان می‌داد ولی بنرِ پروفایل چیزی
  // برای نمایش نداشت.
  const unseenEdits = await prisma.preInvoice.findMany({
    where: { ...where, adminEditedAt: { not: null }, adminEditSeenAt: null },
    orderBy,
    include,
  });

  const recentIds = new Set(recent.map((i) => i.id));
  const extra = unseenEdits.filter((i) => !recentIds.has(i.id));
  const merged = [...recent, ...extra].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return NextResponse.json(merged);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, customerPhone, items, totalPrice, notes, address, password } = body;

  if (!customerName || !customerPhone) {
    return NextResponse.json({ error: "نام و شماره تلفن الزامی است" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "سبد خرید خالی است" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  let sessionUserId: string | null = (session?.user as any)?.id || null;
  // ذخیره همیشه با ارقام انگلیسی استاندارد
  const phone = normalizePhone(customerPhone);
  if (!isValidIranPhone(phone)) {
    return NextResponse.json(
      { error: "شماره تلفن معتبر نیست. نمونهٔ درست: 09123456789" },
      { status: 400 }
    );
  }

  // کاربر مهمان: باید برایش حساب ساخته شود (رمز بدون آدرس)
  let accountCreated = false;
  if (!session) {
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "برای ساخت حساب کاربری، رمز عبور (حداقل ۶ کاراکتر) الزامی است" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: "این شماره تلفن قبلاً ثبت شده است؛ لطفاً وارد حساب خود شوید" },
        { status: 400 }
      );
    }

    try {
      const created = await prisma.user.create({
        data: {
          name: String(customerName).trim(),
          phone,
          password: await bcrypt.hash(password, 12),
        },
        select: { id: true },
      });
      sessionUserId = created.id;
      accountCreated = true;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "این شماره تلفن قبلاً ثبت شده است؛ لطفاً وارد حساب خود شوید" },
          { status: 400 }
        );
      }
      throw e;
    }
  }

  // آدرس: مقدار ارسالی، وگرنه آدرس ذخیره‌شدهٔ حساب
  let finalAddress = typeof address === "string" ? address.trim() : "";
  if (!finalAddress && sessionUserId) {
    const owner = await prisma.user
      .findUnique({ where: { id: sessionUserId }, select: { address: true } })
      .catch(() => null);
    finalAddress = owner?.address?.trim() || "";
  }

  let preInvoice: PreInvoice | null = null;
  for (let attempt = 0; attempt < 10 && !preInvoice; attempt++) {
    const invoiceNumber = 1000000 + Math.floor(Math.random() * 9000000);
    try {
      preInvoice = await prisma.preInvoice.create({
        data: {
          userId: sessionUserId,
          customerName,
          customerPhone: phone,
          address: finalAddress || null,
          items,
          totalPrice: totalPrice || 0,
          invoiceNumber,
          notes: notes || null,
          source: "WEBSITE",
        },
      });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "P2002") throw e;
    }
  }
  if (!preInvoice) {
    return NextResponse.json({ error: "خطا در ایجاد شماره فاکتور؛ دوباره تلاش کنید" }, { status: 500 });
  }

  const setting = await prisma.settings
    .findUnique({ where: { key: "site_email" } })
    .catch(() => null);
  const toEmail = setting?.value || process.env.SITE_EMAIL || "info@shik.app";

  void sendPreInvoiceEmail(
    {
      id: preInvoice.id,
      customerName,
      customerPhone,
      items,
      totalPrice: totalPrice || 0,
      createdAt: preInvoice.createdAt,
    },
    toEmail
  ).catch(() => {});

  return NextResponse.json({ success: true, id: preInvoice.id, accountCreated });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const preInvoice = await prisma.preInvoice.update({
    where: { id },
    data: { status },
  });

  // حسابداری جدید: با رفتن به «ارسال شده»، فوراً تخصیص بهای تمام‌شده + سند دفتر ثبت می‌شود
  let cogsAllocation = null;
  try {
    cogsAllocation = await onPreInvoiceStatusChanged(
      preInvoice.id,
      status,
      (session.user as any)?.id
    );
  } catch {
    cogsAllocation = null;
  }

  return NextResponse.json({ ...preInvoice, cogsAllocation });
}
