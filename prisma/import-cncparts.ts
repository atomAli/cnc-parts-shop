import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = "/Users/aliarjmandi/Desktop/Projects/cncparts-db/data";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type RawProduct = {
  url: string;
  title: string;
  price: number | null;
  cid: number | null;
  short_description: string[];
  long_description: string;
  specifications: Record<string, string> | null;
};

function normUrl(u: string): string {
  return u.replace(/^https?:\/\/shop\.cncparts\.ir/, "").split("?")[0];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&rlm;|&lrm;/g, "")
    .replace(/&#\d+;/g, "");
}

function stripHtmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li|tr|h\d|blockquote|ul|ol|table)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u0652\u200c\u200f\u202a-\u202e]/g, "");
}

const BRANDS: { name: string; slug: string; patterns: string[] }[] = [
  { name: "اچ کیو ام (HQM)", slug: "hqm", patterns: ["hqm", "اچ کیو ام"] },
  { name: "اچ کیو دی (HQD)", slug: "hqd", patterns: ["hqd", "اچ کیو دی"] },
  { name: "اچ اس دی (HSD)", slug: "hsd", patterns: ["hsd", "اچ اس دی"] },
  { name: "دلتا (Delta)", slug: "delta", patterns: ["delta", "دلتا"] },
  { name: "اینوت (INVT)", slug: "invt", patterns: ["invt", "اینوت"] },
  { name: "آلفا (Alpha)", slug: "alpha", patterns: ["alpha", "آلفا"] },
  { name: "لیمینگ (Liming)", slug: "liming", patterns: ["liming", "لیمینگ"] },
  { name: "های وین (Hiwin)", slug: "hiwin", patterns: ["hiwin", "های وین", "هایوین"] },
  { name: "فوتک (Fotek)", slug: "fotek", patterns: ["fotek", "فوتک"] },
  { name: "رادونیکس (Radonix)", slug: "radonix", patterns: ["radonix", "رادونیکس"] },
  { name: "هرتز (Hertz)", slug: "hertz", patterns: ["hertz", "هرتز"] },
  { name: "لیدشاین (Leadshine)", slug: "leadshine", patterns: ["leadshine", "لیدشاین"] },
  { name: "سامیک (Samick)", slug: "samick", patterns: ["samick", "سامیک", "سامی"] },
  { name: "ایشین تول (Asiantool)", slug: "asiantool", patterns: ["asiantool", "ایشین تول", "ایشین", "ایشن"] },
  { name: "یاسکاوا (Yaskawa)", slug: "yaskawa", patterns: ["yaskawa", "یاسکاوا", "یاسکاو"] },
  { name: "مچ تری (Mach3)", slug: "mach3", patterns: ["mach3", "مچ تری"] },
  { name: "جی ام سی (JMC)", slug: "jmc", patterns: ["jmc", "جی ام سی"] },
  { name: "جی اس کی (GSK)", slug: "gsk", patterns: ["gsk"] },
  { name: "اس بی ال (SBL)", slug: "sbl", patterns: ["sbl", "اس بی ال"] },
  { name: "دِسی (DECI)", slug: "deci", patterns: ["deci", "دسی"] },
  { name: "اس\u200cپیندل سی سی (CC)", slug: "cc", patterns: ["spindle cc", "اسپینل سی سی"] },
  { name: "لینکان (Linkan)", slug: "linkan", patterns: ["linkan", "لینکان"] },
  { name: "امرون (Omron)", slug: "omron", patterns: ["omron", "امرون"] },
];

