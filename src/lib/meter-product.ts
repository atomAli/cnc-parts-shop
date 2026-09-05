interface ProductInput {
  name: string;
  subcategory?: string | null;
  isMeter?: boolean | null;
}

export function isRailOrScrew(product: ProductInput): boolean {
  if (product.isMeter === true) return true;
  if (product.isMeter === false) return false;

  const name = (product.name || "").trim();
  const sub = product.subcategory || "";

  if (sub !== "linear-guide" && sub !== "ball-screw") return false;

  if (sub === "linear-guide") {
    return name.includes("ریل");
  }

  if (sub === "ball-screw") {
    if (name.includes("مهره") || name.includes("ساپورت")) return false;
    return name.startsWith("بالسکرو") || name.startsWith("پیچ بال اسکرو");
  }

  return false;
}

const FA_NUM: Record<string, number> = {
  "یک": 1, "۱": 1, "دو": 2, "۲": 2, "سه": 3, "۳": 3,
  "چهار": 4, "۴": 4, "پنج": 5, "۵": 5, "شش": 6, "۶": 6,
  "هفت": 7, "۷": 7, "هشت": 8, "۸": 8, "نه": 9, "۹": 9, "ده": 10, "۱۰": 10,
};

export function getProductMaxLength(product: ProductInput): number {
  const name = (product.name || "").trim();

  const cmMatch = name.match(/[-_](\d+)\s*(?:CM|cm)\b/);
  if (cmMatch) return parseInt(cmMatch[1], 10);

  const lMatch = name.match(/[-_]L(\d{2,})\b/i);
  if (lMatch) return parseInt(lMatch[1], 10);

  const persianM = name.match(/(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|۱|۲|۳|۴|۵|۶|۷|۸|۹|۱۰)\s*متری\b/);
  if (persianM) {
    const num = FA_NUM[persianM[1]];
    if (num) return num * 100;
  }

  if (/مینیاتوری|Miniature|MGNR|MGWR|\bMGN\b|\bMGW\b/i.test(name)) return 100;

  return 400;
}
