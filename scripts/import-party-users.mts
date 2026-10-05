/**
 * ساخت حساب کاربری سایت برای طرف حساب‌های نرم‌افزار حسابداری.
 *
 *   npx tsx scripts/import-party-users.mts --dry-run
 *   npx tsx scripts/import-party-users.mts
 *
 * چرا: طرف حساب‌های واردشده از Access فقط یک رکورد «طرف حساب» بودند و جز
 * یک مورد هیچ‌کدام حساب کاربری نداشتند، پس مشتری نمی‌توانست وارد سایت شود
 * و فاکتورهای خودش را ببیند.
 *
 * قواعد:
 *  • تلفن کلید یکتاست، پس برای هر شماره فقط یک حساب ساخته می‌شود؛
 *    ۷ شماره بین دو طرف حساب مشترک است و آن‌ها به یک حساب وصل می‌شوند
 *  • رمز تصادفی برای همه یکسان است (مهم نبود) و پس از اجرا چاپ می‌شود
 *  • اجرای دوباره امن است — طرف حسابی که userId دارد دوباره ساخته نمی‌شود
 *  • طرف حساب‌های بدون تلفن حساب نمی‌گیرند چون ورود سایت با تلفن است
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { normalizePhone } from "../src/lib/phone";

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
        l.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    })
);

const log = (...a: unknown[]) => console.log(...a);
const fa = (n: number) => Math.round(n).toLocaleString("fa-IR");

function cuid(): string {
  // همان الگوی cuid پریسما: ۲۵ کاراکتر با زمان شروع. برای درج مستقیم SQL لازم داریم.
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const rand = (n: number) =>
    Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
  return `c${Date.now().toString(36)}${rand(9)}`;
}

// ─────────────────────────── اتصال ───────────────────────────

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();

// ─────────────────────────── بررسی اولیه ───────────────────────────

const existing = await db.query<{ phone: string }>(
  `SELECT phone FROM users WHERE phone IS NOT NULL`,
);
const existingUserPhones = new Set(existing.rows.map((r) => normalizePhone(r.phone ?? "")));

const { rows: parties } = await db.query<{
  id: string;
  name: string;
  kind: string;
  phone: string | null;
  address: string | null;
  nationalCode: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  userId: string | null;
}>(
  `SELECT id, name, kind, phone, address, "nationalCode", "postalCode",
          city, province, "userId"
   FROM parties ORDER BY "legacyId"`,
);

// فقط مشتری‌ها حساب کاربری می‌گیرند؛ تأمین‌کننده وارد سایت خرید نمی‌شود.
const CUSTOMERS = new Set(["CUSTOMER", "BOTH"]);

// یک شمارهٔ تلفن ممکن است بین چند طرف حساب مشترک باشد، ولی تلفن کلید یکتاست؛
// پس اولین طرف حساب (قدیمی‌ترین) صاحب حساب می‌شود و بقیه فقط گزارش می‌شوند.
const byPhone = new Map<string, typeof parties>();
const noPhone: typeof parties = [];
const alreadyLinked: typeof parties = [];
const collide: typeof parties = [];
const duplicates: typeof parties = [];

for (const p of parties) {
  if (!CUSTOMERS.has(p.kind)) continue;
  if (p.userId) {
    alreadyLinked.push(p);
    continue;
  }
  const phone = normalizePhone(p.phone ?? "");
  if (!phone) {
    noPhone.push(p);
    continue;
  }
  // شماره از قبل برای یکی از کاربران خود سایت ثبت شده
  if (existingUserPhones.has(phone)) {
    collide.push(p);
    continue;
  }
  // شماره را قبلاً یک مشتری دیگر گرفته — تلفن کلید یکتاست
  if (byPhone.has(phone)) {
    duplicates.push(p);
    continue;
  }
  byPhone.set(phone, [p]);
}

const toCreate = [...byPhone.values()].map((g) => g[0]);

log(`طرف حساب مشتری      : ${fa(parties.filter((p) => CUSTOMERS.has(p.kind)).length)}`);
log(`از قبل حساب‌دار     : ${fa(alreadyLinked.length)}`);
log(`تلفنش با کاربر سایت یکی است : ${fa(collide.length)}`);
log(`تلفن تکراری بین مشتری‌ها: ${fa(duplicates.length)}`);
log(`بدون تلفن           : ${fa(noPhone.length)}`);
log(`حساب قابل ساخت      : ${fa(toCreate.length)}`);

if (collide.length > 0) {
  log(`\nتلفنشان با یکی از کاربران فعلی سایت یکی است (حساب نمی‌گیرند):`);
  for (const p of collide) log(`  • ${p.name} → ${p.phone}`);
}
if (duplicates.length > 0) {
  log(`\nتلفن تکراری بین مشتری‌ها (به حساب نفر اول وصل می‌شوند):`);
  for (const p of duplicates) log(`  • ${p.name} → ${p.phone}`);
}

if (noPhone.length > 0) {
  log(`\nبدون تلفن (حساب نمی‌گیرند چون ورود با تلفن است):`);
  for (const p of noPhone) log(`  • ${p.name}`);
}
if (DRY_RUN) {
  log(`\nحالت آزمایشی — هیچ تغییری اعمال نشد.`);
  await db.end();
  process.exit(0);
}

// ─────────────────────────── ساخت حساب‌ها ───────────────────────────

const password = randomBytes(9).toString("base64url");
log(`\nرمز تصادفی ساخته شد (در انتها چاپ می‌شود)…`);

let done = 0;
await db.query("BEGIN");
try {
  for (const p of toCreate) {
    const phone = normalizePhone(p.phone ?? "");
    const hashed = await bcrypt.hash(password, 10);
    const userId = cuid();
    await db.query(
      `INSERT INTO users (id, name, phone, password, role, "isActive",
                          address, "nationalCode", city, province, "postalCode",
                          "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,'USER',true,$5,$6,$7,$8,$9, now(), now())`,
      [
        userId, p.name, phone, hashed,
        p.address, p.nationalCode, p.city, p.province, p.postalCode,
      ],
    );
    await db.query(`UPDATE parties SET "userId" = $1, "updatedAt" = now() WHERE id = $2`, [
      userId, p.id,
    ]);
    done++;
    if (done % 25 === 0) log(`  ${fa(done)} حساب ساخته شد…`);
  }
  await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
}

const check = await db.query<{ n: number }>(
  `SELECT count(*) FROM users WHERE phone IS NOT NULL`,
);

log(`\n${fa(done)} حساب ساخته شد.`);
log(`مجموع کاربران دارای تلفن: ${fa(Number(check.rows[0].n))}`);
log(`\n──────────────`);
log(`رمز عبور همهٔ حساب‌ها: ${password}`);
log(`ورود با شماره تلفن است؛ رمز برای همه یکسان است.`);
log(`پس از اولین ورود بهتر است رمز را عوض کنند.`);

await db.end();