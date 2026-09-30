const FA_DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGITS[d] ?? d);
}

export function kWFromName(name: string): number | null {
  const n = normalizeDigits(name);
  if (/یک کیلووات/.test(n)) return 1;
  const m = n.match(/(\d+[.,]?\d*)\s*w?\s*(کیلووات|کیلو وات|کیلووات|وات|kw|KW|kW)/);
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  if (Number.isNaN(value)) return null;
  return m[2] === "وات" ? value / 1000 : value;
}