const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toAsciiDigits(s: string) {
  return s.replace(/[۰-۹٠-٩]/g, (c) => {
    const fa = FA_DIGITS.indexOf(c);
    return String(fa >= 0 ? fa : AR_DIGITS.indexOf(c));
  });
}

function toFaDigits(s: string) {
  return s.replace(/[0-9٠-٩]/g, (c) => {
    const d = /[0-9]/.test(c) ? Number(c) : AR_DIGITS.indexOf(c);
    return FA_DIGITS[d];
  });
}

export function searchVariants(term: string) {
  const q = term.trim();
  return { q, ascii: toAsciiDigits(q), fa: toFaDigits(q) };
}