import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { order: "asc" } },
    },
  });

  if (!product) {
    product = await prisma.product.findUnique({
      where: { slug: id },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { order: "asc" } },
      },
    });
  }

  if (!product) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }

  let specs: Record<string, string> = {};
  if (product.specifications) {
    try {
      specs = JSON.parse(product.specifications);
    } catch {}
  }

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    discountPrice: product.discountPrice,
    stock: product.stock,
    specs,
    category: product.category
      ? { slug: product.category.slug, name: product.category.name }
      : { slug: "", name: "" },
    brand: product.brand
      ? { slug: product.brand.slug, name: product.brand.name }
      : { slug: "", name: "" },
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
    })),
  });
}
