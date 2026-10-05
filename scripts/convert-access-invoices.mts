/**
 * تبدیل فاکتورهای فروش قدیمی به قالب فاکتور خود سایت.
 *
 *   npx tsx scripts/convert-access-invoices.mts --dry-run
 *   npx tsx scripts/convert-access-invoices.mts
 *
 * چرا: فاکتورهای نرم‌افزار حسابداری قبلاً فقط در ماژول حسابداری (جدول
 * sales_invoices) بودند و در «مدیریت فاکتورها» سایت دیده نمی‌شدند. این اسکریپت
 * همان ۴۸ فاکتور را به pre_invoices تبدیل می‌کند تا مشتری بتواند با حساب
 * کاربری خودش وارد سایت شود و سابقهٔ خریدش را ببیند.
 *
 * نکته‌ها:
 *  • شمارهٔ فاکتور همان شمارهٔ سریال نرم‌افزار قدیمی است (۱۴۵۰۵۱ تا ۱۴۷۵۶۱)
 *    که با ۱۵ فاکتور فعلی سایت تداخل ندارد
 *  • اقلام به productId محصولات واردشده وصل می‌شوند، ولی نام و قیمت همان لحظهٔ
 *    فروش نگه داشته می‌شود تا سابقه تغییر نکند
 *  • مشتریانی که حساب کاربری دارند به فاکتور وصل می‌شوند
 *  • اجرای دوباره امن است — روی invoiceNumber به‌روزرسانی می‌شود
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

// ─────────────────────────── تنظیمات ───────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);

const log = (...a: unknown[]) => console.log(...a);
const num = (v: unknown): number => {
  const n =
    typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fa = (n: number) => Math.round(n).toLocaleString("fa-IR");
const jDate = (v: string): Date | null => jalaliToDate((v ?? "").trim());

// ─────────────────────────── تبدیل تاریخ شمسی ───────────────────────────
// Postgres تاریخ شمسی را نمی‌شناسد و حتی اگر بخواند، ماه‌های نامعتبری مثل
// «۱۴۰۵/۰۲/۳۰» که در خود فایل نرم‌افزار هست خطا می‌دهند. پس اینجا تبدیل
// می‌کنیم. الگوریتم با شش تاریخ شمسی شناخته‌شده اعتبارسنجی شده است.

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - b * Math.floor(a / b);
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < bl; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  return { gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  // اگر ماه میلادی ژانویه یا فوریه باشد، سال میلادی یکی کمتر است.
  // نوشتن «۸ منهای gm» مهم است؛ با فرمول اشتباه، فاکتورهای فروردین و اردیبهشت
  // یک سال جلوتر (۲۰۲۷) ثبت می‌شدند.
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** «۱۴۰۵/۰۷/۱۳» → تاریخ میلادی در UTC (ساعت ۱۲ ظهر تا به‌خاطر اختلاف منطقهٔ زمانی جابه‌جا نشود) */
function jalaliToDate(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(s);
  if (!m) return null;
  const r = jalCal(Number(m[1]));
  const jdn =
    g2d(r.gy, 3, r.march) +
    (Number(m[2]) - 1) * 31 -
    div(Number(m[2]), 7) * (Number(m[2]) - 7) +
    Number(m[3]) -
    1;
  const g = d2g(jdn);
  return new Date(Date.UTC(g.gy, g.gm - 1, g.gd, 12, 0, 0));
}

function cuid(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const rand = (n: number) =>
    Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
  return `c${Date.now().toString(36)}${rand(9)}`;
}

// ─────────────────────────── خواندن داده ───────────────────────────

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();

const { rows: invoices } = await db.query<{
  id: string;
  legacyId: number | null;
  number: string;
  date: string | null;
  total: number;
  discount: number;
  status: string;
  partyName: string;
  partyPhone: string | null;
  userId: string | null;
  note: string | null;
}>(
  `SELECT s.id, s."legacyId", s.number, s.date, s.total, s.discount, s.status,
          p.name AS "partyName", p.phone AS "partyPhone", p."userId", s.note
   FROM sales_invoices s
   JOIN parties p ON p.id = s."partyId"
   ORDER BY s."legacyId"`,
);

