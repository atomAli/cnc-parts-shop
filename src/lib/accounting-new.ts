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
import { toJalali, jalaliToIso } from "@/lib/jalali";

export { toJalali, jalaliToIso };

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

type BatchUsage = { batchId: string; qty: number; unitCost: number };

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
  batchUsage?: BatchUsage[];
};

/** پیش‌نمایش FIFO بدون اعمال تغییر (برای نمایش «در انتظار تأیید») */
async function previewFifoAlloc(items: any[]): Promise<PlannedLine[]> {
  const out: PlannedLine[] = [];
  const flags = await meterFlags(
    items.map((it) => (it && typeof it.productId === "string" ? it.productId : null))
  );
  for (let i = 0; i < items.length; i++) {
    const it = items[i] ?? {};
    const productId = typeof it.productId === "string" ? it.productId : null;
    const quantity = Number(it.quantity ?? 0);
    const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
    const lineTotal = Number(it.price ?? 0) * quantity;
    const name = String(it.name ?? "");
    // کالای متری: نیاز FIFO بر حسب متراژ (متر) است، نه تعداد شاخه
    const isMeter = productId ? flags.get(productId) === true : false;
    const need0 = productId ? fifoNeed(it, isMeter) : 0;

    if (!productId || !(need0 > 0)) {
      out.push({
        index: i, productId, name, quantity: need0, unitPrice, lineTotal,
        allocatedQty: 0, unitCogs: 0, cogsTotal: 0, batchId: null, missing: need0,
      });
      continue;
    }

    let need = need0;
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
      index: i, productId, name, quantity: need0, unitPrice, lineTotal,
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
        ? await ensurePartyForUser(
            tx,
            alloc.preInvoice.userId,
            alloc.preInvoice.customerName,
            alloc.preInvoice.customerPhone
          )
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
      const flags = await meterFlags(
        items.map((it) => (it && typeof it.productId === "string" ? it.productId : null))
      );

      for (let i = 0; i < items.length; i++) {
        const it = items[i] ?? {};
        const productId = typeof it.productId === "string" ? it.productId : null;
        const quantity = Number(it.quantity ?? 0);
        const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
        const lineTotal = Number(it.price ?? 0) * quantity;
        const name = String(it.name ?? "");
        // کالای متری: نیاز FIFO بر حسب متراژ (متر) است، نه تعداد شاخه
        const isMeter = productId ? flags.get(productId) === true : false;
        const need0 = productId ? fifoNeed(it, isMeter) : 0;

        if (!productId || !(need0 > 0)) {
          confirmed.push({ index: i, productId, name, quantity: need0, unitPrice, lineTotal,
            allocatedQty: 0, unitCogs: 0, cogsTotal: 0, batchId: null, missing: need0 });
          continue;
        }

        let need = need0;
        let weighted = 0;
        let got = 0;
        let firstBatchId: string | null = null;
        const usage: BatchUsage[] = [];

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
          usage.push({ batchId: b.id, qty: take, unitCost: Number(b.unitCost) });

          await tx.$executeRaw`
            UPDATE product_purchase_batches
            SET "remainingQty" = "remainingQty" - ${take},
                status = CASE WHEN "remainingQty" - ${take} <= 0.0001 THEN 'CLOSED' ELSE 'ACTIVE' END,
                "updatedAt" = now()
            WHERE id = ${b.id}
          `;
        }

        totalCogs += weighted;
        confirmed.push({ index: i, productId, name, quantity: need0, unitPrice, lineTotal,
          allocatedQty: got, unitCogs: got > 0 ? weighted / got : 0, cogsTotal: weighted,
          batchId: firstBatchId, missing: need, batchUsage: usage });
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
            batchUsage: (l.batchUsage ?? []) as unknown as object[],
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

// ───────────── ۴-ج) محاسبهٔ مجدد بهای تمام‌شده بعد از ثبت خرید ─────────────

/**
 * نیاز FIFO برای یک قلم فاکتور — کالای متری بر حسب **متراژ (متر)**،
 * چون بچ‌های خرید هم بر حسب متر ثبت می‌شوند (مطابق «لیست خرید»).
 * برای کالای متری: متراژ = تعداد × متراژ هر شاخه ÷ ۱۰۰ (اگر متراژ نبود، خودِ تعداد متراژ است).
 */
function fifoNeed(it: Record<string, unknown>, isMeter: boolean): number {
  const q = Number(it?.quantity ?? 0);
  if (!Number.isFinite(q) || q <= 0) return 0;
  if (!isMeter) return q;
  const bl = Number(it?.branchLength ?? it?.baseLength ?? 0);
  return bl > 0 ? (q * bl) / 100 : q;
}

/** کالاهای متری؟ — برای تبدیل تعداد به متراژ هنگام FIFO */
async function meterFlags(ids: (string | null)[]): Promise<Map<string, boolean>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const rows = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: { id: true, isMeter: true },
  });
  return new Map(rows.map((p) => [p.id, p.isMeter === true]));
}

type RecalcAlloc = {
  id: string;
  salesTotal: number;
  lines: { batchUsage: unknown }[];
  preInvoice: { invoiceNumber: number | null; items: unknown; totalPrice: number };
};

/** محاسبهٔ مجدد یک تخصیص تأییدشده داخل تراکنش */
async function recalcOne(a: RecalcAlloc) {
  const items = Array.isArray(a.preInvoice.items)
    ? (a.preInvoice.items as Record<string, unknown>[])
    : [];
  const flags = await meterFlags(
    items.map((it) => (typeof it?.productId === "string" ? it.productId : null))
  );

  return prisma.$transaction(async (tx) => {
    // ۱) بازگرداندن مصرف قبلیِ همین تخصیص تا FIFO از اول اجرا شود
    for (const line of a.lines) {
      const usage = Array.isArray(line.batchUsage) ? (line.batchUsage as unknown as BatchUsage[]) : [];
      for (const u of usage) {
        if (!u?.batchId || !(Number(u.qty) > 0)) continue;
        await tx.$executeRaw`
          UPDATE product_purchase_batches
          SET "remainingQty" = "remainingQty" + ${Number(u.qty)},
              status = 'ACTIVE',
              "updatedAt" = now()
          WHERE id = ${u.batchId}
        `;
      }
    }

    // ۲) اجرای دوبارهٔ FIFO روی اقلام فاکتور
    const newLines: {
      allocationId: string;
      preInvoiceItemIndex: number;
      productId: string | null;
      nameSnapshot: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      allocatedQty: number;
      unitCogs: number;
      cogsTotal: number;
      batchId: string | null;
      batchUsage: object[];
    }[] = [];
    let totalCogs = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i] ?? {};
      const productId = typeof it.productId === "string" ? it.productId : null;
      const rawQty = Number(it.quantity ?? 0);
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const lineTotal = Number(it.price ?? 0) * rawQty;
      const name = String(it.name ?? "");
      const isMeter = productId ? flags.get(productId) === true : false;
      const need = productId ? fifoNeed(it, isMeter) : 0;

      if (!productId || !(need > 0)) {
        newLines.push({
          allocationId: a.id, preInvoiceItemIndex: i, productId, nameSnapshot: name,
          quantity: need, unitPrice, lineTotal, allocatedQty: 0, unitCogs: 0,
          cogsTotal: 0, batchId: null, batchUsage: [],
        });
        continue;
      }

      let left = need;
      let weighted = 0;
      let got = 0;
      let firstBatchId: string | null = null;
      const usage: BatchUsage[] = [];

      const batches = await tx.$queryRaw<{ id: string; remainingQty: number; unitCost: number }[]>`
        SELECT id, "remainingQty", "unitCost"
        FROM product_purchase_batches
        WHERE "productId" = ${productId} AND status = 'ACTIVE' AND "remainingQty" > 0
        ORDER BY date ASC, "createdAt" ASC
        FOR UPDATE
      `;

      for (const b of batches) {
        if (left <= 0) break;
        const take = Math.min(Number(b.remainingQty), left);
        if (take <= 0) continue;
        weighted += take * Number(b.unitCost);
        left -= take;
        got += take;
        if (!firstBatchId) firstBatchId = b.id;
        usage.push({ batchId: b.id, qty: take, unitCost: Number(b.unitCost) });

        await tx.$executeRaw`
          UPDATE product_purchase_batches
          SET "remainingQty" = "remainingQty" - ${take},
              status = CASE WHEN "remainingQty" - ${take} <= 0.0001 THEN 'CLOSED' ELSE 'ACTIVE' END,
              "updatedAt" = now()
          WHERE id = ${b.id}
        `;
      }

      totalCogs += weighted;
      newLines.push({
        allocationId: a.id, preInvoiceItemIndex: i, productId, nameSnapshot: name,
        quantity: need, unitPrice, lineTotal, allocatedQty: got,
        unitCogs: got > 0 ? weighted / got : 0, cogsTotal: weighted,
        batchId: firstBatchId, batchUsage: usage as unknown as object[],
      });
    }

    // ۳) ثبت — فاکتور، سند دفتر و مبلغ فروش دست نمی‌خورند
    await tx.cogsAllocationLine.deleteMany({ where: { allocationId: a.id } });
    await tx.cogsAllocationLine.createMany({ data: newLines });

    const salesTotal = Number(a.salesTotal || a.preInvoice.totalPrice || 0);
    const grossProfit = salesTotal - totalCogs;
    await tx.cogsAllocation.update({
      where: { id: a.id },
      data: { totalCogs, grossProfit },
    });

    return {
      allocationId: a.id,
      invoiceNumber: a.preInvoice.invoiceNumber,
      totalCogs,
      grossProfit,
    };
  });
}

