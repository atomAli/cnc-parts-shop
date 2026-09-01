const FA_ALEF = /[\u0622\u0623\u0625\u0671\u0627]/g;
const ARABIC_YEH = /[\u064A\u06CC]/g;
const ARABIC_KAF = /[\u0643\u06A9]/g;
const TEH_MARBUTA = /[\u0629\u0647]/g;
const PERSIAN_DIGITS = /[۰-۹]/g;
const ZWNJ_AND_NBSP = /[\u200C\u00A0\u200B\u200D]/g;
const MULTI_SPACE = /\s{2,}/g;
const PUNCT = /[^\w\s\u0600-\u06FF]/g;
const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function normalizeFa(input: string): string {
  if (!input) return "";
  return input
    .replace(PERSIAN_DIGITS, (d) => DIGIT_MAP[d])
    .replace(FA_ALEF, "ا")
    .replace(ARABIC_YEH, "ی")
    .replace(ARABIC_KAF, "ک")
    .replace(TEH_MARBUTA, "ه")
    .replace(ZWNJ_AND_NBSP, " ")
    .replace(PUNCT, " ")
    .replace(MULTI_SPACE, " ")
    .trim()
    .toLowerCase();
}

export function tokenize(input: string): string[] {
  return (normalizeFa(input) || "").split(/\s+/).filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev.splice(0, prev.length, ...cur);
  }
  return prev[b.length];
}

const SYNONYM_GROUPS: string[][] = [
  ["پمپ", "pump"],
  ["وکیوم", "vacuum"],
  ["اسپیندل", "spindle"],
  ["موتور", "motor"],
  ["بلبرینگ", "bearing"],
  ["سکرو", "screw"],
  ["ریل", "rail"],
  ["خطی", "linear"],
  ["واگن", "guide"],
  ["کنترلر", "controller"],
  ["درایو", "drive"],
  ["اینورتر", "inverter", "vfd"],
  ["کوپلینگ", "coupling"],
  ["گیربکس", "gearbox"],
  ["لیزر", "laser"],
  ["جک", "jack"],
  ["انکودر", "encoder"],
  ["استپ", "step"],
  ["سروموتور", "servo", "servo-motor"],
  ["سروو", "servo"],
  ["کابل", "cable"],
  ["کلید", "switch"],
  ["دنده", "gear", "rack"],
  ["شانه", "rack"],
  ["شفت", "shaft"],
  ["پروفیل", "profile"],
  ["الکتروموتور", "electromotor"],
  ["چرخ", "wheel"],
  ["جعبه", "box"],
  ["تلگرافی", "encoder"],
  ["اسلیپ", "slip"],
  ["رینگ", "ring"],
];

const EXPANDED: Record<string, string[]> = {};
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    EXPANDED[term] = group.filter((g) => g !== term);
  }
}

export function expansionsOf(term: string): string[] {
  return [term, ...(EXPANDED[term] || [])];
}

export interface SearchTarget {
  name: string;
  sku?: string | null;
  brandName?: string;
  categoryName?: string;
}

export function scoreQuery(query: string, target: SearchTarget): number {
  const nq = normalizeFa(query);
  const name = normalizeFa(target.name);
  const brandName = normalizeFa(target.brandName || "");
  const categoryName = normalizeFa(target.categoryName || "");
  const sku = normalizeFa(target.sku || "");
  const terms = tokenize(nq);

  if (!name || terms.length === 0) return 0;

  let score = 0;

  if (name === nq) return 1000;
  if (name.startsWith(nq)) score += 900;
  else if (name.includes(nq)) score += 800;

  if (sku && sku.includes(nq)) score += 700;
  if (sku && nq.includes(sku) && nq.length >= 2) score += 650;

  const nameTokens = tokenize(name);

  let directHits = 0;
  let prefixHits = 0;
  let fuzzyHits = 0;
  let brandHits = 0;
  let catHits = 0;
  let anyHit = false;

  for (const term of terms) {
    const exps = expansionsOf(term);
    let termHit = false;

    const inName = exps.some((e) => name.includes(e));
    if (inName) {
      directHits++;
      termHit = true;
      score += 200;
    }

    if (exps.some((e) => brandName.includes(e))) {
      brandHits++;
      score += 150;
    }
    if (exps.some((e) => categoryName.includes(e))) {
      catHits++;
      score += 100;
    }

    if (!termHit) {
      const prefix = nameTokens.some((nt) => exps.some((e) => nt.startsWith(e)));
      if (prefix) {
        prefixHits++;
        termHit = true;
        score += 120;
      }
    }

    if (!termHit) {
      const fuzzy = nameTokens.some((nt) =>
        exps.some((e) => {
          if (e.length < 3 || nt.length < 3 || nt === e) return false;
          const dist = levenshtein(nt, e);
          return dist <= (e.length >= 6 ? 2 : 1);
        })
      );
      if (fuzzy) {
        fuzzyHits++;
        termHit = true;
        score += 200;
      }
    }

    if (termHit) anyHit = true;
  }

  const matchedHits = directHits + prefixHits + fuzzyHits;
  if (matchedHits === terms.length) score += 240;
  else if (matchedHits >= Math.ceil(terms.length / 2)) score += 120;

  if (!anyHit && brandHits + catHits === 0) return 0;

  return score;
}