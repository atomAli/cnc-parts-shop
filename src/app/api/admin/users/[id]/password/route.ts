import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

// PATCH — تعیین رمز عبور جدید توسط مدیر
// دلیل وجود: کاربر نه می‌تواند رمز عوض کند نه بازیابی دارد؛ این تنها راه بازکردن حساب است.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنهٔ درخواست نامعتبر است" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json({ error: "رمز عبور را وارد کنید" }, { status: 400 });
  }

  const password = body.password;
  if (password.length < 6) {
    return NextResponse.json(
      { error: "رمز عبور باید حداقل ۶ کاراکتر باشد" },
      { status: 400 }
    );
  }
  if (password.length > 72) {
    return NextResponse.json(
      { error: "رمز عبور نباید بیش از ۷۲ کاراکتر باشد" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}