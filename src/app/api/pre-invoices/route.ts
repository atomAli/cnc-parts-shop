import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, customerPhone, items, totalPrice, notes } = body;

  if (!customerName || !customerPhone) {
    return NextResponse.json({ error: "نام و شماره تلفن الزامی است" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "سبد خرید خالی است" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;

  const preInvoice = await prisma.preInvoice.create({
    data: {
      userId,
      customerName,
      customerPhone,
      items,
      totalPrice: totalPrice || 0,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, id: preInvoice.id });
}
