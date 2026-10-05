/**
 * هستهٔ حسابداری جدید (کاملاً جدا از حسابداری قدیمی Access).
 *
 * جریان:
 *   فاکتور سایت → وضعیت COMPLETED → «ساخت پیش‌نویس تخصیص بهای تمام‌شده»
 *     (PENDING_APPROVAL، هیچ سندی نمی‌خورد)
 *   → تأیید مدیر → داخل یک تراکنش:
 *       ۱. ثبت بدهکاری مشتری در دفتر اشخاص (نوع ۳۰، مبلغ منفی)
 *       ۲. تخصیص FIFO بهای تمام‌شده از بچ‌های خرید + کم‌کردن remainingQty
 *       ۳. ثبت COGS و سود ناخالص
 *   → رد مدیر → REJECTED + دلیل
 *
 * قرارداد علامت دفتر (از دادهٔ واقعی استخراج شده):
 *   نوع ۳۰ فروش = مبلغ منفی  (طرف حساب بدهکار ماست)
 *   نوع ۲۰ دریافت = مبلغ مثبت (بدهکاری کم می‌شود)
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type DateRange = { from?: string; to?: string };

/** فیلتر تاریخ شمسی ثابت‌عرض روی فیلد string */
function dateFilter(field: string, r: DateRange) {
  const conds: string[] = [];
  const vals: string[] = [];
  if (r.from) {
    conds.push(`${field} >= $${vals.length + 1}`);
    vals.push(r.from);
  }
  if (r.to) {
    conds.push(`${field} <= $${vals.length + 1}`);
    vals.push(r.to);
  }
  return { sql: conds.length ? ` AND ${conds.join(" AND ")}` : "", vals };
}

export function parseRange(searchParams: URLSearchParams): DateRange {
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  return { from: from || undefined, to: to || undefined };
}

// ───────────────────────── ۱) ساخت پیش‌نویس تخصیص (روی تغییر وضعیت) ────────────────────────

/**
 * وقتی فاکتور COMPLETED شد، پیش‌نویس تخصیص COGS می‌سازد.
 * idempotent: اگر قبلاً ساخته شده باشد همان را برمی‌گرداند.
 * هیچ سند دفتری نمی‌زند و FIFO را قطعی نمی‌کند — فقط محاسبهٔ پیش‌نمایش.
 */
export async function createPendingAllocation(preInvoiceId: string) {
  const pre = await prisma.preInvoice.findUnique({
    where: { id: preInvoiceId },
    include: { cogsAllocation: { include: { lines: true } } },
  });
  if (!pre) throw new Error("پیش‌فاکتور پیدا نشد");

  if (pre.cogsAllocation) return pre.cogsAllocation;

  const items = Array.isArray(pre.items) ? (pre.items as any[]) : [];

  // پیش‌نمایش FIFO روی وضعیت فعلی دیتابیس (بدون اعمال)
  const lines = await previewFifoAlloc(items);

  const totalCogs = lines.reduce((a, l) => a + l.cogsTotal, 0);
  const salesTotal = Number(pre.totalPrice ?? 0);

  return prisma.cogsAllocation.create({
    data: {
      preInvoiceId: pre.id,
      status: "PENDING_APPROVAL",
      salesTotal,
      totalCogs,
      grossProfit: salesTotal - totalCogs,
      lines: {
        create: lines.map((l) => ({
          preInvoiceItemIndex: l.index,
          productId: l.productId,
          nameSnapshot: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          allocatedQty: l.allocatedQty,
          unitCogs: l.unitCogs,
          cogsTotal: l.cogsTotal,
          batchId: l.batchId,
        })),
      },
    },
    include: { lines: true },
  });
}

// ───────────────────────── ۲) FIFO ────────────────────────

type PlannedLine = {
  index: number;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  allocatedQty: number;
  unitCogs: number;
  cogsTotal: number;
  batchId: string | null;
  missing: number;
};

