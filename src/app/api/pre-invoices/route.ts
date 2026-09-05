import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
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

  const preInvoices = await prisma.preInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, phone: true } } },
  });

  return NextResponse.json(preInvoices);
}

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

  return NextResponse.json({ success: true, id: preInvoice.id });
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

  return NextResponse.json(preInvoice);
}
