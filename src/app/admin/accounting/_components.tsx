import Link from "next/link";
import { money, num, jalali, isPlausibleJalali } from "@/lib/accounting";
import { toFaDigits } from "@/lib/phone";

export type InvoiceRow = {
  id: string;
  number: number;
  date: string | null;
  total: number;
  discount: number;
  status: string;
  party: { id: string; name: string } | null;
};

/** جدول مشترک فاکتورهای فروش و خرید */
export function InvoiceTable({
  rows, baseHref, emptyText,
}: {
  rows: InvoiceRow[]; baseHref: string; emptyText: string;
}) {
  const sum = rows.reduce((a, r) => a + r.total, 0);
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
            <th className="text-right font-normal py-2 px-3">شماره</th>
            <th className="text-right font-normal py-2 px-3">تاریخ</th>
            <th className="text-right font-normal py-2 px-3">طرف حساب</th>
            <th className="text-right font-normal py-2 px-3">تخفیف</th>
            <th className="text-right font-normal py-2 px-3">وضعیت</th>
            <th className="text-left font-normal py-2 px-3">مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3">
                <Link href={`${baseHref}/${r.id}`} className="text-blue-600 hover:underline">
                  {toFaDigits(r.number)}
                </Link>
              </td>
              <td className="py-2 px-3 text-gray-600">{jalali(r.date)}</td>
              <td className="py-2 px-3">
                {r.party ? (
                  <Link
                    href={`/admin/accounting/parties/${r.party.id}`}
                    className="text-gray-800 hover:underline"
                  >
                    {r.party.name}
                  </Link>
                ) : "—"}
              </td>
              <td className="py-2 px-3 text-gray-600">{r.discount ? money(r.discount) : "—"}</td>
              <td className="py-2 px-3">
                <span
                  className={
                    r.status === "CANCELLED"
                      ? "px-2 py-0.5 rounded text-xs bg-red-100 text-red-800"
                      : "px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                  }
                >
                  {r.status === "CANCELLED" ? "لغو شده" : "قطعی"}
                </span>
              </td>
              <td className="py-2 px-3 text-left font-medium">{money(r.total)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-gray-500">{emptyText}</td></tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-medium">
              <td className="py-2 px-3" colSpan={5}>
                جمع {num(rows.length)} فاکتور نمایش‌داده‌شده
              </td>
              <td className="py-2 px-3 text-left">{money(sum)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export type LineRow = {
  id: string;
  position: number;
  name: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

/** نمای کامل یک فاکتور با ردیف‌ها */
export function InvoiceDetail({
  invoice, lines, baseHref, kindLabel,
}: {
  invoice: {
    id: string; number: number; date: string | null; deliveryDate: string | null;
    total: number; discount: number; status: string; note: string | null;
    party: { id: string; name: string; phone: string | null } | null;
  };
  lines: LineRow[];
  baseHref: string;
  kindLabel: string;
}) {
  const linesSum = lines.reduce((a, l) => a + l.total, 0);
  const diff = invoice.total - linesSum;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {kindLabel} شماره {toFaDigits(invoice.number)}
        </h1>
        <Link href={baseHref} className="text-sm text-blue-600 hover:text-blue-700">
          ← بازگشت
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1">تاریخ</div>
            <div>
              {jalali(invoice.date)}
              {!isPlausibleJalali(invoice.date) && (
                <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                  روزِ نامعتبر در فایل اصلی
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">سررسید / تحویل</div>
            <div>{jalali(invoice.deliveryDate)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">طرف حساب</div>
            {invoice.party ? (
              <Link
                href={`/admin/accounting/parties/${invoice.party.id}`}
                className="text-blue-600 hover:underline"
              >
                {invoice.party.name}
              </Link>
            ) : "—"}
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">وضعیت</div>
            <div>{invoice.status === "CANCELLED" ? "لغو شده" : "قطعی"}</div>
          </div>
        </div>
        {invoice.note && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
            توضیح: {invoice.note}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="text-right font-normal py-2 px-3">ردیف</th>
              <th className="text-right font-normal py-2 px-3">کالا</th>
              <th className="text-left font-normal py-2 px-3">تعداد</th>
              <th className="text-left font-normal py-2 px-3">فی (تومان)</th>
              <th className="text-left font-normal py-2 px-3">تخفیف</th>
              <th className="text-left font-normal py-2 px-3">مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 px-3 text-gray-500">{toFaDigits(l.position)}</td>
                <td className="py-2 px-3 text-gray-800">{l.name ?? "—"}</td>
                <td className="py-2 px-3 text-left">{num(l.quantity)}</td>
                <td className="py-2 px-3 text-left">{money(l.unitPrice)}</td>
                <td className="py-2 px-3 text-left">{l.discount ? money(l.discount) : "—"}</td>
                <td className="py-2 px-3 text-left font-medium">{money(l.total)}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500">ردیفی ثبت نشده</td></tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="py-2 px-3" colSpan={5}>جمع ردیف‌ها</td>
              <td className="py-2 px-3 text-left">{money(linesSum)}</td>
            </tr>
            <tr>
              <td className="py-2 px-3" colSpan={5}>تخفیف کل فاکتور</td>
              <td className="py-2 px-3 text-left">{invoice.discount ? money(invoice.discount) : "—"}</td>
            </tr>
            <tr className="font-bold">
              <td className="py-2 px-3" colSpan={5}>مبلغ نهایی</td>
              <td className="py-2 px-3 text-left">{money(invoice.total)}</td>
            </tr>
            {diff !== 0 && (
              <tr>
                <td className="py-2 px-3 text-xs text-gray-500" colSpan={6}>
                  اختلاف جمع ردیف‌ها با مبلغ نهایی: {money(diff)} تومان
                  (از گرد کردن جداگانهٔ هر قیمت هنگام تبدیل ریال به تومان)
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}