/** پیش‌نمایش FIFO بدون اعمال تغییر (برای نمایش «در انتظار تأیید») */
async function previewFifoAlloc(items: any[]): Promise<PlannedLine[]> {
  const out: PlannedLine[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] ?? {};
    const productId = typeof it.productId === "string" ? it.productId : null;
    const quantity = Number(it.quantity ?? 0);
    const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
    const lineTotal = Number(it.price ?? 0) * quantity;
    const name = String(it.name ?? "");

    if (!productId || quantity <= 0) {
      out.push({
        index: i, productId, name, quantity, unitPrice, lineTotal,
        allocatedQty: 0, unitCogs: 0, cogsTotal: 0, batchId: null, missing: quantity,
      });
      continue;
    }

    let need = quantity;
    let weighted = 0; // Σ(qty × unitCost)
    let got = 0;
    let firstBatchId: string | null = null;

    const batches = await prisma.$queryRaw<
      { id: string; remainingQty: number; unitCost: number }[]
    >`
      SELECT id, "remainingQty", "unitCost"
      FROM product_purchase_batches
      WHERE "productId" = ${productId} AND status = 'ACTIVE' AND "remainingQty" > 0
      ORDER BY date ASC, "createdAt" ASC
    `;

    for (const b of batches) {
      if (need <= 0) break;
      const take = Math.min(Number(b.remainingQty), need);
      weighted += take * Number(b.unitCost);
      need -= take;
      got += take;
      if (!firstBatchId) firstBatchId = b.id;
    }

    out.push({
      index: i, productId, name, quantity, unitPrice, lineTotal,
      allocatedQty: got,
      unitCogs: got > 0 ? weighted / got : 0,
      cogsTotal: weighted,
      batchId: got > 0 ? firstBatchId : null,
      missing: need,
    });
  }
  return out;
}

// ───────────────────────── ۳) تأیید مدیر ────────────────────────

export type ApproveResult =
  | { ok: true; allocationId: string; totalCogs: number; grossProfit: number; debt: number }
  | { ok: false; error: string };

/**
 * تأیید = ثبت قطعی. داخل یک تراکنش:
 * بدهکاری مشتری + تخصیص FIFO واقعی + COGS.
 */