function detectBrand(title: string): string | null {
  const t = normalizeText(title);
  for (const b of BRANDS) {
    if (b.patterns.some((p) => t.includes(normalizeText(p)))) return b.slug;
  }
  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/[’'‘`]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "-")
    .replace(/[\s\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MECHANICAL_SLUGS = new Set([
  "LinearBallbearing",
  "rail-wagon",
  "ball-screw-nut-support",
  "cable-carrier-topline",
  "planetary-spiral-gearbox",
  "coupling",
  "liming-gearbox",
  "bearings",
  "gear-rack-pinion",
  "cable-carrier",
  "ball-bearing",
  "snail-gearbox",
  "lubricating",
  "gearbox-accessories",
  "snail-gearbox-liming",
  "shaft",
  "شفت-خام-هاردکروم",
  "aluminium-profiles",
  "گیربکس-1-به-10",
  "sbl-gearbox",
  "belt-gearbox",
  "aluminum-bracket",
  "شفت-پایه-دار-هاردکروم",
]);

function parentSlugFor(catSlug: string): string {
  return MECHANICAL_SLUGS.has(catSlug) ? "mechanical" : "electrical";
}

async function main() {
  const products = JSON.parse(
    readFileSync(join(DATA_DIR, "products.json"), "utf-8")
  ) as RawProduct[];
  const links = JSON.parse(
    readFileSync(join(DATA_DIR, "product_links.json"), "utf-8")
  ).product_links as Record<string, string>;
  const names = JSON.parse(
    readFileSync(join(DATA_DIR, "category_names.json"), "utf-8")
  ) as Record<string, string>;

  const linkMap = new Map<string, string>();
  for (const [u, cat] of Object.entries(links)) linkMap.set(normUrl(u), cat);

  let matched = 0;
  for (const p of products) {
    const catPath = linkMap.get(normUrl(p.url));
    if (catPath) {
      (p as RawProduct & { categorySlug?: string }).categorySlug = catPath.replace(
        "/categories/category/",
        ""
      );
      matched++;
    }
  }
  console.log(`matched ${matched}/${products.length}`);

  const catCount = new Map<string, number>();
  for (const p of products) {
    const s = (p as RawProduct & { categorySlug?: string }).categorySlug;
    if (s) catCount.set(s, (catCount.get(s) || 0) + 1);
  }
  const maxCount = Math.max(...catCount.values());

  const parents = [
    { name: "برقی و اتوماسیون", slug: "electrical", description: "قطعات برقی و اتوماسیون صنعتی" },
    { name: "مکانیکی و حرکتی", slug: "mechanical", description: "قطعات مکانیکی و حرکتی دستگاه‌های CNC" },
  ];

  // Backup current data before wiping
  const backup: Record<string, unknown> = {};
  for (const table of [
    "order_items",
    "cart_items",
    "orders",
    "product_images",
    "products",
    "categories",
    "brands",
  ] as const) {
    backup[table] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
  }
  writeFileSync(
    join(DATA_DIR, "_catalog_backup_" + Date.now() + ".json"),
    JSON.stringify(backup, null, 2)
  );
  console.log("backup written");

  // Cleanup in FK-safe order
  await prisma.$executeRawUnsafe(`DELETE FROM "order_items"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "cart_items"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "orders"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "product_images"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "products"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "categories"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "brands"`);
  console.log("cleaned");

  // Categories
  const categoryIdByName = new Map<string, string>();
  for (const p of parents) {
    const created = await prisma.category.create({ data: p });
    categoryIdByName.set(p.slug, created.id);
  }

  const childCount = new Map<string, number>();
  for (const [slug] of catCount) {
    const child = await prisma.category.create({
      data: {
        name: names["/categories/category/" + slug] || slug,
        slug,
        description: "",
        parentId: categoryIdByName.get(parentSlugFor(slug)),
        order: maxCount - (catCount.get(slug) || 0),
      },
    });
    childCount.set(slug, child.id);
  }
  console.log(`categories created: ${parents.length} parents + ${childCount.size} children`);

  // Brands
  const brandSlugById = new Map<string, string>();
  const brandSlugSeen = new Set<string>();
  for (const p of products) {
    const brandSlug = detectBrand(p.title);
    if (brandSlug && !brandSlugSeen.has(brandSlug)) {
      const meta = BRANDS.find((b) => b.slug === brandSlug)!;
      const created = await prisma.brand.create({
        data: { name: meta.name, slug: meta.slug },
      });
      brandSlugById.set(created.slug, created.id);
      brandSlugSeen.add(brandSlug);
    }
  }
  console.log(`brands created: ${brandSlugById.size}`);

  // Products
  const usedSlugs = new Set<string>();
  let meterAuto = 0;
  const rows = products.map((p) => {
    let slug = slugify(p.title) || "product";
    let i = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(p.title)}-${i++}`;
    usedSlugs.add(slug);

    const shortLines = (p.short_description || []).map((s) => s.trim()).filter(Boolean);
    const longText = stripHtmlToText(p.long_description || "");
    const descriptionLines = [...shortLines.map((s) => `• ${s}`)];
    if (longText) descriptionLines.push(longText);
    const description = descriptionLines.join("\n\n");

    const specs = Object.fromEntries(
      Object.entries(p.specifications || {}).filter(([, v]) => String(v).trim() !== "")
    );

    const catSlug = (p as RawProduct & { categorySlug?: string }).categorySlug || "";
    const sub = catSlug;
    const name = p.title || "";
    const railSlugs = ["linear-guide", "rail-wagon", "hqm-rail", "hiwin-rail", "hqm-wagon", "hiwin-wagon"];
    const screwSlugs = ["ball-screw", "ballscrew", "ball-screw-nut-support", "nut-support"];
    const isMeter =
      (railSlugs.includes(sub) && name.includes("ریل")) ||
      (screwSlugs.includes(sub) &&
        !name.includes("مهره") &&
        !name.includes("ساپورت") &&
        (name.startsWith("بالسکرو") || name.startsWith("پیچ بال اسکرو")));

    if (isMeter) meterAuto++;

    return {
      name,
      slug,
      description,
      price: p.price ?? 0,
      stock: 0,
      sku: p.cid != null ? String(p.cid) : null,
      isMeter: null,
      sourceUrl: p.url,
      specifications: Object.keys(specs).length ? JSON.stringify(specs) : null,
      categoryId: childCount.get(catSlug) || "",
      brandId: brandSlugById.get(detectBrand(name) || "") || null,
      active: true,
      featured: false,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  });

  const invalid = rows.filter((r) => !r.categoryId);
  if (invalid.length) {
    console.error(`ERROR: ${invalid.length} products without a category`);
    process.exit(1);
  }

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await prisma.product.createMany({ data: chunk });
    console.log(`inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log("---- SUMMARY ----");
  console.log(`products: ${await prisma.product.count()}`);
  console.log(`categories: ${await prisma.category.count()}`);
  console.log(`brands: ${await prisma.brand.count()}`);
  console.log(`orders: ${await prisma.order.count()}`);
  console.log(`meterAuto-detected: ${meterAuto}`);
  const noPrice = rows.filter((r) => !r.price).length;
  console.log(`price 0 (تماس بگیرید): ${noPrice}`);
  const withSpecs = rows.filter((r) => r.specifications).length;
  console.log(`products with specs: ${withSpecs}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());