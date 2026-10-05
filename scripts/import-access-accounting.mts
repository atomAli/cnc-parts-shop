/**
 * ایمپورت داده‌های حسابداری از نرم‌افزار SHIK (Microsoft Access) به دیتابیس سایت.
 *
 *   npx tsx scripts/import-access-accounting.mts --dry-run
 *   npx tsx scripts/import-access-accounting.mts
 *
 * قواعد:
 *  • اجرای دوباره امن است — روی legacyId به‌روزرسانی می‌کند، رکورد تکراری نمی‌سازد
 *  • مبالغ Access «ریال» است و به «تومان» تبدیل می‌شود (÷۱۰) تا با کل سایت یکی باشد
 *  • تاریخ‌ها شمسی «YYYY/MM/DD» می‌مانند؛ عرض ثابت دارند پس ترتیب لغوی = زمانی
 *  • طرف حساب‌ها با تلفن به کاربران سایت وصل می‌شوند (Party.userId)
 *  • ردیف‌های فاکتور کلید یکتا ندارند، پس هر بار کامل پاک و از نو درج می‌شوند
 *
 * کدهای VoucherType که از خود فایل Access استخراج و تأیید شده:
 *   Transactions (دفتر اشخاص):  ۰=مانده اول دوره، ۲۰=دریافت، ۲۵=پرداخت،
 *                               ۳۰=فاکتور فروش، ۳۱=تخفیف فروش، ۴۰=فاکتور خرید، ۴۱=تخفیف خرید
 *   TransactionsCash (صندوق):   ۰=مانده اول دوره، ۶=دریافت، ۷=پرداخت
 *   TransactionsBank (بانک):    ۰=مانده اول دوره
 */

import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { normalizePhone } from "../src/lib/phone";

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
        l.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    })
);

// ─────────────────────────── کمکی‌ها ───────────────────────────

const log = (...a: unknown[]) => console.log(...a);
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
/** فایل Access ریال است؛ سایت تومان. */
const rial = (v: unknown): number => Math.round(num(v) / 10);
const int = (v: unknown): number => Math.trunc(num(v));
const fa = (n: number) => Math.round(n).toLocaleString("fa-IR");

/** تاریخ‌ها گاهی متن تزئینی دارند (مثل «────────») که باید null شوند */
const date = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return /^\d{4}\/\d{2}\/\d{2}$/.test(s) ? s : null;
};
const text = (v: unknown): string | null => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s || null;
};
/** نام طرف حساب: «شرکت» + «مستر ماشین» */
const personName = (r: Record<string, string>): string => {
  const first = text(r.Fname);
  const last = text(r.Lname) ?? "";
  const prefix = text(r.Perfix);
  if (first && last) return `${first} ${last}`;
  return [prefix, first, last].filter(Boolean).join(" ") || `شماره ${r.ID}`;
};

// ─────────────────────── خواندن CSV از Access ───────────────────────

