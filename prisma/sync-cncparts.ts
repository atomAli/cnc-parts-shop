import "dotenv/config";
import prisma from "../src/lib/prisma";

const BASE = "https://shop.cncparts.ir";
const CATEGORY_SLUGS = [
  // mechanical
  "rail-wagon", "LinearBallbearing", "ball-screw-nut-support", "ball-bearing", "bearings",
  "aluminium-profiles", "cable-carrier", "cable-carrier-topline", "shaft",
  "planetary-spiral-gearbox", "liming-gearbox", "snail-gearbox", "snail-gearbox-liming",
  "belt-gearbox", "sbl-gearbox", "gear-rack-pinion", "coupling", "gearbox-accessories",
  // electrical
  "slip-ring-rotary-connector", "radonix-controller", "controller-data-cable", "mach3-controller",
  "hqm-controller", "hqm-step-motor-step-drive", "leadshine-steppermotor", "hqm-spindle-motor",
  "hqd-spindle-motor", "hertz-spindle-motor", "spindle-deci", "servo-spindle", "servo-motor",
  "powerdc", "linkan-electrical-jack", "laser", "plc-delta", "hmi-delta",
  "oil-vacuum-pump", "lubricating", "اینورتر-دلتا-آلفا-فوتک-invt",
];

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 16;

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u200c\u064e\u064f\u0651\u0652]/g, "")
    .replace(/[^\w\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// ---- STEP 1: build normalized name -> product url map ----
async function buildUrlMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const seen = new Set<string>();
  for (const slug of CATEGORY_SLUGS) {
    const url = `${BASE}/categories/category/${encodeURIComponent(slug)}?limit=500`;
    try {
      const html = await fetchHtml(url);
      const links = [...html.matchAll(/<a[^>]*href="(\/categories\/[^"]+category_pathway-\d+)"[^>]*title="([^"]*)"[^>]*>/g)];
      for (const [, href, title] of links) {
        const n = norm(title);
        if (!n || seen.has(n)) continue;
        seen.add(n);
        map.set(n, href);
      }
    } catch (e) {
      console.log(`  skip ${slug}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return map;
}

// ---- STEP 2: parse a product page ----
function parsePrice(html: string): number {
  const m = html.match(/itemprop="price" content="(\d+)"/);
  return m ? parseInt(m[1]) : 0;
}

function parseSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const rows = [...html.matchAll(
    /<tr[^>]*>\s*<td class="key">\s*<span[^>]*class="hikashop_product_custom_name"[^>]*>\s*<label[^>]*>([^<]+)<\/label>\s*<\/span>\s*<\/td>\s*<td>\s*<span[^>]*class="hikashop_product_custom_value"[^>]*>\s*([^<]*?)\s*<\/span>\s*<\/td>\s*<\/tr>/g
  )];
  for (const [, key, value] of rows) {
    const k = key.trim(), v = value.trim();
    if (k && v) specs[k] = v;
  }
  return specs;
}

function jsonSpecs(o: Record<string, string>): string | null {
  return Object.keys(o).length ? JSON.stringify(o, null, 2) : null;
}

function pct(a: number, b: number): number | null {
  if (a === b) return null;
  return Math.round(((a - b) / b) * 1000) / 10;
}

async function main() {
  console.log(`mode: ${DRY_RUN ? "DRY-RUN" : "UPDATE"}`);
  console.log("STEP 1: building product url map from cncparts.ir...");
  const urlMap = await buildUrlMap();
  console.log(`  url map size: ${urlMap.size}`);

  console.log("STEP 2: fetching matching products...\n");
  const rows = await prisma.product.findMany({
    select: { id: true, name: true, price: true, discountPrice: true, specifications: true },
  });
  console.log(`  total products in DB: ${rows.length}`);

  interface Target {
    product: typeof rows[0];
    href: string;
  }
  const targets: Target[] = [];
  for (const p of rows) {
    const href = urlMap.get(norm(p.name));
    if (href) targets.push({ product: p, href });
  }
  console.log(`  matched on site: ${targets.length}\n`);

  let updated = 0, changedPrice = 0, changedSpecs = 0;
  let unmatched: string[] = [];
  let i = 0;
  while (i < targets.length) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ({ product, href }) => {
        const html = await fetchHtml(BASE + href);
        const price = parsePrice(html);
        const specsObj = parseSpecs(html);
        const specs = jsonSpecs(specsObj);
        return { product, href, price, specs, prevPrice: product.price };
      })
    );

    await Promise.all(
      results.map(async (res, idx) => {
        const t = batch[idx];
        if (res.status === "rejected") {
          unmatched.push(`${t.product.name} (fetch err: ${res.reason?.message ?? res.reason})`);
          return;
        }
        const { product, href, price, specs, prevPrice } = res.value;
        const dp = pct(price, prevPrice);
        let thisPrice = false, thisSpecs = false;
        if (product.price !== price) { thisPrice = true; }
        if ((specs ?? "{}") !== (product.specifications ?? "{}")) { thisSpecs = true; }

        if (!thisPrice && !thisSpecs) {
          updated++;
          return;
        }

        if (DRY_RUN) {
          updated++; thisPrice && changedPrice++; thisSpecs && changedSpecs++;
          console.log(`[${product.name}] price ${product.price} -> ${price}${dp != null && dp != 0 ? ` (${dp}%)` : ""}${thisSpecs ? " | specs changed" : ""}`);
          return;
        }

        try {
          await prisma.product.update({
            where: { id: product.id },
            data: { price, specifications: specs, sourceUrl: BASE + href },
          });
          updated++; thisPrice && changedPrice++; thisSpecs && changedSpecs++;
          console.log(`updated [${product.name}]`);
        } catch (e) {
          unmatched.push(`${product.name} (update err: ${(e as Error).message})`);
        }
      })
    );

    i += CONCURRENCY;
    if (i % Math.max(100, CONCURRENCY) === 0 || i >= targets.length)
      console.log(`  progress ${Math.min(i, targets.length)}/${targets.length}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("\n=== SUMMARY ===");
  console.log(`scanned: ${targets.length}`);
  console.log(`updated: ${updated}, price changes: ${changedPrice}, spec changes: ${changedSpecs}`);
  console.log(`unmatched/missing: ${unmatched.length}`);
  if (unmatched.length) console.log(unmatched.slice(0, 30).join("\n"));
  if (!DRY_RUN && updated) console.log("sourceUrl set on updated products.");
}

main()
  .catch((e) => { console.error("ERR", (e as Error).stack || (e as Error).message); process.exit(1); })
  .finally(() => prisma.$disconnect());