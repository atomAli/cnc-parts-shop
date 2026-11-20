import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { categoryPath } from "@/lib/category-url";
import { getAllCategoriesIndex, collectDescendantIds } from "@/lib/category-tree";
import { isThinProduct } from "@/lib/product-seo";
import { SITE_URL } from "@/lib/site";

const baseUrl = SITE_URL;

// مقالات جدید وبلاگ بدون نیاز به دیپلوی دوباره وارد سایت مپ میشوند.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/repairs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const [categories, categoryTree, products, brands, posts] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        parentId: true,
        parent: { select: { slug: true } },
      },
    }),
    getAllCategoriesIndex(),
    prisma.product.findMany({
      where: { active: true },
      select: {
        slug: true,
        updatedAt: true,
        categoryId: true,
        description: true,
        images: { where: { url: { not: "" } }, take: 1, select: { url: true } },
      },
    }),
    prisma.brand.findMany({
      where: {
        name: { not: "غیره" },
        products: { some: { active: true } },
      },
      select: { slug: true, updatedAt: true, _count: { select: { products: true } } },
    }),
    prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  // محصولات نازک (بدون توضیح و عکس) نه در sitemap میآیند و نه ایندکس میشوند.
  const indexableProducts = products.filter((product) => !isThinProduct(product));

  /** تعداد و تازهترین زمان محصولات قابل ایندکس هر دسته، شامل زیردستهها. */
  const statsByCategory = new Map<string, { count: number; updatedAt: Date }>();
  for (const product of indexableProducts) {
    if (!product.categoryId) continue;
    const stat = statsByCategory.get(product.categoryId) ?? {
      count: 0,
      updatedAt: product.updatedAt,
    };
    stat.count += 1;
    if (product.updatedAt > stat.updatedAt) stat.updatedAt = product.updatedAt;
    statsByCategory.set(product.categoryId, stat);
  }

  const categoryStats = categories
    .map((category) => {
      const ids = [category.id, ...collectDescendantIds(categoryTree, category.id)];
      let count = 0;
      let updatedAt = category.updatedAt;
      for (const id of ids) {
        const stat = statsByCategory.get(id);
        if (!stat) continue;
        count += stat.count;
        if (stat.updatedAt > updatedAt) updatedAt = stat.updatedAt;
      }
      return { category, count, updatedAt };
    })
    .filter((row) => row.count > 0)
    // دستههای اصلی (صفحات فرود مهم) قبل از زیردستهها قرار بگیرند.
    .sort(
      (a, b) =>
        Number(Boolean(a.category.parentId)) - Number(Boolean(b.category.parentId)) ||
        b.count - a.count,
    );

  const categoryRoutes: MetadataRoute.Sitemap = categoryStats.map(({ category, updatedAt }) => ({
    url: `${baseUrl}${categoryPath(category)}`,
    lastModified: updatedAt,
    changeFrequency: "weekly",
    // صفحهٔ خانوادهٔ کالا مهمترین صفحهٔ لیست است.
    priority: category.parentId ? 0.6 : 0.9,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands
    .filter((brand) => brand._count.products >= 2)
    .map((brand) => ({
      url: `${baseUrl}/brand/${encodeURI(brand.slug)}`,
      lastModified: brand.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${encodeURI(post.slug)}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const productRoutes: MetadataRoute.Sitemap = indexableProducts.map((product) => ({
    url: `${baseUrl}/products/${encodeURI(product.slug)}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...brandRoutes,
    ...blogRoutes,
    ...productRoutes,
  ];
}
