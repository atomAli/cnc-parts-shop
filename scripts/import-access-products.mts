/**
 * وارد کردن کالاهای نرم‌افزار حسابداری SHIK به جدول محصولات سایت.
 *
 *   npx tsx scripts/import-access-products.mts --dry-run
 *   npx tsx scripts/import-access-products.mts
 *
 * چرا: فاکتورهای قدیمی برای نمایش در «مدیریت فاکتورها» به قالب سایت تبدیل
 * می‌شوند و آن قالب در هر ردیف به productId و slug واقعی محصول نیاز دارد.
 * کاتالوگ Access با کاتالوگ سایت اشتراک نامی ندارد (۷ تطبیق از ۷۴۵)، پس
 * کالاها جداگانه وارد می‌شوند.
 *
 * این محصولات active=false هستند؛ یعنی از فهرست فروشگاه، جستجو، صفحهٔ محصول
 * و sitemap حذف می‌شوند و فقط در پنل مدیریت دیده می‌شوند.
 *
 * قواعد:
 *  • اجرای دوباره امن است — روی products.legacyGoodId به‌روزرسانی می‌شود
 *  • قیمت از CostLevel شمارهٔ ۳ («نقدی») خوانده می‌شود که با قیمت واقعی
 *    ردیف فاکتورهای فروش مطابقت دارد؛ قیمت Access ریال است و ÷۱۰ می‌شود
 *  • اسلاگ یونیکدآگاه ساخته می‌شود چون تابع اسلاگ پنل مدیریت حرف فارسی را
 *    حذف می‌کند و با اسلاگ‌های واقعی سایت نخواند
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

// ─────────────────────────── تنظیمات ───────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FILE =
  args.find((a) => a.startsWith("--file="))?.slice(7) ??
  process.env.ACCESS_FILE ??
  "/Users/aliarjmandi/Downloads/1405-07-13[17-59]1405-Ver2.93.acc";

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
/** فایل Access ریال است؛ سایت تومان. */
const rial = (v: unknown): number => Math.round(num(v) / 10);
const fa = (n: number) => Math.round(n).toLocaleString("fa-IR");

function cuid(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const rand = (n: number) =>
    Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
  return `c${Date.now().toString(36)}${rand(9)}`;
}

/**
 * خواندن CSV با درست — mdb-export فیلدهایی دارد که داخلشان کاما یا خط‌جدید
 * است، پس تجزیهٔ ساده کافی نیست و باید مثل RFC 4180 خوانده شود.
 */
function readCsv(table: string): Record<string, string>[] {
  const raw = execFileSync("mdb-export", [FILE, table], {
    maxBuffer: 1 << 28,
  }).toString();
  const rows: string[] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) {
      if (c === '"' && raw[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // بی‌اثر
    } else if (c === "\n") {
      row.push(field);
      rows.push(row.join("\t"));
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row.join("\t"));
  }
  const header = rows.shift()!.split("\t");
  return rows
    .filter((r) => r.trim() !== "")
    .map((r) => {
      const cells = r.split("\t");
      return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    });
}

/** اسلاگ یونیکدآگاه — حرف فارسی و ارقام را نگه می‌دارد، مثل اسلاگ‌های واقعی سایت */
function slugify(name: string): string {
  return name
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_.]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────── خواندن Access ───────────────────────────

const goods = readCsv("Goods");
const groups = readCsv("Good_Groups");
const units = readCsv("Units");
const costList = readCsv("CostList");

const groupName = new Map(groups.map((g) => [g.ID, g.Name]));
const unitName = new Map(units.map((u) => [u.ID, u.Name]));

/** قیمت فروش: CostLevel ۳ («نقدی» با CostType=1) — با ردیف فاکتورها می‌خواند */
const sellPrice = new Map<string, number>();
const anyPrice = new Map<string, number>();
for (const c of costList) {
  const p = num(c.Price);
  if (!p) continue;
  const cur = anyPrice.get(c.Good_ID);
  if (cur === undefined || p > cur) anyPrice.set(c.Good_ID, p);
  if (c.CostLevel_ID === "3") sellPrice.set(c.Good_ID, p);
}

// ─────────────────────────── اتصال ───────────────────────────

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();

