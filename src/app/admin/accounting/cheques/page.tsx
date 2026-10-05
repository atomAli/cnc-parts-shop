import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { money, num, jalali, chequeStatusLabel } from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function ChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  if (!(await requireAdmin())) redirect("/auth/login");

  const view = sp.view ?? "all";
  const onlyArchived = view === "archived";
  const onlyCurrent = view === "current";

  const rows = await prisma.cheque.findMany({
    where: onlyArchived ? { archived: true } : onlyCurrent ? { archived: false } : {},
    orderBy: [{ dueDate: "desc" }, { legacyId: "desc" }],
    include: { party: { select: { id: true, name: true } } },
  });

  const byStatus = new Map<string, { n: number; amount: number }>();
  for (const c of rows) {
    const k = String(c.status ?? "null");
    const cur = byStatus.get(k) ?? { n: 0, amount: 0 };
    cur.n++; cur.amount += c.amount;
    byStatus.set(k, cur);
  }
  const total = rows.reduce((a, c) => a + c.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">چک‌ها</h1>
        <Link href="/admin/accounting" className="text-sm text-blue-600 hover:text-blue-700">
          ← داشبورد حسابداری
        </Link>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-gray-700">
        کدهای وضعیت چک در نرم‌افزار قدیمی فقط عدد بودند و هیچ جدول مرجعی در فایل
        وجود ندارد (جدول <span dir="ltr">Cheque_Logs</span> هم خالی است)، بنابراین
        معنی کدها قابل استخراج نبود. کد خام حفظ شده تا بتوانید بعداً بر اساس
        روال واقعی کسب‌وکار برچسب فارسی به آن بدهید.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...byStatus.entries()].map(([code, s]) => (
          <div key={code} className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">{chequeStatusLabel(code === "null" ? null : Number(code))}</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{money(s.amount)}</div>
            <div className="text-[11px] text-gray-500">{num(s.n)} فقره</div>
          </div>
        ))}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">جمع کل</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{money(total)}</div>
          <div className="text-[11px] text-gray-500">{num(rows.length)} فقره</div>
        </div>
      </div>

      <form className="bg-white rounded-lg shadow p-3 flex gap-2">
        <select name="view" defaultValue={view} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="all">همهٔ چک‌ها</option>
          <option value="current">فقط چک‌های جاری (نه بایگانی)</option>
          <option value="archived">فقط بایگانی‌شده</option>
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
              <th className="text-right font-normal py-2 px-3">شماره چک</th>
              <th className="text-right font-normal py-2 px-3">سررسید</th>
              <th className="text-right font-normal py-2 px-3">طرف حساب</th>
              <th className="text-right font-normal py-2 px-3">بانک</th>
              <th className="text-right font-normal py-2 px-3">وضعیت</th>
              <th className="text-left font-normal py-2 px-3">مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3" dir="ltr">{c.number ?? "—"}</td>
                <td className="py-2 px-3 text-gray-600">{jalali(c.dueDate)}</td>
                <td className="py-2 px-3">
                  {c.party ? (
                    <Link href={`/admin/accounting/parties/${c.party.id}`} className="text-gray-800 hover:underline">
                      {c.party.name}
                    </Link>
                  ) : "—"}
                </td>
                <td className="py-2 px-3 text-gray-600">{c.bankName ?? "—"}</td>
                <td className="py-2 px-3 text-xs text-gray-600">
                  {chequeStatusLabel(c.status)}
                  {c.archived && <span className="text-gray-400"> · بایگانی</span>}
                  {c.isSettled && <span className="text-gray-400"> · تسویه</span>}
                </td>
                <td className="py-2 px-3 text-left font-medium">{money(c.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500">چکی یافت نشد</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td className="py-2 px-3" colSpan={5}>جمع کل</td>
                <td className="py-2 px-3 text-left">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="text-xs text-gray-500">
        شمارهٔ فاکتور: {toFaDigits(rows.length)} ردیف نمایش داده شد
      </div>
    </div>
  );
}