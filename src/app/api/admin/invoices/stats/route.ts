import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const [total, pending, contacted, processing, done, fromWebsite, recent] = await Promise.all([
    prisma.preInvoice.count(),
    prisma.preInvoice.count({ where: { status: "PENDING" } }),
    prisma.preInvoice.count({ where: { status: "CONTACTED" } }),
    prisma.preInvoice.count({ where: { status: "PROCESSING" } }),
    prisma.preInvoice.count({ where: { status: "DONE" } }),
    prisma.preInvoice.count({ where: { source: "WEBSITE" } }),
    prisma.preInvoice.findMany({
      take: 5,
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
    }),
  ]);

  return NextResponse.json({
    total,
    byStatus: { PENDING: pending, PROCESSING: processing, CONTACTED: contacted, DONE: done },
    fromWebsite,
    recent,
  });
}