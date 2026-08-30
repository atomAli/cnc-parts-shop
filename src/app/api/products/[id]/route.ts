import { NextResponse } from "next/server";
import { products as staticProducts, categories as staticCategories } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = staticProducts.find((p) => p.id === id || p.slug === id);

  if (!product) {
    return NextResponse.json(
      { error: "محصول یافت نشد" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    specs: product.specs,
    category: {
      slug: product.category,
      name: staticCategories.find((c) => c.slug === product.category)?.name || product.category,
    },
    brand: {
      slug: product.brand.toLowerCase(),
      name: product.brand,
    },
    images: product.imageUrl ? [{ id: product.id, url: product.imageUrl, alt: product.name, isPrimary: true }] : [],
  });
}
