import "dotenv/config";
import Database from "better-sqlite3";
import { readFile } from "fs/promises";
import { join } from "path";
import { put } from "@vercel/blob";
import prisma from "../src/lib/prisma";

const SRC_DB = process.env.SRC_DB || "dev.db";
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");
const CONCURRENCY = 8;

async function uploadOne(file: string, token: string): Promise<string> {
  const buffer = await readFile(join(UPLOADS_DIR, file));
  const { url } = await put(file, buffer, { access: "public", token });
  return url;
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is required to upload images.");
    process.exit(1);
  }

  const sqlite = new Database(SRC_DB, { readonly: true });
  const rows = sqlite
    .prepare(
      `SELECT DISTINCT url FROM product_images WHERE url LIKE '/uploads/%'`
    )
    .all() as { url: string }[];

  const files = rows
    .map((r) => r.url.replace(/^\/uploads\//, ""))
    .filter((f) => f && !f.includes("/"));
  console.log(`uploading ${files.length} unique images...`);

  const map = new Map<string, string>();
  let i = 0;
  while (i < files.length) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((f) => uploadOne(f, token)));
    results.forEach((res, idx) => {
      const f = batch[idx];
      if (res.status === "fulfilled") {
        map.set(f, res.value);
      } else {
        console.error("FAILED:", f, (res.reason as Error).message.slice(0, 120));
      }
    });
    i += CONCURRENCY;
    if (i % 100 === 0 || i >= files.length) console.log(`  ${Math.min(i, files.length)}/${files.length}`);
  }

  console.log(`uploaded ${map.size}, updating database...`);
  let updated = 0;
  const stmt = sqlite.prepare(
    "UPDATE product_images SET url = ? WHERE url = ?"
  );
  for (const [file, blobUrl] of map) {
    const oldUrl = `/uploads/${file}`;
    const r = await prisma.productImage.updateMany({
      where: { url: oldUrl },
      data: { url: blobUrl },
    });
    updated += r.count;
    stmt.run(blobUrl, oldUrl);
  }

  sqlite.close();
  console.log(`DONE. ${updated} product_image rows now point to the blob bucket.`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());