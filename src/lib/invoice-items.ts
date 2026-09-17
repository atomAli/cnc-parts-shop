import prisma from "@/lib/prisma";

export interface InvoiceLineInput {
  productId: string;
  unitPrice?: number;
  quantity?: number;
  length?: number | string | null;
  branchCount?: number;
  branchLength?: number | string | null;
  baseLength?: number | string | null;
  discountPercent?: number;
}

export interface StoredItem {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  price: number;
  quantity: number;
  length?: number;
  isMeter?: boolean;
  branchCount?: number;
  branchLength?: number;
  baseLength?: number;
  discountPercent?: number;
}

export async function computeInvoice(items: InvoiceLineInput[]) {
  if (items.length === 0) {
    return { error: "حداقل یک کالا انتخاب کنید" };
  }

  const ids = items.map((i) => i.productId).filter(Boolean);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const storedItems: StoredItem[] = [];
  let totalPrice = 0;

  for (const it of items) {
    const prod = productMap.get(it.productId);
    if (!prod) continue;

    const unitPrice = Number(it.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { error: `قیمت ${prod.name} نامعتبر است` };
    }

    const quantity = Math.max(1, it.quantity != null ? Math.floor(it.quantity) : 1);
    const isMeter = it.branchLength != null && it.branchLength !== "";
    const discount = Math.min(Math.max(Number(it.discountPercent) || 0, 0), 100);

    let lineTotal: number;
    if (isMeter) {
      const branchCount = Math.max(1, it.branchCount != null ? Math.floor(it.branchCount) : 1);
      const branchLength = Number(it.branchLength);
      const baseLength = Number(it.baseLength) || 400;
      if (!Number.isFinite(branchLength) || branchLength <= 0) {
        return { error: `متراژ ${prod.name} نامعتبر است` };
      }
      lineTotal = unitPrice * branchCount * (branchLength / 100);
      storedItems.push({
        productId: prod.id,
        name: prod.name,
        slug: prod.slug,
        unitPrice,
        price: unitPrice,
        quantity: branchCount,
        isMeter: true,
        branchCount,
        branchLength,
        baseLength,
        discountPercent: discount || undefined,
      });
    } else {
      lineTotal = unitPrice * quantity;
      storedItems.push({
        productId: prod.id,
        name: prod.name,
        slug: prod.slug,
        unitPrice,
        price: unitPrice,
        quantity,
        discountPercent: discount || undefined,
      });
    }
    totalPrice += Math.round((lineTotal * (100 - discount)) / 100);
  }

  if (storedItems.length === 0) {
    return { error: "حداقل یک کالا انتخاب کنید" };
  }

  return { storedItems, totalPrice: Math.round(totalPrice) };
}