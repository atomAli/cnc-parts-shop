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
        confirmed.push({ index: i, productId, name, quantity, unitPrice, lineTotal,
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

// ─────────────────────── ۴-ب) حذف تخصیص تأییدشده (توسط مدیر) ──────────────────────
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
  manual: {
    id: string;
    quantity: number;
    unitCost: number;
    total: number;
    date: string;
    supplier: { id: string; name: string } | null;
  }[];
};

/**
 * لیست خرید — سه حالت نمایش:
 *  - `ALL` (پیش‌فرض): جمع همهٔ فاکتورهای «تکمیل شده»ٔ سایت
 *  - `SALES`: فقط کالاهای یک فاکتور فروش؛ «فروش رفته» از همان فاکتور است و
 *    «خریداری‌شده» صفر، چون هیچ خریدی به فاکتور فروش وصل نمی‌شود
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
};

export async function getPurchaseList(
  scope: PurchaseListScope = { kind: "ALL" }
): Promise<PurchaseItem[]> {
  let sold: SoldAgg[] = [];
  let bought: BoughtAgg[] = [];
  let manualRows: ManualRow[] = [];

  if (scope.kind === "SALES") {
    // فقط اقلام همین فاکتور فروش
    sold = await prisma.$queryRaw<SoldAgg[]>`
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
      GROUP BY 1`;
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
    const [s, b] = await Promise.all([
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
    ]);
    sold = s;
    bought = b;
    manualRows = await prisma.productPurchaseBatch.findMany({
      where: { purchaseInvoiceId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        productId: true,
        quantity: true,
        unitCost: true,
        date: true,
        supplier: { select: { id: true, name: true } },
      },
    });
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
    });
    manualMap.set(m.productId, arr);
  }

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

  // خرید = ما بدهکاریم → مبلغ مثبت در حساب تأمین‌کننده (نوع ۴۰، مطابق دفتر قدیمی)
  const total = quantity * unitCost;
  const jDate = toJalali(todayIso());

  return prisma.$transaction(async (tx) => {
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
  return { ok: true };
}
