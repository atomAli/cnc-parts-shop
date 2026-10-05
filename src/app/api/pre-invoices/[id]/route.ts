import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "شناسه فاکتور الزامی است" }, { status: 400 });

  const invoice = await prisma.preInvoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      customerName: true,
      customerPhone: true,
      address: true,
      items: true,
      totalPrice: true,
      status: true,
      notes: true,
      createdAt: true,
      userId: true,
      adminEditedAt: true,
      adminEditSeenAt: true,
    },
  });

  if (!invoice) return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });

  const userId = (session.user as { id?: string })?.id;
  const isAdmin = (session.user as { role?: string })?.role === "ADMIN";
  if (!isAdmin && invoice.userId !== userId) {
    return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}