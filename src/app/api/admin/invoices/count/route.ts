import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const count = await prisma.preInvoice.count();

  return NextResponse.json({ count });
}