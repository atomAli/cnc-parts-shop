import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { InvoiceDetail } from "../../_components";

export const dynamic = "force-dynamic";

export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAdmin())) redirect("/auth/login");

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      party: { select: { id: true, name: true, phone: true } },
      lines: { orderBy: { position: "asc" } },
    },
  });
  if (!invoice) notFound();

  return (
    <InvoiceDetail
      invoice={{
        id: invoice.id, number: invoice.number, date: invoice.date,
        deliveryDate: invoice.deliveryDate, total: invoice.total,
        discount: invoice.discount, status: invoice.status, note: invoice.note,
        party: invoice.party,
      }}
      lines={invoice.lines.map((l) => ({
        id: l.id, position: l.position, name: l.name,
        quantity: l.quantity, unitPrice: l.unitPrice,
        discount: l.discount, total: l.total,
      }))}
      baseHref="/admin/accounting/purchases"
      kindLabel="فاکتور خرید"
    />
  );
}