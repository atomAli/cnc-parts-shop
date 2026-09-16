import prisma from "@/lib/prisma";

export interface PriceChangeInput {
  productId: string;
  price: number;
  discountPrice?: number | null;
}

/**
 * Records a price change. The currently-open history row (validUntil = null)
 * is closed with `validUntil = now` when the price/discount changes, and a new
 * open row (validFrom = now) is created. No-op when values did not change.
 */
export async function recordPriceChange({
  productId,
  price,
  discountPrice,
}: PriceChangeInput) {
  const open = await prisma.productPriceHistory.findFirst({
    where: { productId, validUntil: null },
    orderBy: { createdAt: "desc" },
  });

  if (open && open.price === price && (open.discountPrice ?? null) === (discountPrice ?? null)) {
    return;
  }

  const now = new Date();

  if (open) {
    await prisma.productPriceHistory.update({
      where: { id: open.id },
      data: { validUntil: now },
    });
  }

  await prisma.productPriceHistory.create({
    data: { productId, price, discountPrice: discountPrice ?? null, validFrom: now },
  });
}

export async function getPriceHistory(productId: string) {
  return prisma.productPriceHistory.findMany({
    where: { productId },
    orderBy: { validFrom: "desc" },
  });
}