export async function approveAllocation(allocationId: string, adminId: string): Promise<ApproveResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const alloc = await tx.cogsAllocation.findUnique({
        where: { id: allocationId },
        include: {
          preInvoice: { include: { customerReceipts: true } },
          lines: true,
        },
      });
      if (!alloc) return { ok: false as const, error: "پیش‌نویس پیدا نشد" };
      if (alloc.status === "APPROVED") return { ok: false as const, error: "قبلاً تأیید شده است" };
      if (alloc.status === "REJECTED") return { ok: false as const, error: "این مورد رد شده است" };

      const partyId = alloc.preInvoice.userId
        ? (await tx.user.findUnique({ where: { id: alloc.preInvoice.userId }, select: { party: { select: { id: true } } } }))?.party?.id
        : null;

      const items = Array.isArray(alloc.preInvoice.items) ? (alloc.preInvoice.items as any[]) : [];
      const total = Number(alloc.preInvoice.totalPrice ?? 0);

      // ── ۱. بدهکاری مشتری (فقط اگر طرف حساب داشته باشیم) ──
      let ledgerId: string | null = null;
      if (partyId) {
        const now = new Date();
        const iso = `${now.getUTCFullYear()}-${p2(now.getUTCMonth() + 1)}-${p2(now.getUTCDate())}`;
        const jDate = toJalali(iso);
        const entry = await tx.ledgerEntry.create({
          data: {
            date: jDate,
            voucherType: 30,
            voucher: 1,
            amount: -total, // فروش = منفی = طرف حساب بدهکار ماست
            description: `فاکتور سایت شماره ${alloc.preInvoice.invoiceNumber} — ${alloc.preInvoice.customerName}`,
            partyId,
            source: "NEW",
          },
        });
        ledgerId = entry.id;
      }

      // ── ۲. تخصیص FIFO قطعی ──
      let totalCogs = 0;
      const confirmed: PlannedLine[] = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i] ?? {};
        const productId = typeof it.productId === "string" ? it.productId : null;
        const quantity = Number(it.quantity ?? 0);
        const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
        const lineTotal = Number(it.price ?? 0) * quantity;
        const name = String(it.name ?? "");

        if (!productId || quantity <= 0) {
          confirmed.push({ index: i, productId, name, quantity, unitPrice, lineTotal,
            allocatedQty: 0, unitCogs: 0, cogsTotal: 0, batchId: null, missing: quantity });
          continue;
        }

        let need = quantity;
        let weighted = 0;
        let got = 0;
        let firstBatchId: string | null = null;

        // قفل ردیف‌های بچ برای جلوگیری از race در تراکنش
        const batches = await tx.$queryRaw<
          { id: string; remainingQty: number; unitCost: number }[]
        >`
          SELECT id, "remainingQty", "unitCost"
          FROM product_purchase_batches
          WHERE "productId" = ${productId} AND status = 'ACTIVE' AND "remainingQty" > 0
          ORDER BY date ASC, "createdAt" ASC
          FOR UPDATE
        `;

        for (const b of batches) {
          if (need <= 0) break;
          const take = Math.min(Number(b.remainingQty), need);
          if (take <= 0) continue;
          weighted += take * Number(b.unitCost);
          need -= take;
          got += take;
          if (!firstBatchId) firstBatchId = b.id;

          await tx.$executeRaw`
            UPDATE product_purchase_batches
            SET "remainingQty" = "remainingQty" - ${take},
                status = CASE WHEN "remainingQty" - ${take} <= 0.0001 THEN 'CLOSED' ELSE 'ACTIVE' END,
                "updatedAt" = now()
            WHERE id = ${b.id}
          `;
        }

        totalCogs += weighted;
        confirmed.push({ index: i, productId, name, quantity, unitPrice, lineTotal,
          allocatedQty: got, unitCogs: got > 0 ? weighted / got : 0, cogsTotal: weighted,
          batchId: firstBatchId, missing: need });
      }

      // ── ۳. ثبت قطعی ──
      await tx.cogsAllocationLine.deleteMany({ where: { allocationId } });
      await tx.cogsAllocationLine.createMany({
        data: confirmed.map((l) => ({
          allocationId,
          preInvoiceItemIndex: l.index,
          productId: l.productId,
          nameSnapshot: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          allocatedQty: l.allocatedQty,
          unitCogs: l.unitCogs,
          cogsTotal: l.cogsTotal,
          batchId: l.batchId,
        })),
      });

      const grossProfit = total - totalCogs;
      await tx.cogsAllocation.update({
        where: { id: allocationId },
        data: {
          status: "APPROVED",
          totalCogs,
          salesTotal: total,
          grossProfit,
          approvedById: adminId,
          approvedAt: new Date(),
          ledgerEntryId: ledgerId,
        },
      });

      return { ok: true as const, allocationId, totalCogs, grossProfit, debt: total };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("deadlock") || msg.includes("serialization")) {
      return { ok: false, error: "هم‌زمانی ثبت؛ دوباره تلاش کنید" };
    }
    return { ok: false, error: "ثبت ناموفق: " + msg };
  }
}

// ───────────────────────── ۴) رد مدیر ────────────────────────

export async function rejectAllocation(allocationId: string, adminId: string, reason: string) {
  return prisma.cogsAllocation.update({
    where: { id: allocationId },
    data: {
      status: "REJECTED",
      rejectedById: adminId,
      rejectedAt: new Date(),
      rejectionNote: reason || null,
    },
  });
}

// ───────────────────────── ۵) دریافت‌های مشتری ────────────────────────

