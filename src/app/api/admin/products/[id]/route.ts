import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true, images: { orderBy: { order: "asc" } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await req.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      discountPrice: body.discountPrice,
      stock: body.stock,
      sku: body.sku,
      categoryId: body.categoryId,
      brandId: body.brandId,
      specifications: body.specifications ? JSON.stringify(body.specifications) : undefined,
      active: body.active,
      featured: body.featured,
    },
  });

  if (body.images && Array.isArray(body.images)) {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    if (body.images.length > 0) {
      await prisma.productImage.createMany({
        data: body.images.map((img: any, index: number) => ({
          productId: id,
          url: img.url,
          alt: img.alt || "",
          isPrimary: img.isPrimary ?? index === 0,
          order: index,
        })),
      });
    }
  }

  const updated = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true, images: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const { id } = await params;

  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    return NextResponse.json(
      { error: "این محصول در سفارشات استفاده شده و قابل حذف نیست" },
      { status: 400 }
    );
  }

  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
