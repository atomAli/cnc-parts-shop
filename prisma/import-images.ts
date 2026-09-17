#!/usr/bin/env node
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { storeImage } from "../src/lib/image-store";

// IMG_SRC_DIR: folder with the images to attach (default orig for the mapping test).
// CLEAR_IMAGES=1: remove all ProductImage rows and delete their blobs, then exit.
const OUT_DIR = process.env.IMG_OUT_DIR ?? "/Users/aliarjmandi/Desktop/Projects/cncparts-db/data/images";
const SRC = process.env.IMG_SRC_DIR ?? join(OUT_DIR, "orig");
const CLEAR = process.env.CLEAR_IMAGES === "1";

const manifest = JSON.parse(
  readFileSync(join(OUT_DIR, "manifest.json"), "utf8")
) as Record<string, { url: string; group: string; mainFor: string[]; products: string[] }>;
const mapFile = JSON.parse(
  readFileSync(join(OUT_DIR, "originals_map.json"), "utf8")
) as Record<string, string | null>;
const targets = JSON.parse(
  readFileSync(join(OUT_DIR, "images_targets.json"), "utf8")
) as { slug: string; name: string; url: string; leaf: string; group: string }[];

const nameOf = new Map(targets.map((t) => [t.slug, t.name]));

async function clearImages(prisma: PrismaClient) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing");
  const rows = await prisma.productImage.findMany({ select: { url: true } });
  const urls = [...new Set(rows.map((r) => r.url))];
  const { del } = await import("@vercel/blob");
  let deleted = 0;
  // delete blobs in batches (blob del takes up to 1000 urls)
  for (let i = 0; i < urls.length; i += 500) {
    const chunk = urls.slice(i, i + 500);
    await del(chunk, { token: process.env.BLOB_READ_WRITE_TOKEN });
    deleted += chunk.length;
  }
  const n = await prisma.productImage.deleteMany({});
  console.log(`CLEARED blobs=${deleted} productImageRows=${n.count}`);
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  if (CLEAR) {
    await clearImages(prisma);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const slugs = new Set(Object.values(manifest).flatMap((e) => e.products));
  const existing = await prisma.productImage.findMany({
    where: { product: { slug: { in: [...slugs] } } },
    select: { product: { select: { slug: true } } },
    distinct: ["productId"],
  });
  const skipSlugs = new Set(existing.map((e) => e.product.slug));
  console.log(`source=${SRC} targets=${slugs.size} already-have-images=${skipSlugs.size}`);

  const idOf = new Map(
    (await prisma.product.findMany({ where: { slug: { in: [...slugs] } }, select: { id: true, slug: true } })).map(
      (p) => [p.slug, p.id]
    )
  );

  let uploaded = 0;
  let attached = 0;
  let skippedImg = 0;
  let failed = 0;
  const urlCache = new Map<string, string>();

  const filesIn = new Set(
    (await import("fs")).readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f))
  );
  const stemOf = (f: string) => f.replace(/\.(jpe?g|png)$/i, "").toLowerCase();
  const byStem = new Map<string, string>();
  for (const f of filesIn) byStem.set(stemOf(f), f);
  for (const [origPath, entry] of Object.entries(manifest)) {
    const fname = mapFile[origPath];
    if (!fname) {
      failed++;
      continue;
    }
    // match by filename stem (extension may differ: .png vs .jpg)
    const actual = byStem.get(stemOf(fname));
    if (!actual) {
      skippedImg++;
      continue;
    }
    const filePath = join(SRC, actual);
    let buffer: Buffer;
    try {
      buffer = readFileSync(filePath);
    } catch {
      skippedImg++;
      continue;
    }
    let url = urlCache.get(actual);
    if (!url) {
      const ext = fname.split(".").pop()!.toLowerCase() === "png" ? "png" : "jpg";
      try {
        const stored = await storeImage(buffer, ext, ext === "png" ? "image/png" : "image/jpeg");
        url = stored.url;
      } catch (e) {
        console.error("UPLOAD FAIL", fname, String(e).slice(0, 120));
        failed++;
        continue;
      }
      urlCache.set(actual, url);
      uploaded++;
    }

    const prods = entry.products.filter((slug) => !skipSlugs.has(slug));
    if (prods.length === 0) continue;
    const primary = new Set(entry.mainFor);
    const rows = prods
      .filter((slug) => idOf.has(slug))
      .map((slug, i) => ({
        url: url!,
        alt: nameOf.get(slug) ?? null,
        isPrimary: primary.has(slug),
        order: primary.has(slug) ? 0 : i + 1,
        productId: idOf.get(slug)!,
      }));
    await prisma.productImage.createMany({ data: rows });
    attached += rows.length;
    if ((uploaded + failed) % 50 === 0)
      console.log(`... uploaded=${uploaded} attached=${attached} skipped=${skippedImg} failed=${failed}`);
  }

  console.log(`DONE uploaded=${uploaded} attached=${attached} skipped=${skippedImg} failed=${failed}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});