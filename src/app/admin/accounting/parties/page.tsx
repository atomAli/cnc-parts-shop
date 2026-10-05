import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { money, num, balanceTone, balanceTitle, kindLabel, kindTone } from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  if (!(await requireAdmin())) redirect("/auth/login");

  const q = (sp.q ?? "").trim();
  const kind = sp.kind ?? "";

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(kind === "SUPPLIER" ? { kind: "SUPPLIER" as const }
      : kind === "CUSTOMER" ? { kind: "CUSTOMER" as const } : {}),
  };

  // مانده حساب = جمع دفتر؛ علامت مثبت یعنی بستانکار (طلب ما)
  const rows = await prisma.$queryRaw<
    { id: string; name: string; kind: string; phone: string | null; balance: number; n: number }[]
  >`
    SELECT p.id, p.name, p.kind, p.phone,
           COALESCE(SUM(l.amount), 0) AS balance,
           COUNT(l.id) AS n
    FROM parties p
    LEFT JOIN ledger_entries l ON l."partyId" = p.id
    WHERE (${q} = '' OR p.name ILIKE ${"%" + q + "%"})
      AND (${kind} = '' OR p.kind = ${kind})
    GROUP BY p.id, p.name, p.kind, p.phone
    ORDER BY ABS(COALESCE(SUM(l.amount), 0)) DESC, p.name
    LIMIT 500
  `;
  void where;

  const total = rows.reduce((a, r) => a + Number(r.balance), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">طرف حساب‌ها</h1>
        <Link href="/admin/accounting" className="text-sm text-blue-600 hover:text-blue-700">
          ← داشبورد حسابداری
        </Link>
      </div>

      <form className="bg-white rounded-lg shadow p-3 flex gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="جستجوی نام…"
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          name="kind"
          defaultValue={kind}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">همه</option>
          <option value="CUSTOMER">مشتری</option>
          <option value="SUPPLIER">تأمین‌کننده</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          جستجو
        </button>
      </form>

      <div className="text-xs text-gray-500">
        {toFaDigits(rows.length)} طرف حساب نمایش داده می‌شود
        {rows.length >= 500 && " — برای دیدن بقیه جستجو کنید"}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="text-right font-normal py-2 px-3">نام</th>
              <th className="text-right font-normal py-2 px-3">نوع</th>
              <th className="text-right font-normal py-2 px-3">تلفن</th>
              <th className="text-right font-normal py-2 px-3">تعداد سند</th>
              <th className="text-left font-normal py-2 px-3">مانده حساب</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const bal = Number(p.balance);
              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <Link href={`/admin/accounting/parties/${p.id}`} className="text-blue-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${kindTone(p.kind)}`}>
                      {kindLabel(p.kind)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600" dir="ltr">
                    {p.phone ? toFaDigits(p.phone) : "—"}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{num(Number(p.n))}</td>
                  <td className={`py-2 px-3 text-left font-medium ${balanceTone(bal)}`}>
                    {money(Math.abs(bal))}
                    <span className="text-[10px] text-gray-400 mr-1">
                      {bal === 0 ? "" : bal > 0 ? "بستانکار" : "بدهکار"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">موردی نیست</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td className="py-2 px-3" colSpan={4}>جمع کل</td>
                <td className={`py-2 px-3 text-left ${balanceTone(total)}`}>
                  {money(Math.abs(total))}
                  <span className="text-[10px] text-gray-400 mr-1">{balanceTitle(total)}</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}