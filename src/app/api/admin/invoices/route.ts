import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface InvoiceLineInput {
  productId: string;
  unitPrice?: number;
  quantity?: number;
  length?: number | string | null;
  branchCount?: number;
  branchLength?: number | string | null;
  baseLength?: number | string | null;
}

interface StoredItem {
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
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  const body = await req.json();
  const { customerName, customerPhone, userId, notes } = body;
  const items = Array.isArray(body.items) ? (body.items as InvoiceLineInput[]) : [];

  if (!customerName?.trim() || !customerPhone?.trim()) {
    return NextResponse.json({ error: "نام و شماره تلفن مشتری الزامی است" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "حداقل یک کالا انتخاب کنید" }, { status: 400 });
  }

  const ids = items.map((i) => i.productId).filter(Boolean);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) {
    return NextResponse.json({ error: "یک یا چند کالا یافت نشد" }, { status: 400 });
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const storedItems: StoredItem[] = [];
  let totalPrice = 0;

  for (const it of items) {
    const prod = productMap.get(it.productId);
    if (!prod) continue;

    const unitPrice = Number(it.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: `قیمت ${prod.name} نامعتبر است` }, { status: 400 });
    }

    const quantity = Math.max(1, it.quantity != null ? Math.floor(it.quantity) : 1);
    const isMeter = it.branchLength != null && it.branchLength !== "";

    let lineTotal: number;
    if (isMeter) {
      const branchCount = Math.max(1, it.branchCount != null ? Math.floor(it.branchCount) : 1);
      const branchLength = Number(it.branchLength);
      const baseLength = Number(it.baseLength) || 400;
      if (!Number.isFinite(branchLength) || branchLength <= 0) {
        return NextResponse.json({ error: `متراژ ${prod.name} نامعتبر است` }, { status: 400 });
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
      });
    }
    totalPrice += lineTotal;
  }

  if (storedItems.length === 0) {
    return NextResponse.json({ error: "حداقل یک کالا انتخاب کنید" }, { status: 400 });
  }

  const invoice = await prisma.preInvoice.create({
    data: {
      userId: userId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: storedItems as unknown as Prisma.InputJsonValue,
      totalPrice: Math.round(totalPrice),
      notes: notes || null,
      status: "DONE",
    },
  });

  return NextResponse.json({ success: true, id: invoice.id }, { status: 201 });
}