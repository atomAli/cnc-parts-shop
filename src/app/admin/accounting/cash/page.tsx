import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { money, num, jalali, balanceTone } from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const sp = await searchParams;
  if (!(await requireAdmin())) redirect("/auth/login");

  const kind = sp.kind === "RECEIPT" || sp.kind === "PAYMENT"
    ? sp.kind
    : "";

  const [cashBox, bankAccount, agg, rows] = await Promise.all([
    prisma.cashBox.findFirst({ orderBy: { legacyId: "asc" } }),
    prisma.bankAccount.findFirst({ orderBy: { legacyId: "asc" } }),
    prisma.cashMovement.aggregate({ _sum: { amount: true } }),
    prisma.cashMovement.findMany({
      where: kind ? { kind } : {},
      orderBy: [{ date: "desc" }, { legacyId: "desc" }],
      take: 300,
      include: { party: { select: { id: true, name: true } } },
    }),
  ]);

  const received = rows.filter((r) => r.kind === "RECEIPT").reduce((a, r) => a + r.amount, 0);
  const paid = rows.filter((r) => r.kind === "PAYMENT").reduce((a, r) => a + r.amount, 0);
  const cashBalance = (cashBox?.openingBalance ?? 0) + received - paid;

  // موجودی واقعی صندوق در فایل اصلی فقط از جدول گردش صندوق می‌آید؛
  // چون آن جدول را نیاوردیم، از بازهٔ کامل داده حساب می‌کنیم.
  const allReceived = await prisma.cashMovement.aggregate({
    _sum: { amount: true }, where: { kind: "RECEIPT" },
  });
  const allPaid = await prisma.cashMovement.aggregate({
    _sum: { amount: true }, where: { kind: "PAYMENT" },
  });
  const trueCash =
    (cashBox?.openingBalance ?? 0) +
    (allReceived._sum.amount ?? 0) -
    (allPaid._sum.amount ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">صندوق و بانک</h1>
        <Link href="/admin/accounting" className="text-sm text-blue-600 hover:text-blue-700">
          ← داشبورد حسابداری
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">موجودی فعلی صندوق</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {money(trueCash)} <span className="text-xs font-normal">تومان</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            اول دوره {money(cashBox?.openingBalance ?? 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">موجودی بانک</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {money(bankAccount?.openingBalance ?? 0)} <span className="text-xs font-normal">تومان</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {bankAccount?.name ?? "—"}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            فایل قدیمی برای این بانک هیچ گردش روزانه‌ای ثبت نکرده — فقط مانده اول دوره
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">جمع کل دریافت / پرداخت</div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            {money(allReceived._sum.amount ?? 0)} / {money(allPaid._sum.amount ?? 0)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            خالص {money((allReceived._sum.amount ?? 0) - (allPaid._sum.amount ?? 0))} تومان
          </div>
        </div>
      </div>

      <form className="bg-white rounded-lg shadow p-3 flex gap-2">
        <select name="kind" defaultValue={kind} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">همه (دریافت و پرداخت)</option>
          <option value="RECEIPT">فقط دریافت</option>
          <option value="PAYMENT">فقط پرداخت</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          اعمال
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="text-right font-normal py-2 px-3">تاریخ</th>
              <th className="text-right font-normal py-2 px-3">نوع</th>
              <th className="text-right font-normal py-2 px-3">طرف حساب</th>
              <th className="text-right font-normal py-2 px-3">شماره سند</th>
              <th className="text-left font-normal py-2 px-3">مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-600">{jalali(r.date)}</td>
                <td className="py-2 px-3">
                  <span
                    className={
                      r.kind === "RECEIPT"
                        ? "px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                        : "px-2 py-0.5 rounded text-xs bg-red-100 text-red-800"
                    }
                  >
                    {r.kind === "RECEIPT" ? "دریافت" : "پرداخت"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {r.party ? (
                    <Link href={`/admin/accounting/parties/${r.party.id}`} className="text-gray-800 hover:underline">
                      {r.party.name}
                    </Link>
                  ) : "—"}
                </td>
                <td className="py-2 px-3 text-gray-600" dir="ltr">
                  {r.voucher ? toFaDigits(r.voucher) : "—"}
                </td>
                <td className={`py-2 px-3 text-left font-medium ${balanceTone(r.kind === "RECEIPT" ? r.amount : -r.amount)}`}>
                  {money(r.amount)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">سندی یافت نشد</td></tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 font-medium">
            <tr>
              <td className="py-2 px-3" colSpan={4}>جمع ردیف‌های نمایش‌داده‌شده ({num(rows.length)})</td>
              <td className="py-2 px-3 text-left">{money(received + paid)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {rows.length >= 300 && (
        <div className="text-xs text-gray-500">
          فقط {toFaDigits(300)} سند آخر نمایش داده می‌شود
          {cashBalance !== trueCash && ` — موجودی فیلترشده ${money(cashBalance)}`}
        </div>
      )}
    </div>
  );
}