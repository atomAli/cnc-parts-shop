const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const DEFAULT_FROM = "فروشگاه شیک <info@shik.app>";

export interface PreInvoiceItem {
  name: string;
  price: number;
  quantity: number;
  isMeter?: boolean;
  branchCount?: number;
  branchLength?: number;
  baseLength?: number;
}

export interface PreInvoiceMailData {
  id: string;
  customerName: string;
  customerPhone: string;
  items: PreInvoiceItem[];
  totalPrice: number;
  createdAt: Date | string;
}

function faNum(value: string | number): string {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(value).replace(/[0-9]/g, (d) => fa[parseInt(d, 10)]);
}

function formatPrice(price: number): string {
  return faNum(new Intl.NumberFormat("en-US").format(Math.round(price))) + " تومان";
}

function renderItems(items: PreInvoiceItem[]): string {
  return items
    .map((item) => {
      let line = `<strong>${item.name.replace(/</g, "&lt;")}</strong>`;
      if (item.isMeter && item.branchCount && item.branchLength) {
        line += `<div style="font-size:12px;color:#666;margin-top:2px">تعداد ${item.quantity || 1} × (${item.branchCount} شاخه × ${item.branchLength} سانتی‌متر) × ${formatPrice(item.price)} /${item.baseLength || 400} سانتی‌متر</div>`;
        const total =
          (item.quantity || 1) *
          item.branchCount *
          (item.branchLength / (item.baseLength || 400)) *
          item.price;
        line += `<div style="font-size:13px;color:#111;margin-top:2px">جمع: ${formatPrice(total)}</div>`;
      } else {
        line += `<div style="font-size:12px;color:#666;margin-top:2px">تعداد: ${faNum(item.quantity)} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}</div>`;
      }
      return `<div style="border:1px solid #eee;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fafafa">${line}</div>`;
    })
    .join("");
}

export async function sendPreInvoiceEmail(data: PreInvoiceMailData, toEmail: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping pre-invoice email");
    return false;
  }
  const to = (toEmail || "").trim();
  if (!to) {
    console.warn("no recipient email — skipping pre-invoice email");
    return false;
  }

  const date = new Date(data.createdAt);
  const itemsHtml = renderItems(data.items);
  const html = `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f4f4f5;padding:24px;color:#111">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#b45309;padding:14px 20px">
        <div style="color:#fff;font-size:18px;font-weight:bold">فروشگاه شیک</div>
        <div style="color:#fcd9a8;font-size:13px">شیک خرید کنید</div>
      </div>
      <div style="padding:22px">
        <h2 style="margin:0 0 6px;font-size:17px">پیش‌فاکتور جدید ثبت شد</h2>
        <div style="font-size:13px;color:#666;margin-bottom:16px">شناسه: ${faNum(data.id)} • ${faNum(
          date.toLocaleDateString("fa-IR")
        )} — ${faNum(date.toLocaleTimeString("fa-IR"))}</div>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="font-size:12px;color:#92400e;margin-bottom:4px">مشخصات مشتری</div>
          <div style="font-size:14px;font-weight:bold">${data.customerName.replace(/</g, "&lt;")}</div>
          <div style="font-size:13px;direction:ltr;text-align:right;margin-top:2px">${faNum(
            data.customerPhone
          )}</div>
        </div>

        <div style="font-size:13px;font-weight:bold;margin-bottom:8px">اقلام</div>
        ${itemsHtml}

        <div style="border-top:2px solid #b45309;margin-top:14px;padding-top:12px;display:flex;justify-content:space-between;font-size:15px">
          <span>جمع کل:</span>
          <strong>${formatPrice(data.totalPrice)}</strong>
        </div>
      </div>
    </div>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: [to],
      subject: `پیش‌فاکتور جدید — ${data.customerName}`,
      html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.warn("Resend error:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}