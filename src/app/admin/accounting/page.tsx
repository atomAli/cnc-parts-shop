import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  money,
  num,
  jalali,
  balanceTone,
  balanceTitle,
} from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";
import {
  BookOpen,
  Users,
  Receipt,
  ShoppingCart,
  Wallet,
  FileText,
  Boxes,
} from "lucide-react";

export const dynamic = "force-dynamic";

function Card({
  title,
  value,
  sub,
  href,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub?: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg shadow p-4 h-full">
        <div className="flex items-center gap-2 text-gray-600">
          <Icon size={18} />
          <span className="text-sm">{title}</span>
        </div>
        <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
        {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
      </div>
    </Link>
  );
}

export default async function AccountingDashboard() {
  if (!(await requireAdmin())) redirect("/auth/login");

  const [
    partyCount,
    supplierCount,
    salesAgg,
    purchaseAgg,
    receiptAgg,
    paymentAgg,
    cashBox,
    bankAccount,
    chequeAgg,
    unsettledCheques,
    stockAgg,
    topDebtors,
    recentSales,
  ] = await Promise.all([
    prisma.party.count(),
    prisma.party.count({ where: { kind: "SUPPLIER" } }),

    prisma.salesInvoice.aggregate({
      _sum: { total: true },
      _count: true,
      _max: { date: true },
      _min: { date: true },
      where: { status: "DONE" },
    }),
    prisma.purchaseInvoice.aggregate({
      _sum: { total: true },
      _count: true,
      _max: { date: true },
      _min: { date: true },
    }),

    prisma.cashMovement.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { kind: "RECEIPT" },
    }),
    prisma.cashMovement.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { kind: "PAYMENT" },
    }),

    prisma.cashBox.findFirst({ orderBy: { legacyId: "asc" } }),
    prisma.bankAccount.findFirst({ orderBy: { legacyId: "asc" } }),

    prisma.cheque.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.cheque.count({ where: { isSettled: false } }),
    prisma.$queryRaw<{ items: number; value: number; movements: number }[]>`
      SELECT
        (SELECT count(*) FROM stock_movements) AS movements,
        (SELECT count(DISTINCT COALESCE("productId", name)) FROM stock_movements
          WHERE name IS NOT NULL AND name <> '') AS items,
        (SELECT COALESCE(SUM(stock * "averagePrice"), 0)
         FROM (SELECT DISTINCT ON (COALESCE(m."productId", m.name))
                      m.stock, m."averagePrice"
                 FROM stock_movements m
                 WHERE m.name IS NOT NULL AND m.name <> ''
                 ORDER BY COALESCE(m."productId", m.name), m."date" DESC, m."legacyId" DESC) t) AS value
    `,

    prisma.$queryRaw<{ id: string; name: string; balance: number }[]>`
      SELECT p.id, p.name, SUM(l.amount) AS balance
      FROM ledger_entries l
      JOIN parties p ON p.id = l."partyId"
      GROUP BY p.id, p.name
      ORDER BY SUM(l.amount) ASC
      LIMIT 8
    `,
    prisma.salesInvoice.findMany({
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 8,
      include: { party: { select: { name: true } } },
    }),
  ]);

  const cashBalance =
    (cashBox?.openingBalance ?? 0) +
    (receiptAgg._sum.amount ?? 0) -
    (paymentAgg._sum.amount ?? 0);
  const bankBalance = bankAccount?.openingBalance ?? 0;
  const grossProfit =
    (salesAgg._sum.total ?? 0) - (purchaseAgg._sum.total ?? 0);

  // فروش ماهانه برای نمودار. عمداً از left() استفاده می‌کنیم نه to_date():
  // تاریخ‌ها شمسی‌اند و حتی بعضی از آن‌ها در فایل اصلی روز نامعتبر دارند
  // (مثل ۱۴۰۵/۰۲/۳۰ و ۱۴۰۵/۰۲/۳۱) که تبدیل تاریخ در Postgres خطا می‌دهد.
  // چون عرض رشته ثابت است، هفت کاراکتر اول همان «YYYY/MM» است.
  const monthly = await prisma.$queryRaw<{ month: string; total: number }[]>`
    SELECT left("date", 7) AS month, SUM(total) AS total
    FROM sales_invoices
    WHERE status = 'DONE' AND "date" ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}$'
    GROUP BY 1 ORDER BY 1
  `;
  const maxMonthly = Math.max(
    ...monthly.map((m) => Math.abs(Number(m.total))),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">حسابداری</h1>
        <Link
          href="/admin/accounting/parties"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          دفتر طرف حساب‌ها ←
        </Link>
      </div>

      <div className="text-xs text-gray-500">
        داده‌های تاریخی از نرم‌افزار حسابداری قدیمی وارد شده است
        {salesAgg._min.date && salesAgg._max.date && (
          <>
            {" "}
            — بازهٔ{" "}
            <span className="font-medium">
              {jalali(salesAgg._min.date)}
            </span> تا{" "}
            <span className="font-medium">{jalali(salesAgg._max.date)}</span>
          </>
        )}
      </div>

      {/* خلاصهٔ ارقام */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <Card
          icon={Receipt}
          title="فروش کل"
          href="/admin/accounting/sales"
          value={`${money(salesAgg._sum.total ?? 0)} تومان`}
          sub={`${num(salesAgg._count)} فاکتور`}
        />
        <Card
          icon={ShoppingCart}
          title="خرید کل"
          href="/admin/accounting/purchases"
          value={`${money(purchaseAgg._sum.total ?? 0)} تومان`}
          sub={`${num(purchaseAgg._count)} فاکتور`}
        />
        <Card
          icon={Wallet}
          title="خالص نقد"
          href="/admin/accounting/cash"
          value={`${money((receiptAgg._sum.amount ?? 0) - (paymentAgg._sum.amount ?? 0))} تومان`}
          sub={`دریافت ${num(receiptAgg._count)} · پرداخت ${num(paymentAgg._count)}`}
        />
        <Card
          icon={BookOpen}
          title="سود ناخالص"
          href="/admin/accounting/sales"
          value={`${money(grossProfit)} تومان`}
          sub="فروش منهای خرید — بدون بهای تمام‌شده"
        />
      </div>

      {/* موجودی و چک */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <Card
          icon={Wallet}
          title="موجودی صندوق"
          href="/admin/accounting/cash"
          value={`${money(cashBalance)} تومان`}
          sub={`اول دوره ${money(cashBox?.openingBalance ?? 0)}`}
        />
        <Card
          icon={Wallet}
          title="موجودی بانک"
          href="/admin/accounting/cash"
          value={`${money(bankBalance)} تومان`}
          sub={bankAccount ? `${bankAccount.name}` : "—"}
        />
        <Card
          icon={FileText}
          title="چک‌های در جریان"
          href="/admin/accounting/cheques"
          value={`${num(unsettledCheques)} فقره`}
          sub={`کل چک ${money(chequeAgg._sum.amount ?? 0)} تومان`}
        />
        <Card
          icon={Boxes}
          title="موجودی انبار"
          href="/admin/accounting/stock"
          value={`${num(Number(stockAgg[0]?.items ?? 0))} قلم کالا`}
          sub={`ارزش ${money(Number(stockAgg[0]?.value ?? 0))} تومان`}
        />
        <Card
          icon={Users}
          title="طرف حساب"
          href="/admin/accounting/parties"
          value={`${num(partyCount)} نفر`}
          sub={`${num(supplierCount)} تأمین‌کننده`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* نمودار فروش ماهانه — CSS ساده، بدون کتابخانه */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-900 mb-4">فروش ماهانه (تومان)</h2>
          {monthly.length === 0 ? (
            <div className="text-sm text-gray-500">داده‌ای نیست</div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {monthly.map((m) => {
                const pct = Math.round(
                  (Math.abs(Number(m.total)) / maxMonthly) * 100,
                );
                return (
                  <div
                    key={m.month}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="text-[10px] text-gray-500">
                      {toFaDigits(
                        String(m.total).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                      )}
                    </div>
                    <div
                      className="w-full bg-blue-600 rounded-t"
                      style={{ height: `${pct}%` }}
                    />
                    <div className="text-[10px] text-gray-600">
                      {toFaDigits(m.month.slice(5))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* بیشترین بدهکاران */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-900 mb-3">بیشترین مانده بدهکار</h2>
          <div className="space-y-1">
            {topDebtors.map((d) => (
              <Link
                key={d.id}
                href={`/admin/accounting/parties/${d.id}`}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 hover:bg-gray-50"
              >
                <span className="text-sm text-gray-800 truncate">{d.name}</span>
                <span
                  className={`text-sm font-medium ${balanceTone(Number(d.balance))}`}
                >
                  {money(Math.abs(Number(d.balance)))}
                </span>
              </Link>
            ))}
            {topDebtors.length === 0 && (
              <div className="text-sm text-gray-500">موردی نیست</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            {balanceTitle(Number(topDebtors[0]?.balance ?? 0))} — عدد مثبت یعنی
            طلب ما از طرف حساب
          </div>
        </div>
      </div>

      {/* آخرین فاکتورهای فروش */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">آخرین فاکتورهای فروش</h2>
          <Link
            href="/admin/accounting/sales"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            همه ←
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-right font-normal py-2">شماره</th>
                <th className="text-right font-normal py-2">تاریخ</th>
                <th className="text-right font-normal py-2">طرف حساب</th>
                <th className="text-left font-normal py-2">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <Link
                      href={`/admin/accounting/sales/${s.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {toFaDigits(s.number)}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-600">{jalali(s.date)}</td>
                  <td className="py-2 text-gray-800">{s.party?.name ?? "—"}</td>
                  <td className="py-2 text-left font-medium">
                    {money(s.total)}
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    موردی نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