/**
 * بهای تمام‌شدهٔ فاکتورهای «تأیید شده» را با خریدهای فعلی دوباره محاسبه می‌کند.
 * هر بار که خریدی ثبت/حذف می‌شود صدا زده می‌شود تا فاکتوری که زودتر تأیید شده
 * (وقتی هنوز خریدی نداشت) صفر نماند.
 */
export async function recalculateApprovedCogs(
  r: { allocationId?: string; productIds?: string[] } = {}
) {
  const allocs = await prisma.cogsAllocation.findMany({
    where: { status: "APPROVED", ...(r.allocationId ? { id: r.allocationId } : {}) },
    include: {
      preInvoice: { select: { invoiceNumber: true, items: true, totalPrice: true } },
      lines: { select: { batchUsage: true, productId: true } },
    },
  });
  if (r.allocationId && !allocs.length) throw new Error("تخصیص تأییدشده پیدا نشد");

  const want = r.productIds?.length ? new Set(r.productIds) : null;
  const targets = want
    ? allocs.filter((a) => a.lines.some((l) => l.productId && want.has(l.productId)))
    : allocs;

  const results = [];
  for (const a of targets) results.push(await recalcOne(a as RecalcAlloc));
  return { ok: true as const, updated: results.length, results };
}

/**
 * نسخهٔ بی‌صدا: خطا نباید ثبت/حذف خرید را متوقف کند
 * (در صورت خطا، دکمهٔ «محاسبهٔ بهای تمام‌شده» در تب «تأیید شده» جایگزین است).
 */
async function safeRecalcApprovedCogs(r: { allocationId?: string; productIds?: string[] }) {
  try {
    await recalculateApprovedCogs(r);
  } catch {
    /* رد شد */
  }
}

// ─────────────────────── ۴-د) حذف تخصیص تأییدشده (توسط مدیر) ──────────────────────
/**
 * حذف تخصیص تأییدشده = بازگردانی کامل:
 *   - بازگردانی remainingQty هر بچ دقیقاً همان‌قدر که مصرف شده بود
 *   - حذف سند دفتر فروش (نوع ۳۰)
 *   - حذف خطوط و خود تخصیص
 *   - وضعیت فاکتور به «لغو شده» (CANCELLED) می‌رود تا در مدیریت فاکتورها
 *     در بخش قرمز «لغو شده» دیده شود و از KPI فروش خارج گردد
 */
export async function deleteAllocation(
  allocationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const alloc = await tx.cogsAllocation.findUnique({
        where: { id: allocationId },
        include: { lines: true },
      });
      if (!alloc) throw new Error("پیش‌نویس پیدا نشد");
      if (alloc.status !== "APPROVED") throw new Error("فقط تخصیص تأییدشده قابل حذف است");

      for (const line of alloc.lines) {
        const usage = Array.isArray(line.batchUsage)
          ? (line.batchUsage as unknown as BatchUsage[])
          : [];
        for (const u of usage) {
          if (!u?.batchId || !(Number(u.qty) > 0)) continue;
          await tx.$executeRaw`
            UPDATE product_purchase_batches
            SET "remainingQty" = "remainingQty" + ${Number(u.qty)},
                status = 'ACTIVE',
                "updatedAt" = now()
            WHERE id = ${u.batchId}
          `;
        }
      }

      if (alloc.ledgerEntryId) {
        await tx.ledgerEntry.deleteMany({ where: { id: alloc.ledgerEntryId, source: "NEW" } });
      }

      await tx.cogsAllocationLine.deleteMany({ where: { allocationId } });
      await tx.cogsAllocation.delete({ where: { id: allocationId } });

      // فاکتور به «لغو شده» می‌رود تا در مدیریت فاکتورها بخش قرمز لغو شده پیدا شود
      if (alloc.preInvoiceId) {
        await tx.preInvoice.updateMany({
          where: { id: alloc.preInvoiceId },
          data: { status: "CANCELLED" },
        });
      }
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: "حذف ناموفق: " + msg };
  }
}


/**
 * انتقال فاکتور به «لغو شده» — از هر وضعیتی.
 * اگر تخصیص تأییدشده داشته باشد اثر حسابداری‌اش (بچ، سند دفتر) کامل برمی‌گردد؛
 * اگر تخصیص پیش‌نویس داشته باشد همان حذف می‌شود.
 */
export async function cancelPreInvoice(
  preInvoiceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const alloc = await prisma.cogsAllocation.findUnique({
      where: { preInvoiceId },
      select: { id: true, status: true },
    });

    if (alloc) {
      if (alloc.status === "APPROVED") {
        // خودش وضعیت فاکتور را هم «لغو شده» می‌کند
        const res = await deleteAllocation(alloc.id);
        if (!res.ok) return res;
      } else {
        await prisma.$transaction([
          prisma.cogsAllocationLine.deleteMany({ where: { allocationId: alloc.id } }),
          prisma.cogsAllocation.delete({ where: { id: alloc.id } }),
        ]);
      }
    }

    await prisma.preInvoice.update({
      where: { id: preInvoiceId },
      data: { status: "CANCELLED" },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "لغو ناموفق" };
  }
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

type Tx = Prisma.TransactionClient;

/**
 * اگر کاربر طرف‌حساب نداشته باشد می‌سازیم — تا سندِ بدهکاری فاکتور سایت
 * همیشه در «حساب افراد» ثبت شود (قبلاً بی‌سند می‌ماند).
 */
export async function ensurePartyForUser(
  tx: Tx,
  userId: string,
  fallbackName?: string | null,
  fallbackPhone?: string | null
): Promise<string | null> {
  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, party: { select: { id: true } } },
  });
  if (!u) return null;
  if (u.party) return u.party.id;
  const p = await tx.party.create({
    data: {
      name: (fallbackName || u.name || "").trim() || "بدون نام",
      kind: "CUSTOMER",
      phone: (fallbackPhone || u.phone || "").trim() || null,
      userId: u.id,
    },
    select: { id: true },
  });
  return p.id;
}

