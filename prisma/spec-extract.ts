export type RawProduct = {
  url: string;
  title: string;
  price: number | null;
  cid: number | null;
  short_description: string[];
  long_description: string;
  specifications?: Record<string, string> | null;
};

const NUM = "([\\d]+(?:[.,]\\d+)?)";
const MM = "میلی[\\s]*متر";

type Rule = {
  re: RegExp;
  key: string | ((m: RegExpExecArray) => string);
  fmt?: (m: RegExpExecArray) => string;
};

const RULES: Rule[] = [
  { re: new RegExp(`^نام کامل[:：]?\\s*(.+)`), key: "نام کامل" },
  { re: /^کد\s*درایو\s*[:：]?\s*(.+)/, key: "کد درایو" },
  { re: /^مدل\s*[:：]?\s*(.+)/, key: "مدل" },
  { re: /^سری\s*[:：]?\s*(.+)/, key: "سری" },
  {
    re: new RegExp(`^(?:توان خروجی|توان|قدرت الکتروموتور|قدرت)\\s*[:：]?\\s*${NUM}\\s*(کw|کیلووات|KW|Kw|kW|kw|K.W|وات|W)\\s*\\/?\\s*${NUM}\\s*(کw|کیلووات|KW|Kw|kW|kw|K.W)`),
    key: "توان",
    fmt: (m) => `${m[1].replace(".", "،")} ${m[2]}${m[3] ? ` / ${m[3].replace(".", "،")} ${m[4]}` : ""}`,
  },
  { re: new RegExp(`^(?:توان خروجی|توان|قدرت الکتروموتور|قدرت)\\s*[:：]?\\s*${NUM}\\s*(کw|کیلووات|KW|Kw|kW|kw|K.W|وات|W|Kg|کیلوگرم)`), key: "توان", fmt: (m) => `${m[1].replace(".", "،")} ${m[2]}` },
  { re: new RegExp(`^دور\\s*[:：]?\\s*${NUM}\\s*(?:RPM|rpm|Rpm|دور در دقیقه)?`), key: "دور", fmt: (m) => `${m[1]} RPM` },
  { re: new RegExp(`^فرکانس\\s*[:：]?\\s*${NUM}`), key: "فرکانس", fmt: (m) => `${m[1]} هرتز` },
  { re: new RegExp(`^ولتاژ\\s*[:：]?\\s*${NUM}\\s*ولت`), key: "ولتاژ", fmt: (m) => `${m[1]} ولت` },
  { re: new RegExp(`^قطر\\s*(?:ساپورت مهره)\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "قطر ساپورت", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^قطر\\s*(داخلی|خارجی)\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: (r) => `قطر ${r[1]}`, fmt: (m) => `${m[2]} میلی متر` },
  { re: new RegExp(`^قطر\\s*[:：]?\\s*${NUM}\\s*(?:${MM}|mm)`), key: "قطر", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^عرض\\s*ریل\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "عرض", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^عرض\\s*(داخلی|خارجی)\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: (r) => `عرض ${r[1]}`, fmt: (m) => `${m[2]} میلی متر` },
  { re: new RegExp(`^عرض\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "عرض", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^ارتفاع\\s*(داخلی|خارجی)\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: (r) => `ارتفاع ${r[1]}`, fmt: (m) => `${m[2]} میلی متر` },
  { re: new RegExp(`^ارتفاع\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "ارتفاع", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^طول\\s*(?:شانه)?\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "طول", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^ابعاد\\s*[:：]?\\s*([\\d.]+)\\s*×\\s*([\\d.]+)${MM}`), key: "ابعاد", fmt: (m) => `${m[1]} × ${m[2]} میلی متر` },
  { re: /^سایز\s*[:：]?\s*([\d]+)/, key: "سایز" },
  { re: new RegExp(`^نسبت\\s*[:：]?\\s*${NUM}\\s*به\\s*${NUM}`), key: "نسبت", fmt: (m) => `${m[1]} به ${m[2]}` },
  { re: new RegExp(`^شفت\\s*ورودی\\s*[:：]?\\s*${NUM}`), key: "شفت ورودی", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^شفت\\s*خروجی\\s*[:：]?\\s*${NUM}`), key: "شفت خروجی", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^شفت\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "شفت", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^فلنج\\s*ورودی\\s*[:：]?\\s*${NUM}`), key: "فلنج ورودی", fmt: (m) => `${m[1]} میلی متر` },
  { re: new RegExp(`^گشتاور\\s*[:：]?\\s*${NUM}\\s*(?:N\\.m|N\\.M|Nm)`), key: "گشتاور", fmt: (m) => `${m[1]} N.m` },
  { re: /^کولت\s*[:：]?\s*ER\s*([\d]+)/, key: "کولت", fmt: (m) => `ER${m[1]}` },
  { re: /^کانال\s*[:：]?\s*(.+)/, key: "کانال" },
  { re: /^جنس\s*بدنه\s*[:：]?\s*(.+)/, key: "جنس بدنه" },
  { re: new RegExp(`^پیچ مورد استفاده\\s*[:：]?\\s*(M[\\d]+(?:M[\\d]+)?)`), key: "پیچ مورد استفاده" },
  { re: new RegExp(`^نوع و سایز پیچ مورد استفاده\\s*[:：]?\\s*(M[\\d]+)`), key: "پیچ مورد استفاده", fmt: (m) => `M${m[1].replace("M", "")}` },
  { re: new RegExp(`^مناسب برای مهره بال اسکرو قطر\\s*[:：]?\\s*${NUM}\\s*mm`), key: "مناسب برای مهره", fmt: (m) => `قطر ${m[1]} میلی متر` },
  { re: new RegExp(`^مناسب برای مهره بال اسکرو\\s*[:：]?\\s*(.+)`), key: "مناسب برای مهره" },
  { re: new RegExp(`^حداکثر طول شاخه\\s*[:：]?\\s*${NUM}`), key: "حداکثر طول شاخه", fmt: (m) => `${m[1]} سانتی متر` },
  { re: new RegExp(`^شعاع خمش\\s*[:：]?\\s*${NUM}\\s*${MM}`), key: "شعاع خمش", fmt: (m) => `${m[1]} میلی متر` },
  { re: /^نوع\s*[:：]?\s*(تک فاز|سه فاز)/, key: "نوع" },
  { re: /^نوع\s*[:：]?\s*(ترمزدار|ساده|بدون ترمز)/, key: "نوع" },
  { re: /^(آب خنک|هوا خنک|آبخنک|هواخنک)/, key: "نوع خنک کاری", fmt: (m) => (m[1].includes("هوا") ? "هوا خنک" : "آب خنک") },
  { re: new RegExp(`^ساخت کشور\\s*[:：]?\\s*(.+)`), key: "کشور سازنده" },
  { re: new RegExp(`^ساخت\\s*[:：]?\\s*(چین|تایوان|آلمان|کره|ترکیه|ایتالیا|ژاپن|چک)`), key: "کشور سازنده" },
];

