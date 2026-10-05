import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  money,
  num,
  jalali,
  isPlausibleJalali,
  stockOpLabel,
} from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";

export const dynamic = "force-dynamic";

const OP_TONE: Record<number, string> = {
  0: "bg-gray-100 text-gray-700",
  1: "bg-green-100 text-green-800",
  2: "bg-red-100 text-red-800",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; op?: string; view?: string }>;
}) {
  const sp = await searchParams;
  if (!(await requireAdmin())) redirect("/auth/login");

  const q = (sp.q ?? "").trim();
  const op = sp.op === "0" || sp.op === "1" || sp.op === "2" ? sp.op : "";
  const showMovements = sp.view === "movements";

  // موجودی فعلی هر کالا = آخرین حرکت ثبت‌شده‌اش.
  // نام کالا در حرکت انبار snapshot است و در نرم‌افزار قدیمی برای کالاهای هم‌نام
  // (مثلاً «پل ۴۰») تکرار می‌شد، پس گروه‌بندی بر اساس productId انجام می‌شود و
  // فقط برای حرکت‌های بدون محصول به همان نام برمی‌گردیم.
  const current = await prisma.$queryRaw<
    {
      name: string;
      stock: number;
      avg: number;
      value: number;
      date: string;
      op: number;
      movements: number;
    }[]
  >`
    WITH last AS (
      SELECT DISTINCT ON (COALESCE(m."productId", m.name))
             COALESCE(m."productId", m.name) AS key,
             COALESCE(p.name, m.name) AS name,
             m.stock, m."averagePrice" AS avg, m.date, m."operationType" AS op
      FROM stock_movements m
      LEFT JOIN products p ON p.id = m."productId"
      WHERE m.name IS NOT NULL AND m.name <> ''
      ORDER BY COALESCE(m."productId", m.name), m."date" DESC, m."legacyId" DESC
    )
    SELECT l.name, l.stock, l.avg, l.stock * l.avg AS value, l.date, l.op,
           (SELECT count(*) FROM stock_movements s
             WHERE COALESCE(s."productId", s.name) = l.key
               AND s."operationType" <> 0) AS movements
    FROM last l
    WHERE (${q} = '' OR l.name ILIKE ${"%" + q + "%"})
    ORDER BY (l.stock * l.avg) DESC, l.name
    LIMIT 500
  `;

  // گردش کامل انبار — برای دیدن ورود/خروج هر کالا در بازهٔ داده
  const movements = showMovements
    ? await prisma.$queryRaw<
        {
          date: string;
          name: string;
          op: number;
          quantity: number;
          unitPrice: number;
          stock: number;
          avg: number;
          note: string | null;
        }[]
      >`
        SELECT m.date, COALESCE(p.name, m.name) AS name, m."operationType" AS op,
               m.quantity, m."unitPrice", m.stock, m."averagePrice" AS avg, m.note
        FROM stock_movements m
        LEFT JOIN products p ON p.id = m."productId"
        WHERE m.name IS NOT NULL AND m.name <> ''
          AND (${q} = '' OR COALESCE(p.name, m.name) ILIKE ${"%" + q + "%"})
          AND (${op} = '' OR m."operationType" = ${Number(op)})
        ORDER BY m.date DESC, m."legacyId" DESC
        LIMIT 400
      `
    : [];

  const totalValue = current.reduce((a, r) => a + Number(r.value), 0);
  const totalQty = current.reduce((a, r) => a + Number(r.stock), 0);
  const outOfStock = current.filter((r) => Number(r.stock) <= 0).length;
  const shownValue = showMovements
    ? movements.reduce((a, r) => a + Number(r.stock) * Number(r.avg), 0)
    : totalValue;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">انبار</h1>
        <Link
          href="/admin/accounting"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ← داشبورد حسابداری
        </Link>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-900">
        کاتالوگ کالای نرم‌افزار قدیمی با کاتالوگ سایت اشتراک نامی ندارد، پس
        موجودی به محصولات سایت وصل نیست و با نام کالا در همان لحظهٔ ثبت نگه
        داشته شده است. ارزش موجودی بر اساس میانگین موبینگ قیمت هر کالا محاسبه
        می‌شود.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">ارزش موجودی</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {money(shownValue)}{" "}
            <span className="text-xs font-normal">تومان</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">تعداد اقلام</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {toFaDigits(showMovements ? movements.length : current.length)}
            <span className="text-xs font-normal text-gray-500">
              {showMovements ? " حرکت" : " قلم کالا"}
            </span>
          </div>
        </div>
        {!showMovements && (
          <>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xs text-gray-500">مجموع تعداد</div>
              <div className="mt-1 text-lg font-bold text-gray-900">
                {num(totalQty)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xs text-gray-500">ناموجود</div>
              <div className="mt-1 text-lg font-bold text-gray-900">
                {toFaDigits(outOfStock)}{" "}
                <span className="text-xs font-normal">قلم</span>
              </div>
            </div>
          </>
        )}
      </div>

      <form className="bg-white rounded-lg shadow p-3 flex gap-2 flex-wrap items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="جستجوی نام کالا…"
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          name="op"
          defaultValue={op}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">همهٔ عملیات</option>
          <option value="1">ورود (خرید)</option>
          <option value="2">خروج (فروش)</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          جستجو
        </button>
        <Link
          href={`/admin/accounting/stock?${new URLSearchParams({
            ...(q ? { q } : {}),
            ...(op ? { op } : {}),
            view: showMovements ? "items" : "movements",
          }).toString()}`}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          {showMovements ? "دیدن موجودی فعلی" : "دیدن گردش کامل"}
        </Link>
      </form>

      <div className="text-xs text-gray-500">
        {showMovements
          ? `${toFaDigits(movements.length)} حرکت نمایش داده می‌شود${movements.length >= 400 ? " — برای دیدن بقیه جستجو کنید" : ""}`
          : `${toFaDigits(current.length)} قلم کالا نمایش داده می‌شود`}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {showMovements ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="text-right font-normal py-2 px-3">تاریخ</th>
                <th className="text-right font-normal py-2 px-3">کالا</th>
                <th className="text-right font-normal py-2 px-3">عملیات</th>
                <th className="text-left font-normal py-2 px-3">تعداد</th>
                <th className="text-left font-normal py-2 px-3">قیمت واحد</th>
                <th className="text-left font-normal py-2 px-3">موجودی بعد</th>
                <th className="text-left font-normal py-2 px-3">میانگین</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                    {jalali(m.date)}
                    {!isPlausibleJalali(m.date) && (
                      <span className="mr-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                        روز نامعتبر
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">{m.name}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${OP_TONE[Number(m.op)] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {stockOpLabel(Number(m.op))}
                    </span>
                  </td>
                  <td
                    className={`py-2 px-3 text-left ${Number(m.quantity) >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {num(Number(m.quantity))}
                  </td>
                  <td className="py-2 px-3 text-left text-gray-600">
                    {money(Number(m.unitPrice))}
                  </td>
                  <td className="py-2 px-3 text-left text-gray-600">
                    {num(Number(m.stock))}
                  </td>
                  <td className="py-2 px-3 text-left text-gray-600">
                    {money(Number(m.avg))}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    موردی نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="text-right font-normal py-2 px-3">کالا</th>
                <th className="text-left font-normal py-2 px-3">موجودی فعلی</th>
                <th className="text-left font-normal py-2 px-3">
                  میانگین قیمت
                </th>
                <th className="text-left font-normal py-2 px-3">ارزش</th>
                <th className="text-right font-normal py-2 px-3">تعداد حرکت</th>
                <th className="text-right font-normal py-2 px-3">آخرین حرکت</th>
              </tr>
            </thead>
            <tbody>
              {current.map((r) => {
                const qty = Number(r.stock);
                return (
                  <tr
                    key={r.name}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3">{r.name}</td>
                    <td
                      className={`py-2 px-3 text-left font-medium ${qty > 0 ? "text-gray-900" : "text-red-600"}`}
                    >
                      {num(qty)}
                    </td>
                    <td className="py-2 px-3 text-left text-gray-600">
                      {money(Number(r.avg))}
                    </td>
                    <td className="py-2 px-3 text-left font-medium text-gray-900">
                      {money(Number(r.value))}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {toFaDigits(Number(r.movements))}
                    </td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                      {jalali(r.date)}
                      <span className="mr-1 text-[10px] text-gray-400">
                        {stockOpLabel(Number(r.op))}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {current.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    موردی نیست
                  </td>
                </tr>
              )}
            </tbody>
            {current.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="py-2 px-3">جمع کل</td>
                  <td className="py-2 px-3 text-left">{num(totalQty)}</td>
                  <td className="py-2 px-3 text-left text-gray-400">—</td>
                  <td className="py-2 px-3 text-left">{money(totalValue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