/**
 * ثبت دستی یک رکورد روی طرف‌حساب از تب «حساب افراد»:
 *   RECEIPT (دریافت) = مبلغ مثبت (نوع ۲۰) — بدهکاری طرف کم می‌شود
 *   DEBT    (بدهی)   = مبلغ منفی (نوع ۳۰) — طرف را بیشتر بدهکار می‌کنیم
 */
export async function createRecord(data: {
  partyId: string;
  kind: "RECEIPT" | "DEBT";
  amount: number;
  date: string;
  note?: string | null;
  userId: string;
}) {
  const amount = Number(data.amount);
  if (!(amount > 0)) throw new Error("مبلغ باید بزرگ‌تر از صفر باشد");
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(data.date))
    throw new Error("تاریخ شمسی (۱۴۰۵/۰۷/۱۴) وارد کنید");

  const party = await prisma.party.findUnique({
    where: { id: data.partyId },
    select: { id: true },
  });
  if (!party) throw new Error("طرف حساب پیدا نشد");

  if (data.kind === "RECEIPT") {
    const r = await createReceipt({
      partyId: data.partyId,
      amount,
      date: data.date,
      method: "CASH",
      note: data.note || null,
      userId: data.userId,
    });
    return {
      kind: "RECEIPT" as const, id: r.id, amount, date: data.date,
      description: `دریافت ${data.note || ""}`.trim(), source: "NEW",
    };
  }

  const e = await prisma.ledgerEntry.create({
    data: {
      date: data.date,
      voucherType: 30,
      voucher: 1,
      amount: -amount,
      description: `بدهی ${data.note || ""}`.trim() || "بدهی دستی",
      partyId: data.partyId,
      source: "NEW",
    },
  });
  return {
    kind: "DEBT" as const, id: e.id, amount: -amount, date: data.date,
    description: e.description, source: "NEW",
  };
}

/** اسناد یک طرف‌حساب — برای باز شدن ردیف در تب «حساب افراد» */
export async function getPartyRecords(partyId: string) {
  return prisma.ledgerEntry.findMany({
    where: { partyId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true, date: true, voucherType: true, amount: true,
      description: true, source: true,
    },
  });
}

export type StatementRow = {
  id: string;
  date: string;
  voucherType: number;
  voucher: number;
  amount: number;
  description: string | null;
  source: string;
  running: number;
};

export type PartyStatement = {
  rows: StatementRow[];
  totals: { count: number; debit: number; credit: number; balance: number };
};

/**
 * صورت حساب یک طرف‌حساب از روی «دفتر کل» — همان منبع تب «حساب افراد»،
 * پس ماندهٔ این تابع دقیقاً برابر ماندهٔ همان تب است (SUM(ledger_entries.amount)).
 * سند بدون تاریخ (ماندهٔ اول دوره) در هر بازه لحاظ می‌شود.
 */
export async function getPartyStatement(
  partyId: string,
  r: DateRange = {}
): Promise<PartyStatement> {
  const from = r.from ?? "";
  const to = r.to ?? "";

  const all = await prisma.ledgerEntry.findMany({
    where: { partyId },
    select: {
      id: true, date: true, voucherType: true, voucher: true,
      amount: true, description: true, source: true,
    },
  });

  // تاریخ‌دارها داخل بازه، سند بدون تاریخ همیشه؛ بعد مرتب‌سازی (بدون تاریخ اول)
  const sorted = all
    .filter((x) => {
      const d = x.date || "";
      if (!d) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    })
    .sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  let running = 0;
  let debit = 0;
  let credit = 0;
  const rows: StatementRow[] = sorted.map((x) => {
    running += Number(x.amount);
    if (x.amount < 0) debit += Number(x.amount);
    else if (x.amount > 0) credit += Number(x.amount);
    return { ...x, date: x.date || "", running };
  });

  return {
    rows,
    totals: {
      count: rows.length,
      debit,
      credit,
      balance: running,
    },
  };
}

// ───────────────────────── ۶) KPI ────────────────────────

