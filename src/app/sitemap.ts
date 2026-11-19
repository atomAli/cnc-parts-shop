import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { categoryPath } from "@/lib/category-url";
import { SITE_URL } from "@/lib/site";

const baseUrl = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/repairs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // فقط دستههایی که محصول فعال دارند
  const categories = await prisma.category.findMany({
    where: { active: true, products: { some: { active: true } } },
    select: {
      slug: true,
      updatedAt: true,
      parentId: true,
      parent: { select: { slug: true } },
    },
  });
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}${categoryPath(cat)}`,
    lastModified: cat.updatedAt,
    changeFrequency: "weekly" as const,
    priority: cat.parentId ? 0.6 : 0.7,
  }));

  // فقط برندهای واقعی (حداقل ۲ محصول و خود برند «غیره» حذف شود)
  const brands = await prisma.brand.findMany({
    where: {
      name: { not: "غیره" },
      products: { some: { active: true } },
    },
    select: { slug: true, name: true, updatedAt: true, _count: { select: { products: true } } },
  });
  const brandRoutes: MetadataRoute.Sitemap = brands
    .filter((b) => b._count.products >= 2)
    .map((brand) => ({
      url: `${baseUrl}/brand/${encodeURI(brand.slug)}`,
      lastModified: brand.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${encodeURI(post.slug)}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/products/${encodeURI(p.slug)}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...brandRoutes, ...blogRoutes, ...productRoutes];
}
