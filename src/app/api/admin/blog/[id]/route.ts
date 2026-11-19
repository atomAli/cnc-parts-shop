import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { slugifyBlogTitle } from "@/lib/blog-slug";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 });

  const base = slugifyBlogTitle(body.slug || title) || "post";
  let slug = base;
  for (let i = 2; ; i++) {
    const taken = await prisma.blogPost.findFirst({
      where: { slug, id: { not: id } },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${base}-${i}`;
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: body.excerpt?.trim() || null,
      content: body.content || "",
      image: body.image?.trim() || null,
      published: body.published === true,
    },
  });

  return NextResponse.json(post);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
