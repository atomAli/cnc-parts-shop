interface ProductInput {
  name: string;
  subcategory?: string | null;
}

export function isRailOrScrew(product: ProductInput): boolean {
  const name = (product.name || "").trim();
  const sub = product.subcategory || "";

  if (sub !== "linear-guide" && sub !== "ball-screw") return false;

  if (sub === "linear-guide") {
    return name.includes("ریل");
  }

  if (sub === "ball-screw") {
    if (name.includes("مهره") || name.includes("ساپورت")) return false;
    return name.startsWith("بالسکرو");
  }

  return false;
}

export function getProductMaxLength(product: ProductInput): number {
  const name = (product.name || "").trim();

  const cmMatch = name.match(/[-_](\d+)\s*(?:CM|cm)\b/);
  if (cmMatch) return parseInt(cmMatch[1], 10);

  const lMatch = name.match(/[-_]L(\d{2,})\b/i);
  if (lMatch) return parseInt(lMatch[1], 10);

  if (/مینیاتوری|Miniature|MGNR|MGWR|\bMGN\b|\bMGW\b/i.test(name)) return 100;

  return 400;
}
