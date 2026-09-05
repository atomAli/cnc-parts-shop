import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import { extractSpecs, RawProduct } from "./spec-extract";

const DATA_DIR = "/Users/aliarjmandi/Desktop/Projects/cncparts-db/data";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normUrl(u: string): string {
  return u.replace(/^https?:\/\/shop\.cncparts\.ir/, "").split("?")[0];
}

async function main() {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "products.json"), "utf8")) as RawProduct[];
  console.log(`products.json: ${raw.length}`);

  const jobs: { url: string; specs: Record<string, string> }[] = [];
  for (const p of raw) {
    const specs = extractSpecs(p);
    if (Object.keys(specs).length) jobs.push({ url: normUrl(p.url), specs });
  }
  console.log(`jobs: ${jobs.length}`);

  let updated = 0;
  const CHUNK = 40;
  for (let i = 0; i < jobs.length; i += CHUNK) {
    const chunk = jobs.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((j) =>
        prisma.product
          .updateMany({ where: { sourceUrl: { endsWith: j.url } }, data: { specifications: JSON.stringify(j.specs) } })
          .then((r) => r.count)
          .catch((e) => {
            console.error("err on", j.url, String(e).slice(0, 200));
            return 0;
          })
      )
    );
    updated += results.reduce((a, b) => a + b, 0);
    if ((i / CHUNK) % 10 === 0) console.log(`... ${Math.min(i + CHUNK, jobs.length)}/${jobs.length}`);
  }
  console.log(`updated: ${updated} rows`);

  const covered = await prisma.product.count({ where: { specifications: { not: null } } });
  console.log(`products with specs in DB now: ${covered}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());