// آخرین موجودی هر کالا از کارتکس
const stockRows = await db.query<{ legacyGoodId: number; stock: number }>(
  `SELECT DISTINCT ON ("legacyGoodId") "legacyGoodId", stock
   FROM stock_movements
   WHERE "legacyGoodId" IS NOT NULL
   ORDER BY "legacyGoodId", "date" DESC, "legacyId" DESC`,
);
const stockOf = new Map(
  stockRows.rows.map((r) => [r.legacyGoodId, num(r.stock)]),
);

const existing = await db.query<{
  id: string;
  legacyGoodId: number | null;
  slug: string;
}>(
  `SELECT id, "legacyGoodId", slug FROM products WHERE "legacyGoodId" IS NOT NULL`,
);
const existingByGood = new Map(
  existing.rows.map((r) => [Number(r.legacyGoodId), r]),
);

const takenSlugs = new Set(
  (await db.query<{ slug: string }>(`SELECT slug FROM products`)).rows.map(
    (r) => r.slug,
  ),
);

// دستهٔ مادر برای این کالاها — غیرفعال تا در فهرست دسته‌های سایت هم دیده نشود
const PARENT_NAME = "کالاهای نرم‌افزار حسابداری (تاریخی)";
let parentId = (
  await db.query<{ id: string }>(`SELECT id FROM categories WHERE name = $1`, [
    PARENT_NAME,
  ])
).rows[0]?.id;
if (!parentId && !DRY_RUN) {
  parentId = cuid();
  await db.query(
    `INSERT INTO categories (id, name, slug, active, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,false, now(), now())`,
    [parentId, PARENT_NAME, slugify(PARENT_NAME)],
  );
  log(`دسته ساخته شد: ${PARENT_NAME}`);
}

// ─────────────────────────── آماده‌سازی ───────────────────────────

type Row = {
  goodId: number;
  name: string;
  rawName: string;
  brand: string;
  slug: string;
  price: number;
  stock: number;
  isMeter: boolean;
  group: string;
  groupId: number;
  update: boolean;
};

const prepared: Row[] = [];
const noName: typeof goods = [];
const dupName = new Map<string, number>();
const usedSlug = new Map<string, number>();

// شمارش نام‌ها تا بدانیم کدام کالا برند/منشأ متفاوت دارد
for (const g of goods) {
  const n = (g.Name ?? "").trim();
  if (n) dupName.set(n, (dupName.get(n) ?? 0) + 1);
}

for (const g of goods) {
  const rawName = (g.Name ?? "").trim();
  if (!rawName) {
    noName.push(g);
    continue;
  }
  const goodId = Math.trunc(num(g.ID));

  // ستون Unit1_ID در عمل برند/منشأ کالا است (China، HIWIN، SKF، …) و برای
  // ۴۲ نامِ تکراری تنها تفاوت همین است؛ پس فقط در آن حالت به نام اضافه می‌شود
  // تا در پنل مدیریت قابل تشخیص باشند.
  const label = (unitName.get(g.Unit1_ID) ?? "").trim();
  const name =
    (dupName.get(rawName) ?? 0) > 1 && label && label !== "عدد"
      ? `${rawName} (${label})`
      : rawName;

  let slug = slugify(name);
  if (!slug) slug = `good-${goodId}`;
  // نام کالا در Access یکتاست ولی اسلاگ ممکن است با محصول موجود سایت یا با
  // کالای دیگری یکی شود، پس شمارهٔ کالا را فقط در صورت نیاز اضافه می‌کنیم
  if (takenSlugs.has(slug) || usedSlug.has(slug)) {
    const prior = existingByGood.get(goodId);
    if (!prior) slug = `${slug}-${goodId}`;
  }
  usedSlug.set(slug, goodId);
  takenSlugs.add(slug);

  const unit = unitName.get(g.Unit1_ID) ?? "";
  prepared.push({
    goodId,
    name,
    rawName,
    slug,
    price: rial(sellPrice.get(g.ID) ?? anyPrice.get(g.ID) ?? 0),
    stock: Math.trunc(stockOf.get(goodId) ?? 0),
    isMeter: unit.includes("متر"),
    brand: label && label !== "عدد" ? label : "",
    group: groupName.get(g.Group_ID) ?? "—",
    groupId: Math.trunc(num(g.Group_ID)),
    update: existingByGood.has(goodId),
  });
}