const { rows: lines } = await db.query<{
  invoiceId: string;
  position: number;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  productId: string | null;
  slug: string | null;
  legacyGoodId: number | null;
}>(
  `SELECT l."invoiceId", l.position, l.name, l.quantity, l."unitPrice",
          l.discount, l.total, l."productId", p.slug, l."legacyGoodId"
   FROM sales_invoice_lines l
   LEFT JOIN products p ON p.id = l."productId"
   ORDER BY l."invoiceId", l.position`,
);

const linesByInvoice = new Map<string, typeof lines>();
for (const l of lines) {
  const arr = linesByInvoice.get(l.invoiceId) ?? [];
  arr.push(l);
  linesByInvoice.set(l.invoiceId, arr);
}

const existing = new Set(
  (
    await db.query<{ invoiceNumber: number }>(
      `SELECT "invoiceNumber" FROM pre_invoices`,
    )
  ).rows.map((r) => Number(r.invoiceNumber)),
);

// ─────────────────────────── آماده‌سازی ───────────────────────────

type Prepared = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  userId: string | null;
  address: string | null;
  totalPrice: number;
  status: string;
  source: string;
  notes: string;
  createdAt: Date | null;
  items: unknown[];
};

const prepared: Prepared[] = [];
const problems: string[] = [];
let missingProduct = 0;
let noPhone = 0;
let noAccount = 0;

for (const inv of invoices) {
  const number = num(inv.legacyId);
  if (!number) {
    problems.push(`فاکتور ${inv.number} شمارهٔ سریال ندارد`);
    continue;
  }
  const invLines = linesByInvoice.get(inv.id) ?? [];
  const lineSum = invLines.reduce((a, l) => a + num(l.total), 0);
  // تخفیف سربرگ در نرم‌افزار قدیمی روی کل فاکتور اعمال می‌شد و در هیچ ردیفی
  // نیامده بود. اینجا بین ردیف‌ها به نسبت پخش می‌شود تا جمع اقلام دقیقاً
  // برابر مبلغ فاکتور شود؛ وگرنه در صفحهٔ فاکتور جمع ردیف‌ها با مبلغ نهایی
  // نمی‌خواند (در یک فاکتور ۳۳۳ میلیون تومان اختلاف داشت).
  const headerDiscount = num(inv.discount);

  let allocated = 0;
  const items = invLines.map((l, idx) => {
    if (!l.productId || !l.slug) missingProduct++;
    const share =
      headerDiscount > 0 && lineSum > 0
        ? idx === invLines.length - 1
          ? headerDiscount - allocated
          : Math.round((num(l.total) / lineSum) * headerDiscount)
        : 0;
    allocated += share;
    const effective = num(l.total) - share;
    const quantity = num(l.quantity);
    // برای کالای متری قیمت باید بر واحد باشد نه کل مقدار
    const unitPrice = quantity > 0 ? effective / quantity : 0;
    return {
      name: l.name,
      slug: l.slug ?? "",
      price: Math.round(unitPrice),
      unitPrice: Math.round(unitPrice),
      quantity,
      ...(l.productId ? { productId: l.productId } : {}),
      ...(l.legacyGoodId ? { legacyGoodId: l.legacyGoodId } : {}),
    };
  });

  if (!inv.partyPhone) noPhone++;
  if (!inv.userId) noAccount++;

  prepared.push({
    id: cuid(),
    number,
    customerName: inv.partyName,
    customerPhone: inv.partyPhone ?? "",
    userId: inv.userId,
    address: null,
    totalPrice: inv.total,
    status: "DONE",
    source: "ACCESS",
    notes:
      `فاکتور شمارهٔ ${inv.number} از نرم‌افزار حسابداری قدیمی — تاریخ ${inv.date ?? "?"}` +
      (inv.note ? ` — ${inv.note}` : ""),
    createdAt: jDate(inv.date ?? ""),
    items,
  });
}

const toCreate = prepared.filter((p) => !existing.has(p.number));
const toUpdate = prepared.filter((p) => existing.has(p.number));

