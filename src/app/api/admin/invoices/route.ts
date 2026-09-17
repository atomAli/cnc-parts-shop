import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { computeInvoice, InvoiceLineInput } from "@/lib/invoice-items";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const { customerName, customerPhone, userId, notes, status } = body;
  const items = Array.isArray(body.items) ? (body.items as InvoiceLineInput[]) : [];
  const finalStatus = status === "DONE" ? "DONE" : "PENDING";

  if (!customerName?.trim() || !customerPhone?.trim()) {
    return NextResponse.json({ error: "نام و شماره تلفن مشتری الزامی است" }, { status: 400 });
  }

  const lineResult = await computeInvoice(items);
  if ("error" in lineResult) {
    return NextResponse.json({ error: lineResult.error }, { status: 400 });
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const invoiceNumber = 1000000 + Math.floor(Math.random() * 9000000);
    try {
      const invoice = await prisma.preInvoice.create({
        data: {
          userId: userId || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: lineResult.storedItems as unknown as Prisma.InputJsonValue,
          totalPrice: lineResult.totalPrice,
          invoiceNumber,
          notes: notes || null,
          status: finalStatus,
        },
      });
      return NextResponse.json({ success: true, id: invoice.id }, { status: 201 });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "P2002") continue;
      throw e;
    }
  }

  return NextResponse.json({ error: "خطا در ایجاد شماره فاکتور؛ دوباره تلاش کنید" }, { status: 500 });
}