import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { computeInvoice, InvoiceLineInput } from "@/lib/invoice-items";
import { normalizePhone, isValidIranPhone } from "@/lib/phone";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "شناسه فاکتور الزامی است" }, { status: 400 });

  const invoice = await prisma.preInvoice.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  if (!invoice) return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });

  return NextResponse.json(invoice);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "شناسه فاکتور الزامی است" }, { status: 400 });

  const body = await req.json();
  const { customerName, address, userId, notes, status } = body;
  const items = Array.isArray(body.items) ? (body.items as InvoiceLineInput[]) : [];
  const finalStatus = status === "DONE" ? "DONE" : "PENDING";

  // ذخیره همیشه با ارقام انگلیسی استاندارد
  const customerPhone = normalizePhone(body.customerPhone);
  if (!isValidIranPhone(customerPhone)) {
    return NextResponse.json(
      { error: "شماره تلفن معتبر نیست. نمونهٔ درست: 09123456789" },
      { status: 400 }
    );
  }

  if (!customerName?.trim()) {
    return NextResponse.json({ error: "نام مشتری الزامی است" }, { status: 400 });
  }

  const existing = await prisma.preInvoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });

  const lineResult = await computeInvoice(items);
  if ("error" in lineResult) {
    return NextResponse.json({ error: lineResult.error }, { status: 400 });
  }

  const invoice = await prisma.preInvoice.update({
    where: { id },
    data: {
      userId: userId || null,
      customerName: customerName.trim(),
      customerPhone,
      address: typeof address === "string" ? address.trim() || null : undefined,
      items: lineResult.storedItems as unknown as Prisma.InputJsonValue,
      totalPrice: lineResult.totalPrice,
      notes: notes || null,
      status: finalStatus,
      // اعلام به کاربر: فاکتور دستی اصلاح شده → badge در هدر ظاهر شود
      adminEditedAt: new Date(),
      adminEditSeenAt: null,
    },
  });

  return NextResponse.json({ success: true, id: invoice.id });
}