import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { normalizeFa } from "@/lib/search";
import { normalizePhone, isValidIranPhone } from "@/lib/phone";

// فیلدهای متنی که مدیر می‌تواند ویرایش کند
const TEXT_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "nationalCode",
  "companyName",
  "province",
  "city",
  "postalCode",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value: unknown): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// GET — پروفایل کامل کاربر + آمار + تاریخچه فاکتورها
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      preInvoices: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          customerPhone: true,
          totalPrice: true,
          status: true,
          source: true,
          createdAt: true,
        },
      },
      _count: { select: { cartItems: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  const invoices = user.preInvoices;
  const byStatus = invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  const { preInvoices, _count, ...profile } = user;

  return NextResponse.json({
    user: {
      ...profile,
      invoiceCount: invoices.length,
      cartCount: _count.cartItems,
      totalSpent: invoices.reduce((sum, inv) => sum + (inv.totalPrice || 0), 0),
      byStatus,
    },
    invoices,
  });
}

// PATCH — ویرایش کامل کاربر
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const sessionUserId = (session.user as any).id as string | undefined;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنهٔ درخواست نامعتبر است" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const value = normalizeText(body[field]);
    if (value !== undefined) data[field] = value;
  }

  // شماره تلفن: ارقام فارسی/عربی → انگلیسی، حذف فاصله و خط تیره
  if (data.phone !== undefined && data.phone !== null) {
    const phone = normalizePhone(String(data.phone));
    if (!isValidIranPhone(phone)) {
      return NextResponse.json(
        { error: "شماره تلفن معتبر نیست. نمونهٔ درست: 09123456789" },
        { status: 400 }
      );
    }
    data.phone = phone;
  }

  // ایمیل همیشه lowercase ذخیره می‌شود تا A@x.com و a@x.com یک حساب باشند
  if (data.email !== undefined && data.email !== null) {
    const email = String(data.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "ایمیل معتبر نیست" }, { status: 400 });
    }
    data.email = email;
  }

  if (data.nationalCode !== undefined && data.nationalCode !== null) {
    const nc = normalizeFa(String(data.nationalCode)).replace(/\D/g, "");
    if (nc.length !== 10) {
      return NextResponse.json(
        { error: "کد ملی باید ۱۰ رقم باشد" },
        { status: 400 }
      );
    }
    data.nationalCode = nc;
  }

  // بررسی تکراری بودن تلفن و ایمیل (قبل از UPDATE برای پیام دقیق‌تر)
  if (typeof data.phone === "string") {
    const dupPhone = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id } },
      select: { id: true },
    });
    if (dupPhone) {
      return NextResponse.json(
        { error: "این شماره تلفن قبلاً برای کاربر دیگری ثبت شده است" },
        { status: 400 }
      );
    }
  }
  if (typeof data.email === "string") {
    const dupEmail = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
      select: { id: true },
    });
    if (dupEmail) {
      return NextResponse.json(
        { error: "این ایمیل قبلاً برای کاربر دیگری ثبت شده است" },
        { status: 400 }
      );
    }
  }

  // وضعیت فعال/مسدود
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  // تغییر نقش — با محافظت
  if (typeof body.role === "string" && body.role !== existing.role) {
    if (body.role !== "ADMIN" && body.role !== "USER") {
      return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
    }
    if (id === sessionUserId) {
      return NextResponse.json(
        { error: "نمی‌توانید نقش حساب خودتان را تغییر دهید" },
        { status: 400 }
      );
    }
    if (existing.role === "ADMIN" && body.role === "USER") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "حداقل یک مدیر فعال باید باقی بماند" },
          { status: 400 }
        );
      }
    }
    data.role = body.role;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "داده‌ای برای ویرایش ارسال نشده است" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: data as any,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        nationalCode: true,
        companyName: true,
        province: true,
        city: true,
        postalCode: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ user });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      // مسیر اصلی: پیام فارسی دقیق
      const raw = (e as { meta?: { target?: unknown } })?.meta?.target;
      const target = Array.isArray(raw) ? raw.join(",") : String(raw || "");
      const hint = target + " " + ((e as Error)?.message || "");
      let text = "این مقدار تکراری است";
      if (/phone/i.test(hint)) text = "این شماره تلفن قبلاً برای کاربر دیگری ثبت شده است";
      else if (/email/i.test(hint)) text = "این ایمیل قبلاً برای کاربر دیگری ثبت شده است";
      return NextResponse.json({ error: text }, { status: 400 });
    }
    throw e;
  }
}