const INFO_CUES =
  /(دارای|شامل|با|بدون|قابلیت|استفاده|مناسب|جنس|ورودی|خروجی|کنترل|پورت|پروتکل|حافظه|ولتاژ|جریان|دور در دقیقه|RPM|میکرو|Mbar|M.Bar|متر مکعب|نویز|میکرومتر|کیلوگرم|استاندارد|طراحی|سفارشی)/;

function isInformative(t: string): boolean {
  return t.length >= 6 && INFO_CUES.test(t);
}

export function extractSpecs(raw: RawProduct): Record<string, string> {
  const specs: Record<string, string> = {};
  const extras: string[] = [];

  for (const item of raw.short_description || []) {
    const t = (item || "").replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");
    if (!t) continue;

    const colon = t.match(/^(.{1,40}?):\s*(.+)$/);
    if (colon) {
      const key = colon[1].trim();
      const value = colon[2].trim();
      if (key && value && !specs[key]) {
        specs[key] = value;
        continue;
      }
    }

    let matched = false;
    for (const rule of RULES) {
      const m = rule.re.exec(t);
      if (m) {
        const key = typeof rule.key === "function" ? rule.key(m) : rule.key;
        const value = rule.fmt ? rule.fmt(m) : m[1];
        if (!specs[key]) {
          specs[key] = value;
          matched = true;
          break;
        }
      }
    }
    if (!matched && isInformative(t)) extras.push(t);
  }

  if (extras.length) specs["سایر ویژگی ها"] = extras.join("، ");

  if (Object.keys(specs).length === 0 && raw.specifications) {
    const real = Object.entries(raw.specifications).filter(([, v]) => String(v).trim() !== "");
    if (real.length) Object.assign(specs, Object.fromEntries(real));
  }

  return specs;
}