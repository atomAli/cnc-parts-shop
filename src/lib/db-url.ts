/**
 * `pg` نسخهٔnew هشدار میدهد که sslmode=require|prefer|verify-ca عملاً برابر verify-full است.
 * رفتار فعلی دقیقاً همان verify-full است، پس آن را صریح میکنیم تا هشدار حذف شود.
 * اگر کسی عمداً uselibpqcompat=true گذاشته باشد، رفتار libpq حفظ میشود.
 */
export function normalizeDatabaseUrl(url: string | undefined): string {
  const fallback = "postgresql://localhost:5432/cncparts";
  if (!url) return fallback;
  if (/[?&]uselibpqcompat=true(?:&|$)/i.test(url)) return url;
  return url.replace(
    /([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/gi,
    "$1verify-full",
  );
}