export async function createReceipt(data: {
  partyId: string;
  preInvoiceId?: string | null;
  amount: number;
  date: string;
  method: string;
  note?: string | null;
  userId: string;
}) {
  if (!(data.amount > 0)) throw new Error("مبلغ باید بزرگ‌تر از صفر باشد");

  return prisma.$transaction(async (tx) => {
    // دریافت = کاهش بدهکاری = مبلغ مثبت در دفتر (نوع ۲۰)
    const entry = await tx.ledgerEntry.create({
      data: {
        date: data.date,
        voucherType: 20,
        voucher: 1,
        amount: data.amount,
        description: `دریافت ${data.note || ""}`.trim(),
        partyId: data.partyId,
        source: "NEW",
      },
    });

    return tx.customerReceipt.create({
      data: {
        partyId: data.partyId,
        preInvoiceId: data.preInvoiceId || null,
        amount: data.amount,
        date: data.date,
        method: data.method,
        note: data.note || null,
        ledgerEntryId: entry.id,
        createdById: data.userId,
      },
      include: { ledgerEntry: true },
    });
  });
}

// ───────────────────────── ۶) KPI ────────────────────────

export async function computeKpis(r: DateRange) {
  const f = r.from ?? "0001-01-01";
  const t = r.to ?? "9999-12-31";

  // فروش = فاکتورهایی که تخصیصشان APPROVED شده
  const salesRows = await prisma.$queryRaw<{ total: number; n: number }[]>`
    SELECT COALESCE(sum(p."totalPrice"),0)::float AS total, count(*)::int AS n
    FROM pre_invoices p
    JOIN cogs_allocations a ON a."preInvoiceId" = p.id
    WHERE a.status = 'APPROVED'
      AND to_char(a."approvedAt", 'YYYY-MM-DD') BETWEEN ${f} AND ${t}
  `;

  // خرید = بچ‌های ثبت‌شده از فاکتورهای خرید
  const purchases = await prisma.$queryRaw<{ total: number; n: number }[]>`
    SELECT COALESCE(sum(b.quantity * b."unitCost"),0)::float AS total, count(*)::int AS n
    FROM product_purchase_batches b
    WHERE b.date BETWEEN ${f} AND ${t}
  `;

  // بهای تمام‌شده = جمع COGS فاکتورهای تأییدشده
  const cogs = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COALESCE(sum(a."totalCogs"),0)::float AS total
    FROM cogs_allocations a
    WHERE a.status = 'APPROVED'
      AND to_char(a."approvedAt", 'YYYY-MM-DD') BETWEEN ${f} AND ${t}
  `;

  const salesTotal = Number(salesRows[0]?.total ?? 0);
  const purchaseTotal = Number(purchases[0]?.total ?? 0);
  const cogsTotal = Number(cogs[0]?.total ?? 0);

  return {
    sales: salesTotal,
    salesCount: Number(salesRows[0]?.n ?? 0),
    purchases: purchaseTotal,
    purchaseCount: Number(purchases[0]?.n ?? 0),
    cogs: cogsTotal,
    profit: salesTotal - cogsTotal,
  };
}

// ───────────────────────── کمکی ────────────────────────

/** میلادی به شمسی ثابت‌عرض — با همان الگوریتم تأییدشدهٔ convert-access-invoices */
const DIV = (a: number, b: number) => Math.trunc(a / b);
const MOD = (a: number, b: number) => a - b * Math.floor(a / b);
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635,
  2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number) {
  const bl = BREAKS.length, gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jump = 0;
  for (let i = 1; i < bl; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + DIV(jump, 33) * 8 + DIV(MOD(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + DIV(n, 33) * 8 + DIV(MOD(n, 33) + 3, 4);
  if (MOD(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = DIV(gy, 4) - DIV((DIV(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + DIV(jump + 4, 33) * 33;
  return { gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = DIV((gy + DIV(gm - 8, 6) + 100100) * 1461, 4) + DIV(153 * MOD(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - DIV(DIV(gy + 100100 + DIV(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + DIV(DIV(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = DIV(MOD(j, 1461), 4) * 5 + 308;
  const gd = DIV(MOD(i, 153), 5) + 1;
  const gm = MOD(DIV(i, 153), 12) + 1;
  return { gy: DIV(j, 1461) - 100100 + DIV(8 - gm, 6), gm, gd };
}

function j2g(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - DIV(jm, 7) * (jm - 7) + jd - 1);
}

const p2 = (n: number) => String(n).padStart(2, "0");

function jKey(jy: number, jm: number, jd: number) {
  const g = j2g(jy, jm, jd);
  return Date.UTC(g.gy, g.gm - 1, g.gd, 12, 0, 0);
}

/** میلادی → شمسی («۲۰۲۶-۱۰-۰۶» ← «۱۴۰۵/۰۷/۱۴») — با ۸ تاریخ مرجع تأیید شده */
export function toJalali(iso: string): string {
  const [Y, M, D] = iso.split("-").map(Number);
  const target = Date.UTC(Y, M - 1, D, 12, 0, 0);
  for (let jy = 1390; jy <= 1430; jy++) {
    if (jKey(jy, 1, 1) > target) break;
    for (let jm = 1; jm <= 12; jm++) {
      const maxd = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
      for (let jd = 1; jd <= maxd; jd++) {
        const k = jKey(jy, jm, jd);
        if (k === target) return `${jy}/${p2(jm)}/${p2(jd)}`;
        if (k > target) { jm = 99; break; }
      }
      if (jm === 99) break;
    }
  }
  return iso;
}

// ───────────────────────── ۷) ساخت بچ از فاکتور خرید ────────────────────────

/**
 * از فاکتورهای خرید، بچ‌های خرید می‌سازد.
 * idempotent: برای هر (فاکتور خرید + محصول) فقط یک بچ.
 * طبق خواسته: ثبت قیمت خرید و تأمین‌کننده فقط از مسیر فاکتور خرید.
 */
export async function syncPurchaseBatches() {
  const invoices = await prisma.purchaseInvoice.findMany({
    include: { lines: true, party: true },
    orderBy: { date: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const inv of invoices) {
    if (!inv.partyId) continue;
    for (const l of inv.lines) {
      if (!l.productId || l.quantity <= 0) {
        skipped++;
        continue;
      }
      const exists = await prisma.productPurchaseBatch.findFirst({
        where: { purchaseInvoiceId: inv.id, productId: l.productId },
      });
      if (exists) {
        skipped++;
        continue;
      }
      // قیمت خرید واحد = جمع تخصیافتهٔ ردیف / تعداد
      const unitCost = l.quantity > 0 ? Number(l.total) / l.quantity : Number(l.unitPrice);
      await prisma.productPurchaseBatch.create({
        data: {
          productId: l.productId,
          supplierId: inv.partyId,
          quantity: l.quantity,
          unitCost,
          remainingQty: l.quantity,
          date: inv.date,
          reference: inv.number != null ? String(inv.number) : null,
          purchaseInvoiceId: inv.id,
          note: inv.note,
          status: "ACTIVE",
        },
      });
      created++;
    }
  }
  return { created, skipped, invoices: invoices.length };
}

// ───────────────────────── ۸) اتصال به تغییر وضعیت فاکتور ────────────────────────

/**
 * بعد از تغییر وضعیت فاکتور — اگر COMPLETED شد، پیش‌نویس تخصیص COGS می‌سازد.
 * (هیچ سند قطعی نمی‌زند؛ منتظر تأیید مدیر می‌ماند)
 */
export async function onPreInvoiceStatusChanged(preInvoiceId: string, status: string) {
  if (status !== "COMPLETED") return null;
  return createPendingAllocation(preInvoiceId);
}
