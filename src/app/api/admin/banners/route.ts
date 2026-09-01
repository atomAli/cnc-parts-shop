import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const banners = await prisma.banner.findMany({
    orderBy: { order: "asc" },
  });

  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const banner = await prisma.banner.create({
    data: {
      title: body.title,
      subtitle: body.subtitle || "",
      image: body.image || "",
      link: body.link || "",
      order: body.order || 0,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(banner, { status: 201 });
}
