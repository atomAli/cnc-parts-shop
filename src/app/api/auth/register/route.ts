import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { normalizePhone, isValidIranPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone: rawPhone, password, address } = body;

    if (!rawPhone || !password) {
      return NextResponse.json(
        { error: "تلفن و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    // ذخیره همیشه با ارقام انگلیسی استاندارد
    const phone = normalizePhone(rawPhone);
    if (!isValidIranPhone(phone)) {
      return NextResponse.json(
        { error: "شماره تلفن معتبر نیست. نمونهٔ درست: 09123456789" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "کاربری با این شماره تلفن قبلا ثبت نام کرده است" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        address: typeof address === "string" && address.trim() ? address.trim() : null,
      },
    });

    return NextResponse.json({
      message: "ثبت نام با موفقیت انجام شد",
      user: { id: user.id, name: user.name, phone: user.phone },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "خطا در ثبت نام" },
      { status: 500 }
    );
  }
}