export async function computeKpis(r: DateRange) {
  // بازهٔ شمسی برای ستون‌های شمسی (بچ‌ها) و معادل میلادی برای DateTime ها
  const f = r.from ?? "0001-01-01";
  const t = r.to ?? "9999-12-31";
  const fG = r.from ? jalaliToIso(r.from) ?? "0001-01-01" : "0001-01-01";
  const tG = r.to ? jalaliToIso(r.to) ?? "9999-12-31" : "9999-12-31";

  // فروش کل = فاکتورهای فروش حسابداری قدیم (sales_invoices)
  //          + فاکتورهای «تکمیل شده»ٔ سایت (با هر فاکتور جدید عوض می‌شود)
  const [legacySales, siteSales] = await Promise.all([
    prisma.salesInvoice.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        status: "DONE",
        AND: [
          r.from ? { date: { gte: r.from } } : {},
          r.to ? { date: { lte: r.to } } : {},
        ],
      },
    }),
    prisma.$queryRaw<{ total: number; n: number }[]>`
      SELECT COALESCE(sum(p."totalPrice"),0)::float AS total, count(*)::int AS n
      FROM pre_invoices p
      WHERE p.source <> 'ACCESS'
        AND p.status = 'DONE'
        AND to_char(p."createdAt", 'YYYY-MM-DD') BETWEEN ${fG} AND ${tG}
    `,
  ]);

  // خرید کل = فاکتورهای خرید (همان رقمِ حسابداری قدیم)
  //          + خریدهای دستی ثبت‌شده از تب «لیست خرید»
  const [legacyPurchases, manualPurchases] = await Promise.all([
    prisma.purchaseInvoice.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        AND: [
          r.from ? { date: { gte: r.from } } : {},
          r.to ? { date: { lte: r.to } } : {},
        ],
      },
    }),
    prisma.$queryRaw<{ total: number; n: number }[]>`
      SELECT COALESCE(sum(b.quantity * b."unitCost"),0)::float AS total, count(*)::int AS n
      FROM product_purchase_batches b
      WHERE b."purchaseInvoiceId" IS NULL
        AND b.date BETWEEN ${f} AND ${t}
    `,
  ]);

  // بهای تمام‌شده = جمع COGS فاکتورهای تأییدشده
  const cogs = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COALESCE(sum(a."totalCogs"),0)::float AS total
    FROM cogs_allocations a
    WHERE a.status = 'APPROVED'
      AND to_char(a."approvedAt", 'YYYY-MM-DD') BETWEEN ${fG} AND ${tG}
  `;

  const salesTotal =
    Number(legacySales._sum.total ?? 0) + Number(siteSales[0]?.total ?? 0);
  const salesCount =
    Number(legacySales._count ?? 0) + Number(siteSales[0]?.n ?? 0);
  const purchaseTotal =
    Number(legacyPurchases._sum.total ?? 0) + Number(manualPurchases[0]?.total ?? 0);
  const purchaseCount =
    Number(legacyPurchases._count ?? 0) + Number(manualPurchases[0]?.n ?? 0);
  const cogsTotal = Number(cogs[0]?.total ?? 0);

  return {
    sales: salesTotal,
    salesCount,
    purchases: purchaseTotal,
    purchaseCount,
    cogs: cogsTotal,
    // سود = فروش کل − خرید کل (مثل «سود ناخالص» حسابداری قدیم)
    profit: salesTotal - purchaseTotal,
  };
}

// ───────────────────────── کمکی ────────────────────────

/**
 * توابع تاریخ شمسی به `@/lib/jalali` منتقل شدند تا کامپوننت‌های client هم
 * بتوانند از همان الگوریتم تأییدشده استفاده کنند (import/re-export در بالای فایل).
 */
const p2 = (n: number) => String(n).padStart(2, "0");

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
  // خریدهای تازه وارد شده‌اند → بهای تمام‌شدهٔ فاکتورهای تأییدشده دوباره محاسبه شود
  await safeRecalcApprovedCogs({});
  return { created, skipped, invoices: invoices.length };
}

// ───────────────────────── ۸) اتصال به تغییر وضعیت فاکتور ────────────────────────

/**
 * بعد از تغییر وضعیت فاکتور — اگر «تکمیل شده» شد و فاکتور از سایت باشد،
 * بهای تمام‌شده تأیید و سندِ بدهکاری مشتری در «حساب افراد» ثبت می‌شود.
 * فاکتورهای قدیمی Access از این مسیر رد نمی‌شوند.
 */
export async function onPreInvoiceStatusChanged(
  preInvoiceId: string,
  status: string,
  adminId?: string
) {
  if (status !== "DONE") return null;

  const inv = await prisma.preInvoice.findUnique({
    where: { id: preInvoiceId },
    select: { source: true },
  });
  if (!inv || inv.source === "ACCESS") return null;

  // اگر قبلاً تأیید شده باشد همان را برمی‌گرداند (idempotent)
  const existing = await prisma.cogsAllocation.findUnique({
    where: { preInvoiceId },
    include: { lines: true },
  });
  if (existing?.status === "APPROVED") return existing;

  if (!existing) await createPendingAllocation(preInvoiceId);

  const owner = adminId ?? (await systemAdminId());
  const res = await approveAllocation(existing?.id ?? (await requireAllocationId(preInvoiceId)), owner);
  if (!res.ok) throw new Error(res.error || "تأیید خودکار ناموفق بود");

  return prisma.cogsAllocation.findUnique({
    where: { preInvoiceId },
    include: { lines: true },
  });
}

/**
 * همگام‌سازی: هر فاکتور «تکمیل شده»ٔ سایت که تخصیص ندارد یا تخصیصش در انتظار است
 * را خودکار تأیید می‌کند — چون فرآیند تأیید دستی حذف شده است.
 */
export async function backfillAutoApprove(): Promise<number> {
  let n = 0;

  const missing = await prisma.preInvoice.findMany({
    where: { status: "DONE", source: { not: "ACCESS" }, cogsAllocation: null },
    select: { id: true },
    take: 50,
  });
  for (const m of missing) {
    try {
      await onPreInvoiceStatusChanged(m.id, "DONE");
      n++;
    } catch {
      /* رد شد */
    }
  }

  // فاکتورهای تکمیل‌شدهٔ سایت که هنوز در «حساب افراد» بدهکار نشده‌اند
  const noDebt = await prisma.cogsAllocation.findMany({
    where: { status: "APPROVED", ledgerEntryId: null },
    select: { id: true },
    take: 100,
  });
  for (const a of noDebt) {
    try {
      if (await createDebtForAllocation(a.id)) n++;
    } catch {
      /* رد شد */
    }
  }

  const pending = await prisma.cogsAllocation.findMany({
    where: { status: "PENDING_APPROVAL" },
    select: { preInvoiceId: true },
    take: 50,
  });
  for (const p of pending) {
    try {
      await onPreInvoiceStatusChanged(p.preInvoiceId, "DONE");
      n++;
    } catch {
      /* رد شد */
    }
  }

  return n;
}

/**
 * سند بدهکاری مشتری برای یک تخصیص تأییدشده — اگر قبلاً ساخته نشده باشد
 * (مثلاً وقتی فاکتور بدون طرف‌حساب تأیید شده بود) اکنون می‌سازیمش.
 */
export async function createDebtForAllocation(allocationId: string): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const alloc = await tx.cogsAllocation.findUnique({
      where: { id: allocationId },
      include: { preInvoice: true },
    });
    if (!alloc) return null;
    if (alloc.ledgerEntryId) {
      const exists = await tx.ledgerEntry.findUnique({
        where: { id: alloc.ledgerEntryId },
        select: { id: true },
      });
      if (exists) return alloc.ledgerEntryId;
    }
    if (!alloc.preInvoice.userId) return null;
    const total = Number(alloc.preInvoice.totalPrice ?? 0);
    if (!(total > 0)) return null;

    const partyId = await ensurePartyForUser(
      tx,
      alloc.preInvoice.userId,
      alloc.preInvoice.customerName,
      alloc.preInvoice.customerPhone
    );
    if (!partyId) return null;

    const now = new Date();
    const iso = `${now.getUTCFullYear()}-${p2(now.getUTCMonth() + 1)}-${p2(now.getUTCDate())}`;
    const entry = await tx.ledgerEntry.create({
      data: {
        date: toJalali(iso),
        voucherType: 30,
        voucher: 1,
        amount: -total,
        description: `فاکتور سایت شماره ${alloc.preInvoice.invoiceNumber} — ${alloc.preInvoice.customerName}`,
        partyId,
        source: "NEW",
      },
    });
    await tx.cogsAllocation.update({
      where: { id: allocationId },
      data: { ledgerEntryId: entry.id },
    });
    return entry.id;
  });
}

async function requireAllocationId(preInvoiceId: string): Promise<string> {
  const a = await prisma.cogsAllocation.findUnique({
    where: { preInvoiceId },
    select: { id: true },
  });
  if (!a) throw new Error("پیش‌نویس تخصیص ساخته نشد");
  return a.id;
}

/** شناسهٔ کاربر مدیر — برای ستون‌های approvedById/rejectedById */
async function systemAdminId(): Promise<string> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM users WHERE role = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1`;
  if (!rows[0]?.id) throw new Error("کاربر مدیر پیدا نشد");
  return rows[0].id;
}

// ───────────────────────── ۹) لیست خرید ────────────────────────

