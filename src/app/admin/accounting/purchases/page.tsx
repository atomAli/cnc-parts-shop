import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { InvoiceTable } from "../_components";

export const dynamic = "force-dynamic";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  if (!(await requireAdmin())) redirect("/auth/login");

  const q = (sp.q ?? "").trim();

  const rows = await prisma.purchaseInvoice.findMany({
    where: q ? { party: { name: { contains: q, mode: "insensitive" } } } : {},
    orderBy: [{ date: "desc" }, { number: "desc" }],
    take: 300,
    include: { party: { select: { id: true, name: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">فاکتورهای خرید</h1>
        <Link href="/admin/accounting" className="text-sm text-blue-600 hover:text-blue-700">
          ← داشبورد حسابداری
        </Link>
      </div>

      <form className="bg-white rounded-lg shadow p-3 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="جستجوی نام تأمین‌کننده…"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          جستجو
        </button>
      </form>

      <InvoiceTable rows={rows} baseHref="/admin/accounting/purchases" emptyText="فاکتوری یافت نشد" />
    </div>
  );
}