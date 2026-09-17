import prisma from "@/lib/prisma";

export interface InvoiceLineInput {
  productId?: string;
  slug?: string;
  name?: string;
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

  const ids = items.map((i) => i.productId).filter(Boolean) as string[];
  const slugItems = items.filter((i) => !i.productId && i.slug).map((i) => String(i.slug));

  const [products, productsBySlug] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: ids } } }),
    slugItems.length
      ? prisma.product.findMany({ where: { slug: { in: slugItems } } })
      : Promise.resolve([]),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const productBySlug = new Map(productsBySlug.map((p) => [p.slug, p]));

  const storedItems: StoredItem[] = [];
  let totalPrice = 0;

  for (const it of items) {
    const prod = it.productId ? productById.get(it.productId) : productBySlug.get(String(it.slug));

    const name = prod?.name || it.name || "";
    const slug = prod?.slug || it.slug || "";
    const productId = prod?.id || it.productId || "";

    const unitPrice = Number(it.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { error: `قیمت ${name || "کالا"} نامعتبر است` };
    }

    const quantity = Math.max(1, it.quantity != null ? Math.floor(it.quantity) : 1);
    const isMeter = prod?.isMeter === true || (it.branchLength != null && it.branchLength !== "");
    const discount = Math.min(Math.max(Number(it.discountPercent) || 0, 0), 100);

    let lineTotal: number;
    if (isMeter) {
      const branchCount = Math.max(1, it.branchCount != null ? Math.floor(it.branchCount) : 1);
      const branchLength = Number(it.branchLength);
      const baseLength = Number(it.baseLength) || 400;
      if (!Number.isFinite(branchLength) || branchLength <= 0) {
        return { error: `متراژ ${name || "کالا"} نامعتبر است` };
      }
      lineTotal = unitPrice * branchCount * (branchLength / 100);
      storedItems.push({
        productId,
        name,
        slug,
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
        productId,
        name,
        slug,
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