function todayIso(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${n.getUTCFullYear()}-${p(n.getUTCMonth() + 1)}-${p(n.getUTCDate())}`;
}

export type PurchaseItem = {
  productId: string;
  name: string;
  /** کالای متری: مقادیر بر حسب متر است؛ غیر متری: بر حسب عدد */
  isMeter: boolean;
  soldQty: number;
  /** فقط کالای متری: تعداد شاخه فروخته‌شده */
  soldBranches: number;
  /**
   * فقط کالای متری: طول واقعی هر شاخه (سانتی‌متر) از روی خود فاکتورها —
   * میانگین وزنی `branchLength` آیتم‌ها. اگر فاکتوری این فیلد را نداشت → ۰
   * و رابط کاربری به حداکثر طول استاندارد کالا برمی‌گردد.
   */
  soldBranchLenCm: number;
  purchasedQty: number;
  remainingQty: number;
  shortage: number;
  avgCost: number | null;
  manualTotal: number;
  /**
   * فقط حالت «همه»: فاکتورهای «تأیید شده»‌ای که این کالا را سفارش داشته‌اند —
   * مقصد تخصیص هنگام ثبت خرید (مدیر باید بگوید هر تعداد برای کدام فاکتور است).
   */
  soldByInvoice: {
    invoiceId: string;
    invoiceNumber: number;
    customerName: string;
    /** همان واحدِ `soldQty` (متر برای کالای متری، عدد برای بقیه) */
    qty: number;
    /** فقط کالای متری: تعداد شاخه */
    branches: number;
  }[];
  manual: {
    id: string;
    quantity: number;
    unitCost: number;
    total: number;
    date: string;
    supplier: { id: string; name: string } | null;
    /** تخصیص این خرید به فاکتورها: [{ preInvoiceId, qty }] */
    allocations?: unknown;
  }[];
};

/**
 * لیست خرید — سه حالت نمایش:
 *  - `ALL` (پیش‌فرض): جمع همهٔ فاکتورهای «تکمیل شده»ٔ سایت
 *  - `SALES`: فقط کالاهای یک فاکتور فروش؛ «فروش رفته» از همان فاکتور و
 *    «خریداری‌شده» = جمع تخصیص‌هایی است که هنگام ثبت خرید به همین فاکتور
 *    داده شده (ستون `allocations` روی بچ). کمبود همین فاکتور = فروش − تخصیص.
 *  - `PURCHASE`: فقط ردیف‌های یک فاکتور خرید؛ «خریداری‌شده» از همان فاکتور
 *
 * کمبود = فروش رفته − خریداری‌شده. خریدهای دستی به بچ‌ها می‌چسبند، پس
 * «خرید کل» (KPI) خودبه‌خود شاملشان می‌شود.
 */
export type PurchaseListScope =
  | { kind: "ALL" }
  | { kind: "SALES"; invoiceId: string }
  | { kind: "PURCHASE"; purchaseInvoiceId: string };

type SoldAgg = { productId: string; qty: number; meters: number; branchLen: number };
type BoughtAgg = { productId: string; qty: number; remaining: number; cost: number; manual: number };
type ManualRow = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  date: string;
  supplier: { id: string; name: string } | null;
  allocations?: unknown;
};

/** مقدار تخصیص‌یافتهٔ یک خرید به یک فاکتور خاص */
function allocQtyTo(allocs: unknown, invoiceId: string): number {
  if (!Array.isArray(allocs)) return 0;
  let sum = 0;
  for (const raw of allocs) {
    const a = raw as { preInvoiceId?: unknown; qty?: unknown };
    if (a && a.preInvoiceId === invoiceId) sum += Number(a.qty || 0);
  }
  return sum;
}

/** جمع فروش هر کالا در هر فاکتور (از اقلام JSON فاکتورهای تأییدشده) */
type InvSoldRaw = {
  invoiceId: string;
  invoiceNumber: number;
  customerName: string;
  productId: string;
  /** تعداد خام آیتم (شاخه/عدد) */
  count: number;
  /** متراژ معادل (متر) */
  meters: number;
};

export async function getPurchaseList(
  scope: PurchaseListScope = { kind: "ALL" }
): Promise<PurchaseItem[]> {
  let sold: SoldAgg[] = [];
  let bought: BoughtAgg[] = [];
  let manualRows: ManualRow[] = [];
  /** فروش هر کالا در هر فاکتور «تأیید شده» (فقط در حالت ALL ساخته می‌شود) */
  const invSoldRaw: InvSoldRaw[] = [];

  if (scope.kind === "SALES") {
    // فقط اقلام همین فاکتور فروش
    const [invSold, allocAgg, stockAgg, mrows] = await Promise.all([
      prisma.$queryRaw<SoldAgg[]>`
        SELECT it->>'productId' AS "productId",
               COALESCE(sum((it->>'quantity')::float),0)::float AS qty,
               COALESCE(sum(
                 CASE WHEN COALESCE((it->>'branchLength')::float,0) > 0
                      THEN (it->>'quantity')::float * (it->>'branchLength')::float / 100.0
                      ELSE (it->>'quantity')::float END
               ),0)::float AS meters,
               COALESCE(
                 sum(CASE WHEN COALESCE((it->>'branchLength')::float,0) > 0
                          THEN (it->>'quantity')::float * (it->>'branchLength')::float END)
                 / nullif(sum(CASE WHEN COALESCE((it->>'branchLength')::float,0) > 0
                                   THEN (it->>'quantity')::float END), 0),
               0)::float AS "branchLen"
        FROM pre_invoices p, jsonb_array_elements(p.items) it
        WHERE p.id = ${scope.invoiceId} AND it->>'productId' IS NOT NULL
        GROUP BY 1`,
      // خریدهایی که هنگام ثبت به همین فاکتور تخصیص داده شده‌اند
      prisma.$queryRaw<{ productId: string; qty: number; cost: number }[]>`
        SELECT b."productId",
               COALESCE(sum((a->>'qty')::float),0)::float              AS qty,
               COALESCE(sum((a->>'qty')::float * b."unitCost"),0)::float AS cost
        FROM product_purchase_batches b
        LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b.allocations, '[]'::jsonb)) a ON TRUE
        WHERE a->>'preInvoiceId' = ${scope.invoiceId}
        GROUP BY 1`,
      // وضعیت انبار (کل کالا، مستقل از فاکتور)
      prisma.$queryRaw<{ productId: string; remaining: number; manual: number }[]>`
        SELECT "productId",
               COALESCE(sum("remainingQty"),0)::float                            AS remaining,
               COALESCE(sum(quantity) FILTER (WHERE "purchaseInvoiceId" IS NULL),0)::float AS manual
        FROM product_purchase_batches
        GROUP BY "productId"`,
      prisma.productPurchaseBatch.findMany({
        where: { purchaseInvoiceId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitCost: true,
          date: true,
          allocations: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);
    sold = invSold;
    const allocMap = new Map(allocAgg.map((r) => [r.productId, r]));
    const stockMap = new Map(stockAgg.map((r) => [r.productId, r]));
    bought = invSold.map((s) => ({
      productId: s.productId,
      qty: Number(allocMap.get(s.productId)?.qty ?? 0),
      remaining: Number(stockMap.get(s.productId)?.remaining ?? 0),
      cost: Number(allocMap.get(s.productId)?.cost ?? 0),
      manual: Number(stockMap.get(s.productId)?.manual ?? 0),
    }));
    manualRows = mrows
      .map((r): ManualRow | null => {
        const a = allocQtyTo(r.allocations, scope.invoiceId);
        if (!(a > 0)) return null;
        return {
          id: r.id,
          productId: r.productId,
          quantity: a,
          unitCost: r.unitCost,
          date: r.date,
          supplier: r.supplier,
          allocations: r.allocations,
        };
      })
      .filter((r): r is ManualRow => r !== null);
  } else if (scope.kind === "PURCHASE") {
    // فقط ردیف‌های همین فاکتور خرید
    const [lines, invBatches] = await Promise.all([
      prisma.$queryRaw<{ productId: string; qty: number }[]>`
        SELECT "productId", COALESCE(sum(quantity),0)::float AS qty
        FROM purchase_invoice_lines
        WHERE "invoiceId" = ${scope.purchaseInvoiceId} AND "productId" IS NOT NULL
        GROUP BY 1`,
      prisma.$queryRaw<{ productId: string; remaining: number }[]>`
        SELECT "productId", COALESCE(sum("remainingQty"),0)::float AS remaining
        FROM product_purchase_batches
        WHERE "purchaseInvoiceId" = ${scope.purchaseInvoiceId}
        GROUP BY 1`,
    ]);
    const remMap = new Map(invBatches.map((b) => [b.productId, Number(b.remaining)]));
    bought = lines.map((l) => ({
      productId: l.productId,
      qty: Number(l.qty),
      // بچی برای این فاکتور ساخته نشده یعنی هنوز مصرف نشده
      remaining: remMap.get(l.productId) ?? Number(l.qty),
      cost: 0,
      manual: 0,
    }));
  } else {
    const [s, b, approvedInvs, mrows] = await Promise.all([
      // فقط فاکتورهای «تکمیل شده»ٔ سایت (نه قدیمی، نه در جریان)
      prisma.$queryRaw<SoldAgg[]>`
        SELECT it->>'productId' AS "productId",
               COALESCE(sum((it->>'quantity')::float),0)::float AS qty,
               COALESCE(sum(
                 CASE WHEN COALESCE((it->>'branchLength')::float,0) > 0
                      THEN (it->>'quantity')::float * (it->>'branchLength')::float / 100.0
                      ELSE (it->>'quantity')::float END
               ),0)::float AS meters,
               COALESCE(
                 sum(CASE WHEN COALESCE((it->>'branchLength')::float,0) > 0
                          THEN (it->>'quantity')::float * (it->>'branchLength')::float END)
                 / nullif(sum(CASE WHEN COALESCE((it->>'branchLength')::float,0) > 0
                                   THEN (it->>'quantity')::float END), 0),
               0)::float AS "branchLen"
        FROM pre_invoices, jsonb_array_elements(items) it
        WHERE it->>'productId' IS NOT NULL
          AND source <> 'ACCESS'
          AND status = 'DONE'
        GROUP BY 1`,
      prisma.$queryRaw<BoughtAgg[]>`
        SELECT "productId",
               COALESCE(sum(quantity),0)::float              AS qty,
               COALESCE(sum("remainingQty"),0)::float        AS remaining,
               COALESCE(sum(quantity * "unitCost"),0)::float AS cost,
               COALESCE(sum(quantity) FILTER (WHERE "purchaseInvoiceId" IS NULL),0)::float AS manual
        FROM product_purchase_batches
        GROUP BY "productId"`,
      // فاکتورهای «تأیید شده» — مقصد تخصیص خرید هنگام ثبت
      prisma.preInvoice.findMany({
        where: { cogsAllocation: { status: "APPROVED" } },
        select: { id: true, invoiceNumber: true, customerName: true, items: true },
      }),
      prisma.productPurchaseBatch.findMany({
        where: { purchaseInvoiceId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitCost: true,
          date: true,
          allocations: true,
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);
    sold = s;
    bought = b;
    manualRows = mrows;

    // جمع فروش هر کالا در هر فاکتور تأییدشده (برای فرم «تخصیص به فاکتور»)
    for (const inv of approvedInvs) {
      const items = inv.items as unknown;
      if (!Array.isArray(items)) continue;
      for (const raw of items) {
        const it = raw as { productId?: unknown; quantity?: unknown; branchLength?: unknown };
        if (!it || typeof it.productId !== "string" || !it.productId) continue;
        const qty = Number(it.quantity || 0);
        if (!Number.isFinite(qty) || qty === 0) continue;
        const bl = Number(it.branchLength || 0);
        invSoldRaw.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          productId: it.productId,
          count: qty,
          meters: bl > 0 ? (qty * bl) / 100 : qty,
        });
      }
    }
  }

  const sMap = new Map(sold.map((r) => [r.productId, r]));
  const bMap = new Map(bought.map((b) => [b.productId, b]));

  const source = scope.kind === "PURCHASE" ? bought : sold;
  const ids = [...new Set(source.map((r) => r.productId))];
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, isMeter: true },
      })
    : [];
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const manualMap = new Map<string, PurchaseItem["manual"]>();
  for (const m of manualRows) {
    const arr = manualMap.get(m.productId) ?? [];
    arr.push({
      id: m.id,
      quantity: m.quantity,
      unitCost: m.unitCost,
      total: m.quantity * m.unitCost,
      date: m.date,
      supplier: m.supplier,
      allocations: m.allocations,
    });
    manualMap.set(m.productId, arr);
  }

  // مقصد تخصیص خرید: هر کالا با فاکتورهای تأییدشده‌ای که آن را سفارش داشته‌اند
  const invByProduct = new Map<string, PurchaseItem["soldByInvoice"]>();
  for (const r of invSoldRaw) {
    const isM = prodMap.get(r.productId)?.isMeter === true;
    const qty = isM ? r.meters : r.count;
    const branches = isM ? r.count : 0;
    const arr = invByProduct.get(r.productId) ?? [];
    const hit = arr.find((x) => x.invoiceId === r.invoiceId);
    if (hit) {
      hit.qty += qty;
      hit.branches += branches;
    } else {
      arr.push({
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoiceNumber,
        customerName: r.customerName,
        qty,
        branches,
      });
    }
    invByProduct.set(r.productId, arr);
  }
  for (const arr of invByProduct.values()) arr.sort((a, b) => b.invoiceNumber - a.invoiceNumber);

  const rows: PurchaseItem[] = ids.map((productId) => {
    const prod = prodMap.get(productId);
    const isMeter = prod?.isMeter === true;
    const r = sMap.get(productId);
    const b = bMap.get(productId);
    const purchased = Number(b?.qty ?? 0);
    // کالای متری: فروش بر حسب متراژ (متر) — غیر متری: بر حسب عدد
    const soldQty = isMeter ? Number(r?.meters ?? 0) : Number(r?.qty ?? 0);
    const soldBranches = isMeter ? Number(r?.qty ?? 0) : 0;
    const soldBranchLenCm = isMeter ? Number(r?.branchLen ?? 0) : 0;
    const cost = Number(b?.cost ?? 0);
    return {
      productId,
      name: prod?.name ?? "—",
      isMeter,
      soldQty,
      soldBranches,
      soldBranchLenCm,
      purchasedQty: purchased,
      remainingQty: Number(b?.remaining ?? 0),
      shortage: Math.max(0, soldQty - purchased),
      avgCost: purchased > 0 && cost > 0 ? cost / purchased : null,
      manualTotal: Number(b?.manual ?? 0),
      soldByInvoice: invByProduct.get(productId) ?? [],
      manual: manualMap.get(productId) ?? [],
    };
  });

  rows.sort((a, b) => b.shortage - a.shortage || b.soldQty - a.soldQty);
  return rows;
}

/** فهرست فاکتورها برای منوی بالای «لیست خرید» */
export async function getPurchaseListInvoices() {
  const [sales, purchases] = await Promise.all([
    // فقط فاکتورهایی که در تب «تأیید شده» هستند (تخصیص بهای تمام‌شده با وضعیت APPROVED)
    prisma.preInvoice.findMany({
      where: { cogsAllocation: { status: "APPROVED" } },
      orderBy: { invoiceNumber: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        customerPhone: true,
        status: true,
        source: true,
      },
    }),
    prisma.purchaseInvoice.findMany({
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 80,
      select: { id: true, number: true, date: true, party: { select: { name: true } } },
    }),
  ]);
  return { sales, purchases };
}

/**
 * مرجعوعی کالا — سند فروش پاک **نمی‌شود** و روند فاکتور دست‌نخورده می‌ماند؛
 * فقط یک سند مثبت جداگانه (نوع ۳۲ «مرجوعی کالا») ثبت می‌شود که
 * «بدهکاری ما به مشتری» است و از رقم فاکتور جداست.
 */
export async function createReturn(data: {
  partyId: string;
  amount: number;
  refId?: string | null;
  note?: string | null;
}) {
  const amount = Number(data.amount);
  if (!(amount > 0)) throw new Error("مبلغ مرجوعی باید بزرگ‌تر از صفر باشد");

  const party = await prisma.party.findUnique({ where: { id: data.partyId }, select: { id: true } });
  if (!party) throw new Error("طرف حساب پیدا نشد");

  let refDesc: string | null = null;
  if (data.refId) {
    const ref = await prisma.ledgerEntry.findUnique({
      where: { id: data.refId },
      select: { partyId: true, description: true, voucherType: true },
    });
    if (!ref) throw new Error("سند مرجع پیدا نشد");
    if (ref.partyId !== data.partyId) throw new Error("این سند متعلق به این طرف‌حساب نیست");
    if (ref.voucherType !== 30) throw new Error("مرجوعی فقط روی سند فروش ثبت می‌شود");
    refDesc = ref.description;
  }

  const note = data.note?.trim();
  const description = `مرجوعی کالا${refDesc ? ` ← ${refDesc}` : ""}${note ? ` (${note})` : ""}`;
  return prisma.ledgerEntry.create({
    data: {
      date: toJalali(todayIso()),
      voucherType: 32,
      voucher: 1,
      amount, // مثبت = بستانکار مشتری = بدهکاری ما به مشتری
      description,
      partyId: data.partyId,
      source: "NEW",
    },
  });
}

/** ثبت خرید دستی از تب «لیست خرید» — ساخت یک بچ بدون فاکتور خرید */
export async function recordPurchase(data: {
  productId: string;
  supplierId: string;
  quantity: number;
  unitCost: number;
  note?: string | null;
  /** فقط کالای متری — قانون فاکتور فروش: متراژ = تعداد شاخه × متراژ هر شاخه / ۱۰۰ */
  branchCount?: number;
  branchLength?: number;
  /**
   * تخصیص همین خرید به فاکتورهای فروش: `[{ preInvoiceId, qty }]` —
   * جمعش باید دقیقاً برابر `quantity` باشد و فقط فاکتورهای «تأیید شده» مجاز‌اند.
   * برای کالاهایی که در فاکتور تأییدشده هستند ثبت بدون تخصیص ممکن نیست.
   */
  allocations?: { preInvoiceId: string; qty: number }[];
}) {
  const unitCost = Number(data.unitCost);
  if (!(unitCost >= 0)) throw new Error("قیمت نامعتبر است");

  const [product, supplier] = await Promise.all([
    prisma.product.findUnique({ where: { id: data.productId }, select: { id: true, isMeter: true, name: true } }),
    prisma.party.findUnique({ where: { id: data.supplierId }, select: { id: true, kind: true, name: true } }),
  ]);
  if (!product) throw new Error("کالا پیدا نشد");
  if (!supplier) throw new Error("تأمین‌کننده پیدا نشد");

  let quantity = Number(data.quantity);

  if (product.isMeter) {
    // قانون تعداد و متراژ: تعداد شاخه × متراژ هر شاخه (cm) ÷ ۱۰۰ = متر
    const hasBranch = data.branchCount != null && data.branchLength != null;
    if (hasBranch) {
      const bc = Number(data.branchCount);
      const bl = Number(data.branchLength);
      if (!Number.isFinite(bc) || bc <= 0) throw new Error("تعداد شاخه باید بزرگ‌تر از صفر باشد");
      if (!Number.isFinite(bl) || bl <= 0) throw new Error("متراژ هر شاخه نامعتبر است");
      quantity = (bc * bl) / 100;
    }
    if (!(quantity > 0)) throw new Error("متراژ باید بزرگ‌تر از صفر باشد");
  } else {
    if (!(quantity > 0)) throw new Error("تعداد باید بزرگ‌تر از صفر باشد");
    quantity = Math.round(quantity);
  }

  // ── تخصیص خرید به فاکتورهای فروش ─────────────────────────────────
  const allocMap = new Map<string, number>();
  for (const a of data.allocations ?? []) {
    const pid = String(a?.preInvoiceId ?? "");
    const q = Number(a?.qty);
    if (!pid) throw new Error("فاکتور مقصد تخصیص را انتخاب کنید");
    if (!Number.isFinite(q) || q < 0) throw new Error("تعداد تخصیص نامعتبر است");
    if (q > 0) allocMap.set(pid, (allocMap.get(pid) ?? 0) + q);
  }
  const allocs = [...allocMap.entries()].map(([preInvoiceId, qty]) => ({ preInvoiceId, qty }));
  const num = (v: number) => String(Math.round(v * 10000) / 10000);

  if (allocs.length) {
    const allocSum = allocs.reduce((s, a) => s + a.qty, 0);
    if (Math.abs(allocSum - quantity) > 0.0001)
      throw new Error(
        `جمع تخصیص (${num(allocSum)}) باید برابر تعداد خرید (${num(quantity)}) باشد`
      );
    const ids = allocs.map((a) => a.preInvoiceId);
    const okCount = await prisma.preInvoice.count({
      where: { id: { in: ids }, cogsAllocation: { status: "APPROVED" } },
    });
    if (okCount !== ids.length) throw new Error("فقط فاکتورهای «تأیید شده» قابل انتخاب‌اند");
  } else {
    // کالایی که در فاکتور تأییدشده هست بدون تخصیص قابل ثبت نیست
    const need = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM pre_invoices p, jsonb_array_elements(p.items) it
      WHERE it->>'productId' = ${data.productId}
        AND EXISTS (SELECT 1 FROM cogs_allocations a
                    WHERE a."preInvoiceId" = p.id AND a.status = 'APPROVED')`;
    if (Number(need[0]?.n ?? 0) > 0)
      throw new Error(
        "این کالا در فاکتور «تأیید شده» هست؛ باید مشخص کنید هر تعداد برای کدام فاکتور است"
      );
  }

  // خرید = ما بدهکاریم → مبلغ مثبت در حساب تأمین‌کننده (نوع ۴۰، مطابق دفتر قدیمی)
  const total = quantity * unitCost;
  const jDate = toJalali(todayIso());

  const created = await prisma.$transaction(async (tx) => {
    const batch = await tx.productPurchaseBatch.create({
      data: {
        productId: data.productId,
        supplierId: data.supplierId,
        quantity,
        unitCost,
        remainingQty: quantity,
        date: jDate,
        reference: null,
        purchaseInvoiceId: null,
        note: data.note?.trim() || "خرید دستی از لیست خرید",
        allocations: allocs.length ? (allocs as unknown as Prisma.InputJsonValue) : undefined,
        status: "ACTIVE",
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    if (total > 0) {
      const entry = await tx.ledgerEntry.create({
        data: {
          date: jDate,
          voucherType: 40,
          voucher: 1,
          amount: total,
          description: `خرید ${product.name} از ${supplier.name}`,
          partyId: data.supplierId,
          source: "NEW",
        },
      });
      await tx.productPurchaseBatch.update({
        where: { id: batch.id },
        data: { ledgerEntryId: entry.id },
      });
      return { ...batch, ledgerEntryId: entry.id };
    }
    return batch;
  });

  // خرید جدید ثبت شد → بهای تمام‌شدهٔ فاکتورهای تأییدشده‌ای که این کالا را فروخته‌اند
  // همان لحظه دوباره محاسبه می‌شود (فاکتورِ تأییدشدهٔ بدون خرید صفر نماند)
  await safeRecalcApprovedCogs({ productIds: [data.productId] });
  return created;
}

/** حذف خرید دستی (فقط بدون فاکتور خرید) */
export async function deleteManualPurchase(batchId: string) {
  const b = await prisma.productPurchaseBatch.findUnique({ where: { id: batchId } });
  if (!b) throw new Error("رکورد پیدا نشد");
  if (b.purchaseInvoiceId) throw new Error("این رکورد از فاکتور خرید ساخته شده و قابل حذف نیست");
  if (b.remainingQty < b.quantity - 0.0001) {
    throw new Error("بخشی از این خرید مصرف شده؛ قابل حذف نیست");
  }
  await prisma.$transaction(async (tx) => {
    if (b.ledgerEntryId) {
      await tx.ledgerEntry.deleteMany({ where: { id: b.ledgerEntryId } });
    }
    await tx.productPurchaseBatch.delete({ where: { id: batchId } });
  });
  await safeRecalcApprovedCogs({ productIds: [b.productId] });
  return { ok: true };
}

// ──────────────── ۱۲) تب «فاکتورهای خرید» — فاکتورِ روزانهٔ خرید ────────────────

type AllocRef = { preInvoiceId: string; qty: number };

function readAllocs(v: unknown): AllocRef[] {
  if (!Array.isArray(v)) return [];
  const out: AllocRef[] = [];
  for (const raw of v) {
    const a = raw as { preInvoiceId?: unknown; qty?: unknown };
    const pid = a && typeof a.preInvoiceId === "string" ? a.preInvoiceId : "";
    const q = Number(a?.qty);
    if (pid && Number.isFinite(q) && q > 0) out.push({ preInvoiceId: pid, qty: q });
  }
  return out;
}

export type PendingPurchaseGroup = {
  date: string;
  supplierId: string;
  supplierName: string;
  total: number;
  items: {
    batchId: string;
    productId: string | null;
    name: string;
    /** کالای متری: بر حسب متر (نمایش سانتی‌متر) */
    isMeter: boolean;
    quantity: number;
    unitCost: number;
    total: number;
    allocations: AllocRef[];
  }[];
};

export type PurchaseInvoiceRow = {
  id: string;
  number: number;
  date: string;
  total: number;
  status: string;
  /** null یعنی فاکتور ساخته‌شده توسط همین بخش (قابل حذف) */
  legacyId: number | null;
  note: string | null;
  partyName: string | null;
  lines: {
    position: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    productId: string | null;
    isMeter: boolean;
  }[];
  /** تخصیص‌هایی که هنگام ثبت خرید روی بچ‌های این فاکتور ثبت شده */
  allocations: (AllocRef & { productId: string | null })[];
};

/**
 * تب «فاکتورهای خرید»: خریدهایی که هنوز فاکتور نشده‌اند، گروه‌بندی‌شده
 * «هر روز + هر تأمین‌کننده» + فهرست فاکتورهای خرید ثبت‌شده (قدیمی و ساخته‌شده).
 */
export async function getPurchaseInvoiceBoard(): Promise<{
  pending: PendingPurchaseGroup[];
  invoices: PurchaseInvoiceRow[];
}> {
  const [batches, invoices] = await Promise.all([
    prisma.productPurchaseBatch.findMany({
      where: { purchaseInvoiceId: null },
      orderBy: [{ date: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        date: true,
        productId: true,
        quantity: true,
        unitCost: true,
        allocations: true,
        product: { select: { name: true, isMeter: true } },
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.purchaseInvoice.findMany({
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 120,
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        status: true,
        legacyId: true,
        note: true,
        party: { select: { name: true } },
        lines: {
          orderBy: { position: "asc" },
          select: { position: true, name: true, quantity: true, unitPrice: true, total: true, productId: true },
        },
      },
    }),
  ]);

  // گروه‌بندی خریدهای بدون فاکتور: هر روز + هر تأمین‌کننده = یک فاکتور
  const map = new Map<string, PendingPurchaseGroup>();
  for (const b of batches) {
    const key = `${b.date}|${b.supplier.id}`;
    const g =
      map.get(key) ??
      { date: b.date, supplierId: b.supplier.id, supplierName: b.supplier.name, total: 0, items: [] };
    const lineTotal = Number(b.quantity) * Number(b.unitCost);
    g.total += lineTotal;
    g.items.push({
      batchId: b.id,
      productId: b.productId,
      name: b.product.name,
      isMeter: b.product.isMeter === true,
      quantity: Number(b.quantity),
      unitCost: Number(b.unitCost),
      total: lineTotal,
      allocations: readAllocs(b.allocations),
    });
    map.set(key, g);
  }
  const pending = [...map.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.supplierName.localeCompare(b.supplierName, "fa")
  );

  // تخصیص‌های ثبت‌شده روی بچ‌های هر فاکتور (برای نمایش در جزئیات)
  const invIds = invoices.map((i) => i.id);
  const linked = invIds.length
    ? await prisma.productPurchaseBatch.findMany({
        where: { purchaseInvoiceId: { in: invIds } },
        select: { purchaseInvoiceId: true, productId: true, allocations: true },
      })
    : [];
  const allocByInv = new Map<string, (AllocRef & { productId: string | null })[]>();
  for (const b of linked) {
    if (!b.purchaseInvoiceId) continue;
    for (const a of readAllocs(b.allocations)) {
      const arr = allocByInv.get(b.purchaseInvoiceId) ?? [];
      arr.push({ productId: b.productId, ...a });
      allocByInv.set(b.purchaseInvoiceId, arr);
    }
  }

  // کالای متری؟ (برای نمایش سانتی‌متر در خطوط فاکتور)
  const linePids = [
    ...new Set(
      invoices.flatMap((i) => i.lines.map((l) => l.productId).filter((p): p is string => !!p))
    ),
  ];
  const lineProds = linePids.length
    ? await prisma.product.findMany({ where: { id: { in: linePids } }, select: { id: true, isMeter: true } })
    : [];
  const isMeterMap = new Map(lineProds.map((p) => [p.id, p.isMeter === true]));

  return {
    pending,
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      date: i.date,
      total: i.total,
      status: i.status,
      legacyId: i.legacyId,
      note: i.note,
      partyName: i.party?.name ?? null,
      lines: i.lines.map((l) => ({
        ...l,
        isMeter: l.productId ? isMeterMap.get(l.productId) === true : false,
      })),
      allocations: allocByInv.get(i.id) ?? [],
    })),
  };
}

/**
 * ساخت «فاکتور خرید» برای خریدهای یک روزِ یک تأمین‌کننده:
 * بچ‌ها به فاکتور وصل می‌شوند تا «خرید کل» (KPI) دوباره‌حسابی نشود —
 * سند دفتر (نوع ۴۰) قبلاً هنگام ثبت خرید خورده و دوباره ساخته نمی‌شود.
 */
export async function createDailyPurchaseInvoice(r: { date: string; supplierId: string }) {
  const date = String(r.date ?? "").trim();
  const supplierId = String(r.supplierId ?? "").trim();
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) throw new Error("تاریخ نامعتبر است");
  if (!supplierId) throw new Error("تأمین‌کننده را انتخاب کنید");

  const [supplier, batches] = await Promise.all([
    prisma.party.findUnique({ where: { id: supplierId }, select: { id: true, name: true } }),
    prisma.productPurchaseBatch.findMany({
      where: { purchaseInvoiceId: null, date, supplierId },
      select: { id: true, productId: true, quantity: true, unitCost: true, product: { select: { name: true } } },
    }),
  ]);
  if (!supplier) throw new Error("تأمین‌کننده پیدا نشد");
  if (!batches.length) throw new Error("خریدی برای این روز و تأمین‌کننده پیدا نشد");

  // خط فاکتور: یک ردیف برای هر کالا (جمع خریدهای همان روز)
  const groups = new Map<
    string,
    { name: string; productId: string | null; quantity: number; total: number }
  >();
  for (const b of batches) {
    const key = b.productId ?? `n:${b.product.name}`;
    const g = groups.get(key) ?? { name: b.product.name, productId: b.productId, quantity: 0, total: 0 };
    g.quantity += Number(b.quantity);
    g.total += Number(b.quantity) * Number(b.unitCost);
    groups.set(key, g);
  }
  const lines = [...groups.values()].filter((g) => g.quantity > 0 || g.total > 0);
  const total = lines.reduce((s, l) => s + l.total, 0);

  const maxNo = await prisma.purchaseInvoice.aggregate({ _max: { number: true } });
  const number = (maxNo._max.number ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    const inv = await tx.purchaseInvoice.create({
      data: {
        number,
        date,
        partyId: supplierId,
        total,
        status: "DONE",
        note: `ساخته‌شده خودکار از خریدهای ${date} (${supplier.name})`,
        lines: {
          create: lines.map((l, i) => ({
            position: i + 1,
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.quantity > 0 ? l.total / l.quantity : 0,
            total: l.total,
            productId: l.productId,
          })),
        },
      },
      select: { id: true, number: true, date: true, total: true },
    });
    await tx.productPurchaseBatch.updateMany({
      where: { id: { in: batches.map((b) => b.id) } },
      data: { purchaseInvoiceId: inv.id },
    });
    return inv;
  });
}

/** حذف فاکتور ساخته‌شده در همین تب (فقط ساخته‌شده، نه فاکتورهای قدیمی Access) */
export async function deleteDailyPurchaseInvoice(id: string) {
  const inv = await prisma.purchaseInvoice.findUnique({
    where: { id },
    select: { id: true, legacyId: true, number: true },
  });
  if (!inv) throw new Error("فاکتور پیدا نشد");
  if (inv.legacyId != null) throw new Error("فقط فاکتورهای ساخته‌شده در همین تب قابل حذف‌اند");
  await prisma.$transaction(async (tx) => {
    await tx.productPurchaseBatch.updateMany({
      where: { purchaseInvoiceId: id },
      data: { purchaseInvoiceId: null },
    });
    await tx.purchaseInvoice.delete({ where: { id } });
  });
  return { ok: true };
}
