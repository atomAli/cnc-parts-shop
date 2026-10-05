import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  money, num, jalali, balanceTone, balanceTitle, kindLabel, kindTone,
  voucherLabel, chequeStatusLabel, stockOpLabel,
} from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function PartyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await requireAdmin())) redirect("/auth/login");

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      salesInvoices: { orderBy: { date: "desc" }, take: 20 },
      purchaseInvoices: { orderBy: { date: "desc" }, take: 20 },
      cashMovements: { orderBy: { date: "desc" }, take: 20 },
      cheques: { orderBy: { dueDate: "desc" } },
      ledgerEntries: { orderBy: [{ date: "desc" }, { legacyId: "desc" }] },
    },
  });
  if (!party) notFound();

  // مانده از دفتر اشخاص
  const balance = party.ledgerEntries.reduce((a, l) => a + l.amount, 0);
  // جمع اسناد برای تفکیک فروش/خرید
  const salesTotal = party.salesInvoices.reduce((a, i) => a + i.total, 0);
  const purchaseTotal = party.purchaseInvoices.reduce((a, i) => a + i.total, 0);
  const received = party.cashMovements
    .filter((m) => m.kind === "RECEIPT")
    .reduce((a, m) => a + m.amount, 0);
  const paid = party.cashMovements
    .filter((m) => m.kind === "PAYMENT")
    .reduce((a, m) => a + m.amount, 0);
  const unsettledCheques = party.cheques.filter((c) => !c.isSettled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{party.name}</h1>
        <Link href="/admin/accounting/parties" className="text-sm text-blue-600 hover:text-blue-700">
          ← بازگشت
        </Link>
      </div>

      {/* مشخصات */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1">نوع</div>
            <span className={`px-2 py-0.5 rounded text-xs ${kindTone(party.kind)}`}>
              {kindLabel(party.kind)}
            </span>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">تلفن</div>
            <div dir="ltr" className="text-gray-800">
              {party.phone ? toFaDigits(party.phone) : "—"}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">آدرس</div>
            <div className="text-gray-800">{party.address ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">حساب سایت</div>
            {party.user ? (
              <Link
                href={`/admin/users?q=${toFaDigits(encodeURIComponent(party.user.phone ?? ""))}`}
                className="text-blue-600 hover:underline"
              >
                {party.user.name} — متصل
              </Link>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ارقام کلیدی */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">مانده حساب</div>
          <div className={`mt-1 text-lg font-bold ${balanceTone(balance)}`}>
            {money(Math.abs(balance))}
          </div>
          <div className="text-[11px] text-gray-500">{balanceTitle(balance)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">مجموع فروش</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{money(salesTotal)}</div>
          <div className="text-[11px] text-gray-500">{num(party.salesInvoices.length)} فاکتور</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">مجموع خرید</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{money(purchaseTotal)}</div>
          <div className="text-[11px] text-gray-500">{num(party.purchaseInvoices.length)} فاکتور</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">دریافت / پرداخت نقدی</div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            {money(received)} / {money(paid)}
          </div>
          <div className="text-[11px] text-gray-500">
            چک تسویه‌نشده: {num(unsettledCheques.length)}
          </div>
        </div>
      </div>

      {/* دفتر اشخاص */}
      <div className="bg-white rounded-lg shadow">
        <h2 className="font-bold text-gray-900 p-4 pb-0">
          دفتر اشخاص ({num(party.ledgerEntries.length)} سند)
        </h2>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-right font-normal py-2">تاریخ</th>
                <th className="text-right font-normal py-2">نوع سند</th>
                <th className="text-right font-normal py-2">شماره</th>
                <th className="text-right font-normal py-2">شرح</th>
                <th className="text-left font-normal py-2">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {party.ledgerEntries.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">
                    {l.date ? jalali(l.date) : <span className="text-gray-400">اول دوره</span>}
                  </td>
                  <td className="py-1.5 text-gray-800">{voucherLabel(l.voucherType)}</td>
                  <td className="py-1.5 text-gray-600">{l.voucher ? toFaDigits(l.voucher) : "—"}</td>
                  <td className="py-1.5 text-gray-500 text-xs">{l.description ?? "—"}</td>
                  <td className={`py-1.5 text-left font-medium ${balanceTone(l.amount)}`}>
                    {money(l.amount)}
                  </td>
                </tr>
              ))}
              {party.ledgerEntries.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">سندی ثبت نشده</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="py-2" colSpan={4}>مانده نهایی</td>
                <td className={`py-2 text-left ${balanceTone(balance)}`}>
                  {money(balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* چک‌ها */}
      {party.cheques.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <h2 className="font-bold text-gray-900 p-4 pb-0">چک‌ها ({num(party.cheques.length)})</h2>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-right font-normal py-2">شماره</th>
                  <th className="text-right font-normal py-2">سررسید</th>
                  <th className="text-right font-normal py-2">بانک</th>
                  <th className="text-right font-normal py-2">وضعیت</th>
                  <th className="text-left font-normal py-2">مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {party.cheques.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="py-1.5" dir="ltr">{c.number ?? "—"}</td>
                    <td className="py-1.5 text-gray-600">{jalali(c.dueDate)}</td>
                    <td className="py-1.5 text-gray-600">{c.bankName ?? "—"}</td>
                    <td className="py-1.5 text-gray-600 text-xs">
                      {chequeStatusLabel(c.status)}
                      {c.archived && <span className="text-gray-400"> · بایگانی</span>}
                    </td>
                    <td className="py-1.5 text-left font-medium">{money(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}