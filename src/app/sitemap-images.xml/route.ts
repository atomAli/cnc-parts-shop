import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true, images: { some: { isPrimary: true } } },
    select: {
      slug: true,
      updatedAt: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });

  const urls = products
    .map((p) => {
      const img = p.images[0];
      if (!img) return "";
      return `<url><loc>${esc(`${SITE_URL}/products/${p.slug}`)}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod><image:image><image:loc>${esc(img.url)}</image:loc></image:image></url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}