const repeated = [...dupName.entries()].filter(([, n]) => n > 1);

log(`کالا در Access        : ${fa(goods.length)}`);
log(`بدون نام             : ${fa(noName.length)}`);
log(`قابل درج             : ${fa(prepared.length)}`);
log(`قبلاً واردشده         : ${fa(prepared.filter((r) => r.update).length)}`);
log(`قیمت‌دار             : ${fa(prepared.filter((r) => r.price > 0).length)}`);
log(
  `بدون قیمت            : ${fa(prepared.filter((r) => r.price <= 0).length)}`,
);
log(`موجودی دارند         : ${fa(prepared.filter((r) => r.stock > 0).length)}`);
log(`فروش متری           : ${fa(prepared.filter((r) => r.isMeter).length)}`);
if (repeated.length > 0) {
  log(
    `\nنام تکراری در Access: ${fa(repeated.length)} نام، ${fa(repeated.reduce((a, [, c]) => a + c - 1, 0))} رکورد`,
  );
  log(`(برند/منشأ به نام اضافه شد تا نسخه‌های هم‌نام قابل تشخیص باشند)`);
}
log(`\nقیمت کل فهرست: ${fa(prepared.reduce((a, r) => a + r.price, 0))} تومان`);
log(`موجودی کل: ${fa(prepared.reduce((a, r) => a + r.stock, 0))} عدد`);

if (DRY_RUN) {
  log(`\nحالت آزمایشی — هیچ تغییری اعمال نشد.`);
  await db.end();
  process.exit(0);
}

// ─────────────────────────── درج ───────────────────────────

if (!parentId) throw new Error("دستهٔ مادر ساخته نشد");

let done = 0;
await db.query("BEGIN");
try {
  for (const r of prepared) {
    const parts = [`گروه: ${r.group}`];
    if (r.brand) parts.push(`برند/منشأ: ${r.brand}`);
    if (r.name !== r.rawName)
      parts.push(
        `در نرم‌افزار با نام «${r.rawName}» ثبت شده و این رکورد برای تفکیک نسخه‌های هم‌نام جدا شده است`,
      );
    const desc =
      `کالای واردشده از نرم‌افزار حسابداری SHIK — ${parts.join(" | ")}. ` +
      `برای نگه‌داری سابقه و اتصال به فاکتورهای قدیمی وارد شده و در سایت نمایش داده نمی‌شود.`;
    if (r.update) {
      await db.query(
        `UPDATE products SET name=$1, slug=$2, price=$3, stock=$4, "isMeter"=$5,
                description=$6, active=false, "updatedAt"=now()
         WHERE "legacyGoodId"=$7`,
        [r.name, r.slug, r.price, r.stock, r.isMeter, desc, r.goodId],
      );
    } else {
      await db.query(
        `INSERT INTO products (id, name, slug, description, price, stock, "isMeter",
                               active, "categoryId", "legacyGoodId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$9, now(), now())`,
        [
          cuid(),
          r.name,
          r.slug,
          desc,
          r.price,
          r.stock,
          r.isMeter,
          parentId,
          r.goodId,
        ],
      );
    }
    done++;
    if (done % 100 === 0) log(`  ${fa(done)} کالا…`);
  }
  await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
}

// ─────────────────────────── اتصال رکوردهای قبلی ───────────────────────────

await db.query("BEGIN");
try {
  for (const table of [
    "stock_movements",
    "sales_invoice_lines",
    "purchase_invoice_lines",
  ]) {
    const res = await db.query(
      `UPDATE ${table} AS t SET "productId" = p.id
       FROM products p
       WHERE t."legacyGoodId" IS NOT NULL
         AND p."legacyGoodId" = t."legacyGoodId"
         AND t."productId" IS DISTINCT FROM p.id`,
    );
    log(`${table}: ${fa(res.rowCount ?? 0)} ردیف وصل شد`);
  }
  await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
}

const check = await db.query<{ n: string }>(
  `SELECT count(*)::text AS n FROM products WHERE active = false`,
);
log(`\n${fa(done)} کالا ثبت شد.`);
log(`مجموع محصولات غیرفعال در سایت: ${fa(num(check.rows[0].n))}`);
log(
  `همهٔ این محصولات active=false هستند، پس در فروشگاه، جستجو و sitemap دیده نمی‌شوند.`,
);

await db.end();
