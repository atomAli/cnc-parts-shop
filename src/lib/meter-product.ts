interface MeterProductInput {
  name: string;
  subcategory?: string | null;
}

export function isMeterProduct(product: MeterProductInput): boolean {
  const name = (product.name || "").trim();
  const sub = product.subcategory || "";

  if (sub !== "linear-guide" && sub !== "ball-screw") return false;

  const hasFixedLength = /\bL\d{2,}\b/i.test(name) || /\d+\s*(cm|mm)\b/i.test(name);
  if (hasFixedLength) return false;

  if (sub === "linear-guide") {
    return name.includes("ریل");
  }

  if (sub === "ball-screw") {
    if (name.includes("مهره") || name.includes("ساپورت")) return false;
    return name.startsWith("بالسکرو");
  }

  return false;
}

export function isMiniatureMeter(product: MeterProductInput): boolean {
  return /مینیاتوری|Miniature|MGNR|MGWR|\bMGN|\bMGW/i.test(product.name || "");
}

export function getMeterBaseLength(product: MeterProductInput): number {
  return isMiniatureMeter(product) ? 100 : 400;
}