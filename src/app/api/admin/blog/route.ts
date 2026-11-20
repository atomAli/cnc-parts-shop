import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { slugifyBlogTitle } from "@/lib/blog-slug";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 });

  const base = slugifyBlogTitle(body.slug || title) || "post";
  let slug = base;
  for (let i = 2; ; i++) {
    const exists = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) break;
    slug = `${base}-${i}`;
  }

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: body.excerpt?.trim() || null,
      content: body.content || "",
      image: body.image?.trim() || null,
      published: body.published === true,
    },
  });

  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  return NextResponse.json(post, { status: 201 });
}