log(`فاکتور فروش در ماژول حسابداری : ${fa(invoices.length)}`);
log(`قابل تبدیل                 : ${fa(prepared.length)}`);
log(`درج جدید                   : ${fa(toCreate.length)}`);
log(`شمارهٔ تکراری (به‌روزرسانی)  : ${fa(toUpdate.length)}`);
log(
  `مجموع مبلغ                 : ${fa(toCreate.reduce((a, p) => a + p.totalPrice, 0))} تومان`,
);
log(`بدون حساب کاربری            : ${fa(noAccount)} فاکتور`);
log(`مشتری بدون تلفن            : ${fa(noPhone)} فاکتور`);
log(
  `قلم بدون محصول             : ${fa(missingProduct)} از ${fa(lines.length)}`,
);

// راستی‌آزمایی: مجموع اقلام باید با مبلغ فاکتور بخواند
let mismatch = 0;
let worst = 0;
for (const p of prepared) {
  const sum = (p.items as { quantity: number; price: number }[]).reduce(
    (a, i) => a + i.quantity * i.price,
    0,
  );
  const diff = Math.abs(sum - p.totalPrice);
  if (diff > 1) {
    mismatch++;
    worst = Math.max(worst, diff);
  }
}
log(
  `اختلاف بیش از ۱ تومان با مبلغ فاکتور: ${fa(mismatch)} فاکتور (بیشترین ${fa(worst)})`,
);
const freeInvoices = prepared.filter(
  (p) => p.totalPrice === 0 && p.items.length > 0,
).length;
if (freeInvoices > 0)
  log(
    `فاکتورهای کاملاً تخفیف‌خورده (مبلغ صفر ولی دارای اقلام): ${fa(freeInvoices)}`,
  );

if (problems.length > 0) {
  log(`\nمشکل‌ها:`);
  for (const p of problems) log(`  • ${p}`);
}

if (DRY_RUN) {
  log(`\nحالت آزمایشی — هیچ تغییری اعمال نشد.`);
  await db.end();
  process.exit(0);
}

// ─────────────────────────── درج ───────────────────────────

let done = 0;
await db.query("BEGIN");
try {
  for (const p of prepared) {
    const items = JSON.stringify(p.items);
    if (existing.has(p.number)) {
      await db.query(
        `UPDATE pre_invoices
         SET "customerName"=$1, "customerPhone"=$2, "userId"=$3, items=$4::json,
             "totalPrice"=$5, status=$6, source=$7, notes=$8,
             "createdAt"=COALESCE($9::timestamptz, "createdAt")
         WHERE "invoiceNumber"=$10`,
        [
          p.customerName,
          p.customerPhone,
          p.userId,
          items,
          p.totalPrice,
          p.status,
          p.source,
          p.notes,
          p.createdAt,
          p.number,
        ],
      );
    } else {
      await db.query(
        `INSERT INTO pre_invoices (id, "invoiceNumber", "customerName", "customerPhone",
                                   "userId", address, items, "totalPrice", status, source,
                                   notes, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7::json,$8,$9,$10,$11,
                 COALESCE($12::timestamptz, now()))`,
        [
          p.id,
          p.number,
          p.customerName,
          p.customerPhone,
          p.userId,
          p.address,
          items,
          p.totalPrice,
          p.status,
          p.source,
          p.notes,
          p.createdAt,
        ],
      );
    }
    done++;
  }
  await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
}

const check = await db.query<{ n: string; s: string }>(
  `SELECT count(*)::text AS n, COALESCE(round(sum("totalPrice"))::text,'0') AS s
   FROM pre_invoices WHERE source = 'ACCESS'`,
);
log(`\n${fa(done)} فاکتور ثبت شد.`);
log(
  `مجموع فاکتورهای تبدیل‌شده: ${fa(num(check.rows[0].n))} فاکتور، ${fa(num(check.rows[0].s))} تومان`,
);
log(`منبع آن‌ها source='ACCESS' است تا از فاکتورهای واقعی سایت تفکیک شوند.`);

await db.end();