/** پارسر RFC 4180 — نام کالا و توضیحات داخل خودشان کاما و خط جدید دارند */
function parseCsv(src: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const header = (rows.shift() ?? []).map((h) => h.replace(/^﻿/, "").trim());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const cache = new Map<string, Record<string, string>[]>();
function table(name: string): Record<string, string>[] {
  const hit = cache.get(name);
  if (hit) return hit;
  let rows: Record<string, string>[] = [];
  try {
    const csv = execFileSync("mdb-export", [FILE, name], {
      maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString("utf8");
    rows = parseCsv(csv);
  } catch {
    log(`  ⚠ ${name} خوانده نشد`);
  }
  cache.set(name, rows);
  return rows;
}

// archived و isSettled در schema از نوع Boolean هستند و pg آن‌ها را می‌پذیرد
type Cell = string | number | boolean | Date | null;

// Prisma مقدار cuid() را سمت کلاینت می‌سازد، نه دیتابیس. چون این اسکریپت با
// SQL خام درج می‌کند، خودمان id می‌سازیم — دقیقاً مثل همان الگوریتم.
const ALPHA = "abcdefghijklmnopqrstuvwxyz";
let cuidCounter = 0;
function cuid(): string {
  const t = Date.now().toString(36).padStart(8, "0");
  const c = (cuidCounter++).toString(36).padStart(4, "0");
  const r1 = randomBytes(8).toString("hex");
  const sig = `${r1[0]}${ALPHA[parseInt(r1[1], 16) % 26]}${r1.slice(2, 8)}`;
  void randomUUID;
  return `${t}${c}${sig}`;
}

/** درج/به‌روزرسانی گروهی روی کلید یکتا (پیش‌فرض: legacyId) */
async function upsert(
  db: Client,
  tbl: string,
  cols: string[],
  rows: Cell[][],
  updateCols: string[],
  conflict: string[] = ["legacyId"]
): Promise<number> {
  if (!rows.length) return 0;
  let done = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400);
    const params: Cell[] = [];
    const tuples = batch.map((r) => {
      const ph = r.map((v) => { params.push(v); return `$${params.length}`; });
      return `(${ph.join(",")})`;
    });
    const sets = updateCols.map((c) => `"${c}"=EXCLUDED."${c}"`).join(",");
    await db.query(
      `INSERT INTO ${tbl} (${cols.map((c) => `"${c}"`).join(",")})
       VALUES ${tuples.join(",")}
       ON CONFLICT (${conflict.map((c) => `"${c}"`).join(",")}) DO UPDATE SET ${sets}`,
      params
    );
    done += batch.length;
  }
  return done;
}

/** جایگزینی کامل ردیف‌ها (این جدول‌ها فقط از Access پر می‌شوند) */
async function replaceLines(
  db: Client,
  tbl: string,
  lineCols: string[],
  rows: Cell[][],
  idMap: Map<number, string>
): Promise<number> {
  await db.query(`DELETE FROM ${tbl}`);
  if (!rows.length) return 0;
  const q = lineCols.map((c) => `"${c}"`).join(",");
  let done = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400);
    const params: Cell[] = [];
    const tuples = batch.map((r) => {
      const invId = idMap.get(int(r[1])) ?? "";
      // r[0]=شناسهٔ خودِ ردیف، r[1]=شناسهٔ فاکتور قدیمی (فقط برای نگاشت)
      const cells = [r[0], ...r.slice(2)];
      const ph = cells.map((v) => { params.push(v); return `$${params.length}`; });
      params.push(invId);
      return `(${ph.join(",")},$${params.length})`;
    });
    await db.query(
      `INSERT INTO ${tbl} ("id", ${q}, "invoiceId") VALUES ${tuples.join(",")}`,
      params
    );
    done += batch.length;
  }
  return done;
}

const groupBy = <T, K extends string | number>(
  rows: T[],
  key: (r: T) => K
): Map<K, T[]> => {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const cur = m.get(k);
    if (cur) cur.push(r);
    else m.set(k, [r]);
  }
  return m;
};

// ─────────────────────────── شروع ───────────────────────────

log(`\n▌ منبع : ${FILE.split("/").pop()}`);
log(`▌ حالت : ${DRY_RUN ? "خشک — هیچ تغییری ذخیره نمی‌شود" : "نوشتن روی دیتابیس"}\n`);

const db = new Client({ connectionString: env.DATABASE_URL });
await db.connect();
log("▌ اتصال به دیتابیس برقرار شد\n");

const totals: Record<string, { rows: number; rial: number }> = {};
const R = (k: string, rialValue = 0, rows = 1) => {
  totals[k] ??= { rows: 0, rial: 0 };
  totals[k].rows += rows;
  totals[k].rial += rialValue;
};

try {
  await db.query("BEGIN");

  // ── ۱) انبار، صندوق، بانک ─────────────────────────────────
  log("۱) انبار، صندوق و بانک");

  const warehouses = await upsert(
    db, "warehouses", ["id", "legacyId", "name"],
    table("Stores").map((r) => [cuid(), int(r.ID), text(r.Name) ?? `انبار ${r.ID}`]),
    ["name"]
  );
  const cashBoxes = await upsert(
    db, "cash_boxes", ["id", "legacyId", "name", "openingBalance"],
    table("Cashes").map((r) => [cuid(), int(r.ID), text(r.Name) ?? `صندوق ${r.ID}`, 0]),
    ["name", "openingBalance"]
  );
  const bankAccounts = await upsert(
    db, "bank_accounts",
    ["id", "legacyId", "name", "branch", "account", "sheba", "cardNumber", "openingBalance"],
    table("Banks").map((r) => [
      cuid(), int(r.ID), text(r.Name) ?? `بانک ${r.ID}`, text(r.Branch), text(r.Account),
      text(r.ShabaNo), text(r.CardNumber), 0,
    ]),
    ["name", "branch", "account", "sheba", "cardNumber", "openingBalance"]
  );
  log(`   انبار ${warehouses} · صندوق ${cashBoxes} · بانک ${bankAccounts}`);

  // ── ۲) طرف حساب ──────────────────────────────────────────
  log("۲) طرف حساب‌ها");
  const persons = table("Persons");
  const byPhone = new Map<string, string>();
  for (const u of (await db.query(
    `SELECT id, phone FROM users WHERE phone IS NOT NULL`
  )).rows) {
    const p = normalizePhone(u.phone ?? "");
    if (p) byPhone.set(p, u.id);
  }

  let linked = 0;
  const partyRows: Cell[][] = persons.map((r) => {
    const phone = normalizePhone(r.Mobile || r.Tel || "");
    const uid = phone ? byPhone.get(phone) : undefined;
    if (uid) linked++;
    return [
      cuid(), int(r.ID), personName(r),
      int(r.PersonType_ID) === 2 ? "SUPPLIER" : "CUSTOMER",
      phone || null, text(r.Address), text(r.NationalCode), text(r.PostalCode),
      text(r.BankName), text(r.BankBranch), text(r.BankAccount),
      0, uid ?? null, new Date(),
    ];
  });
  const parties = await upsert(
    db, "parties",
    ["id", "legacyId", "name", "kind", "phone", "address", "nationalCode", "postalCode",
     "bankName", "bankBranch", "bankAccount", "openingBalance", "userId", "updatedAt"],
    partyRows,
    ["name", "kind", "phone", "address", "nationalCode", "postalCode", "bankName",
     "bankBranch", "bankAccount", "userId", "updatedAt"]
  );
  log(`   ${parties} طرف حساب · ${linked} نفر به حساب سایت وصل شد`);

  const partyMap = new Map<number, string>();
  for (const r of (await db.query(
    `SELECT id, "legacyId" FROM parties WHERE "legacyId" IS NOT NULL`
  )).rows) partyMap.set(int(r.legacyId), r.id);

  // ── ۳) فاکتور فروش ────────────────────────────────────────
  log("۳) فاکتورهای فروش");
  const goodsName = new Map<number, string>();
  for (const g of table("Goods")) goodsName.set(int(g.ID), text(g.Name) ?? `کالا ${g.ID}`);

  const saleHeads = table("SaleInvoices");
  const saleByInv = groupBy(table("SaleInvoice_Details"), (l) => l.SaleInvoice_ID);

  const saleHeadRows: Cell[][] = [];
  const saleLineRows: Cell[][] = [];
  for (const h of saleHeads) {
    let sub = 0;
    for (const l of saleByInv.get(h.ID) ?? []) {
      // تخفیف مطلق و درصدی هر دو روی یک ردیف پر شده‌اند؛ فقط مطلق کم می‌شود
      const qty = num(l.Count);
      const unit = rial(l.Price);
      const disc = rial(l.Discount);
      const total = Math.round(qty * unit - disc);
      sub += total;
      saleLineRows.push([
        cuid(), int(h.ID), int(l.Row), goodsName.get(int(l.Good_ID)) ?? null,
        qty, unit, disc, total, int(l.Good_ID) || null,
      ]);
    }
    const total = sub - rial(h.Discount);
    R("فروش", total);
    saleHeadRows.push([
      cuid(), int(h.ID), int(h.ID), date(h.RegDate), date(h.DeliveryDate),
      rial(h.Discount), total,
      int(h.Cancellation) ? "CANCELLED" : "DONE",
      text(h.Description), partyMap.get(int(h.PRN_ID)) ?? null,
    ]);
  }
  const saleHeadsN = await upsert(
    db, "sales_invoices",
    ["id", "legacyId", "number", "date", "deliveryDate", "discount", "total", "status", "note", "partyId"],
    saleHeadRows,
    ["number", "date", "deliveryDate", "discount", "total", "status", "note", "partyId"]
  );
  const saleIdMap = new Map<number, string>();
  for (const r of (await db.query(
    `SELECT id, "legacyId" FROM sales_invoices WHERE "legacyId" IS NOT NULL`
  )).rows) saleIdMap.set(int(r.legacyId), r.id);
  const saleLines = await replaceLines(
    db, "sales_invoice_lines",
    ["position", "name", "quantity", "unitPrice", "discount", "total", "legacyGoodId"],
    saleLineRows, saleIdMap
  );
  log(`   ${saleHeadsN} فاکتور · ${saleLines} ردیف · ${fa(totals["فروش"]!.rial)} تومان`);

  // ── ۴) فاکتور خرید ───────────────────────────────────────
  log("۴) فاکتورهای خرید");
  const buyHeads = table("BuyInvoices");
  const buyByInv = groupBy(table("BuyInvoice_Details"), (l) => l.BuyInvoice_ID);

  const buyHeadRows: Cell[][] = [];
  const buyLineRows: Cell[][] = [];
  for (const h of buyHeads) {
    let sub = 0;
    for (const l of buyByInv.get(h.ID) ?? []) {
      const qty = num(l.Count);
      const unit = rial(l.Price);
      const disc = rial(l.Discount);
      const total = Math.round(qty * unit - disc);
      sub += total;
      buyLineRows.push([
        cuid(), int(h.ID), int(l.Row), goodsName.get(int(l.Good_ID)) ?? null,
        qty, unit, disc, total, int(l.Good_ID) || null,
      ]);
    }
    const total = sub - rial(h.Discount);
    R("خرید", total);
    buyHeadRows.push([
      cuid(), int(h.ID), int(h.ID), date(h.RegDate), date(h.DeliveryDate),
      rial(h.Discount), total, "DONE", text(h.Description),
      partyMap.get(int(h.PRN_ID)) ?? null,
    ]);
  }
  const buyHeadsN = await upsert(
    db, "purchase_invoices",
    ["id", "legacyId", "number", "date", "deliveryDate", "discount", "total", "status", "note", "partyId"],
    buyHeadRows,
    ["number", "date", "deliveryDate", "discount", "total", "status", "note", "partyId"]
  );
  const buyIdMap = new Map<number, string>();
  for (const r of (await db.query(
    `SELECT id, "legacyId" FROM purchase_invoices WHERE "legacyId" IS NOT NULL`
  )).rows) buyIdMap.set(int(r.legacyId), r.id);
  const buyLines = await replaceLines(
    db, "purchase_invoice_lines",
    ["position", "name", "quantity", "unitPrice", "discount", "total", "legacyGoodId"],
    buyLineRows, buyIdMap
  );
  log(`   ${buyHeadsN} فاکتور · ${buyLines} ردیف · ${fa(totals["خرید"]!.rial)} تومان`);

  // ── ۵) دریافت و پرداخت ────────────────────────────────────
  log("۵) دریافت و پرداخت");
  const cashBoxId = (await db.query(
    `SELECT id FROM cash_boxes ORDER BY "legacyId" NULLS LAST LIMIT 1`
  )).rows[0]?.id ?? null;

  const recvRows: Cell[][] = table("Recives").map((r) => {
    const amt = rial(r.CashPrice);
    R("دریافت", amt);
    return [
      cuid(), int(r.ID), "RECEIPT", date(r.RegDate), amt, rial(r.Discount),
      text(r.Comment) ?? text(r.Description), int(r.ID), cashBoxId,
      partyMap.get(int(r.PRN_ID)) ?? null,
    ];
  });
  const receipts = await upsert(
    db, "cash_movements",
    ["id", "legacyId", "kind", "date", "amount", "discount", "note", "voucher", "cashBoxId", "partyId"],
    recvRows,
    ["kind", "date", "amount", "discount", "note", "voucher", "cashBoxId", "partyId"],
    ["kind", "legacyId"]
  );

  const payRows: Cell[][] = table("Pays").map((r) => {
    const amt = rial(r.CashPrice);
    R("پرداخت", amt);
    return [
      cuid(), int(r.ID), "PAYMENT", date(r.RegDate), amt, rial(r.Discount),
      text(r.Comment) ?? text(r.Description), int(r.ID), cashBoxId,
      partyMap.get(int(r.ReciverPerson_ID)) ?? null,
    ];
  });
  const payments = await upsert(
    db, "cash_movements",
    ["id", "legacyId", "kind", "date", "amount", "discount", "note", "voucher", "cashBoxId", "partyId"],
    payRows,
    ["kind", "date", "amount", "discount", "note", "voucher", "cashBoxId", "partyId"],
    ["kind", "legacyId"]
  );
  log(`   ${receipts} دریافت · ${payments} پرداخت`);

  // ── ۶) گردش حساب اشخاص ───────────────────────────────────
  log("۶) گردش حساب طرف حساب‌ها");
  const ledgerRows: Cell[][] = [];
  const missingParties = new Set<number>();
  const byVoucherType = new Map<number, { n: number; rial: number }>();
  for (const r of table("Transactions")) {
    const partyId = partyMap.get(int(r.PRN_ID));
    if (!partyId) { missingParties.add(int(r.PRN_ID)); continue; }
    const vt = int(r.VoucherType);
    const amt = rial(r.Receipt);
    const agg = byVoucherType.get(vt) ?? { n: 0, rial: 0 };
    agg.n++; agg.rial += amt;
    byVoucherType.set(vt, agg);
    ledgerRows.push([
      cuid(), int(r.ID), partyId, date(r.RegisterDate), vt, int(r.Voucher), amt,
      text(r.Description),
    ]);
  }
  const ledger = await upsert(
    db, "ledger_entries",
    ["id", "legacyId", "partyId", "date", "voucherType", "voucher", "amount", "description"],
    ledgerRows, ["partyId", "date", "voucherType", "voucher", "amount", "description"]
  );
  log(`   ${ledger} ردیف گردش`);
  if (missingParties.size) {
    log(`   ⚠ ${missingParties.size} شخص در گردش، در جدول Persons نبود و رد شد`);
  }
  const VT_LABEL: Record<number, string> = {
    0: "مانده اول دوره", 20: "دریافت", 25: "پرداخت",
    30: "فاکتور فروش", 31: "تخفیف فروش", 40: "فاکتور خرید", 41: "تخفیف خرید",
  };
  for (const vt of [...byVoucherType.keys()].sort((a, b) => a - b)) {
    const t = byVoucherType.get(vt)!;
    log(`      ${String(vt).padStart(2)} ${(VT_LABEL[vt] ?? "؟").padEnd(14)} ${String(t.n).padStart(4)} ردیف  ${fa(t.rial).padStart(20)} تومان`);
  }

  // ── ۷) چک‌ها ─────────────────────────────────────────────
  log("۷) چک‌ها");
  const chequeRows: Cell[][] = [];
  for (const r of table("Cheques")) {
    chequeRows.push([
      cuid(), int(r.ID), text(r.Serial), rial(r.Price), date(r.RegisterDate), date(r.ChequeDate),
      text(r.BankName), text(r.BankBranch), text(r.BankAccount),
      null, int(r.Status) || null, 0, 0, null, text(r.Description), false,
      partyMap.get(int(r.PRN_ID)) ?? null, new Date(),
    ]);
  }
  for (const r of table("ChequesOld")) {
    chequeRows.push([
      cuid(), int(r.ID), text(r.Serial), rial(r.Price), date(r.RegisterDate), date(r.ChequeDate),
      null, null, null, text(r.PerSerial), int(r.Status) || null, 0, 1, null,
      text(r.Description), true, partyMap.get(int(r.PRN_ID)) ?? null, new Date(),
    ]);
  }
  for (const r of chequeRows) R("چک", num(r[3]));
  const cheques = await upsert(
    db, "cheques",
    ["id", "legacyId", "number", "amount", "issuedDate", "dueDate", "bankName", "bankBranch",
     "bankAccount", "bookSerial", "status", "statusNote", "isSettled", "settledDate",
     "note", "archived", "partyId", "updatedAt"],
    chequeRows,
    ["number", "amount", "issuedDate", "dueDate", "bankName", "bankBranch", "bankAccount",
     "bookSerial", "status", "note", "archived", "partyId", "updatedAt"]
  );
  const statusCount = new Map<number, number>();
  for (const r of chequeRows) {
    const s = int(r[10]);
    statusCount.set(s, (statusCount.get(s) ?? 0) + 1);
  }
  log(`   ${cheques} چک (${chequeRows.filter((r) => r[15]).length} بایگانی‌شده)`);
  log(`      کدهای وضعیت: ${[...statusCount].map(([k, v]) => `${k}→${v}`).join("  ")}`);

  // ── ۸) موجودی اول دوره صندوق و بانک ──────────────────────
  // فایل Access موجودی اول دوره را منفی و با علامت‌گذاری تزئینی ذخیره کرده
  const txCash = table("TransactionsCash");
  const cashOpen = txCash.find((r) => int(r.VoucherType) === 0);
  if (cashOpen) {
    await db.query(`UPDATE cash_boxes SET "openingBalance"=$1 WHERE "legacyId"=$2`,
      [Math.abs(rial(cashOpen.Price)), int(cashOpen.Cash_ID)]);
    log(`   موجودی اول دوره صندوق: ${fa(Math.abs(rial(cashOpen.Price)))} تومان`);
  }
  const bankOpen = table("TransactionsBank").find((r) => int(r.Type) === 0);
  if (bankOpen) {
    await db.query(`UPDATE bank_accounts SET "openingBalance"=$1 WHERE "legacyId"=$2`,
      [Math.abs(rial(bankOpen.Price)), int(bankOpen.BNK_ID)]);
    log(`   موجودی اول دوره بانک: ${fa(Math.abs(rial(bankOpen.Price)))} تومان`);
  }

  // ── ۹) کارتکس انبار ──────────────────────────────────────
  log("۹) کارتکس انبار");
  const warehouseId = (await db.query(
    `SELECT id FROM warehouses ORDER BY "legacyId" NULLS LAST LIMIT 1`
  )).rows[0]?.id ?? null;
  const kardexRows: Cell[][] = table("Kardex").map((r) => [
    cuid(), int(r.ID), date(r.RegDate), num(r.Amount), rial(r.Price), num(r.Stock),
    rial(r.AvgPrice), int(r.OperationType),
    goodsName.get(int(r.Good_ID)) ?? null, warehouseId, int(r.Good_ID) || null,
  ]);
  const stock = await upsert(
    db, "stock_movements",
    ["id", "legacyId", "date", "quantity", "unitPrice", "stock", "averagePrice",
     "operationType", "name", "warehouseId", "legacyGoodId"],
    kardexRows,
    ["date", "quantity", "unitPrice", "stock", "averagePrice", "operationType",
     "name", "warehouseId", "legacyGoodId"]
  );
  const ops = new Map<number, number>();
  for (const r of kardexRows) ops.set(int(r[7]), (ops.get(int(r[7])) ?? 0) + 1);
  log(`   ${stock} حرکت انبار · کدهای عملیات: ${[...ops].map(([k, v]) => `${k}→${v}`).join("  ")}`);

  // ── پایان ────────────────────────────────────────────────
  if (DRY_RUN) {
    await db.query("ROLLBACK");
    log("\n▌ حالت خشک — هیچ تغییری ذخیره نشد");
  } else {
    await db.query("COMMIT");
    log("\n▌ با موفقیت ذخیره شد");
  }

  // ── صحت‌سنجی ─────────────────────────────────────────────
  log("\n▌ خلاصهٔ ارقام (تومان)");
  log("   مرجع‌ها از دفتر اشخاص خودِ Access استخراج شده‌اند، نه تخمین:");

  // فروش/خرید در دفتر اشخاص با دو نوع سند می‌آید (سند + تخفیف)، پس مرجع
  // برابر «جمع سند اصلی + جمع سند تخفیف» است.
  const ledgerSum = (vt: number) =>
    [...byVoucherType.entries()]
      .filter(([k]) => k === vt || k === vt + 1)
      .reduce((a, [, t]) => a + t.rial, 0);

  const check = (label: string, expected: number) => {
    const got = totals[label]?.rial ?? 0;
    const delta = got - expected;
    const ok = Math.abs(delta) <= 2000; // اختلاف رند کردن ریال→تومان
    log(
      `   ${label.padEnd(8)} ${fa(got).padStart(18)}  مرجع ${fa(expected).padStart(18)}` +
      `  اختلاف ${delta === 0 ? "۰" : fa(delta).padStart(8)}  ${ok ? "✓" : "✗"}`
    );
    return ok;
  };

  const allOk = [
    check("فروش", Math.abs(ledgerSum(30))),
    check("خرید", ledgerSum(40)),
    check("دریافت", 5_658_175_584),
    check("پرداخت", 4_985_750_002),
  ].every(Boolean);

  const net = (totals["دریافت"]?.rial ?? 0) - (totals["پرداخت"]?.rial ?? 0);
  log(`   خالص نقد ${fa(net).padStart(18)}   (مرجع ۶۷۲٬۴۲۵٬۵۸۲)`);
  log(
    `\n▌ اختلاف‌های کوچک از تبدیل ریال→تومان است: هر قیمت و تخفیف جداگانه ` +
      `گرد می‌شود، پس جمع نهایی چند تومان با محاسبهٔ ریالی فایل فرق می‌کند.`
  );
  log(`▌ نتیجه: ${allOk ? "همه ارقام با مرجع هم‌خوان است ✓" : "ناهماهنگی دارد ✗"}`);
  if (!allOk) process.exitCode = 2;
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.error("\n✗ خطا و rollback:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await db.end();
}