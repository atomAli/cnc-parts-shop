#!/usr/bin/env node
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = "/Users/aliarjmandi/Desktop/Projects/cncparts-db/data";
const OUT_DIR = join(DATA_DIR, "images");
mkdirSync(OUT_DIR, { recursive: true });

const RAW = JSON.parse(readFileSync(join(DATA_DIR, "products_raw.json"), "utf8"));
const LINKS = JSON.parse(readFileSync(join(DATA_DIR, "product_links.json"), "utf8")).product_links;
const LEAFS = JSON.parse(readFileSync(join(DATA_DIR, "images_leafs.json"), "utf8"));
const TARGETS = JSON.parse(readFileSync(join(DATA_DIR, "images", "images_targets.json"), "utf8")) as {
  slug: string;
  name: string;
  url: string;
  leaf: string;
  group: string;
}[];

const GROUP_MAP: Record<string, string> = {};
for (const t of TARGETS) GROUP_MAP[t.url] = t.group;

function normUrl(u: string): string {
  return u.replace(/^https?:\/\/shop\.cncparts\.ir/, "").split("?")[0];
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchPage(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.text();
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  return null;
}

type PageImgs = { main: string | null; originals: string[] };

function extractOriginals(html: string): PageImgs {
  const seen = new Set<string>();
  const mainCandidates: { orig: string; thumb: string }[] = [];
  const originals: string[] = [];
  const re = /src="(\/images\/shop\/upload\/[^"#?]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const path = m[1];
    if (!path.includes("/thumbnails/")) continue;
    const orig = path.replace(/\/thumbnails\/\d+x\d+[a-z]?\//, "/");
    if (orig.includes("default.jpg")) continue;
    const key = orig;
    if (!seen.has(key)) {
      seen.add(key);
      if (path.includes("600x600f")) mainCandidates.push({ orig, thumb: path });
      originals.push(orig);
    }
  }
  const main = mainCandidates[0]?.orig ?? originals[0] ?? null;
  return { main, originals: [...new Set(originals)] };
}

const manifestPath = join(OUT_DIR, "manifest.json");

async function main() {
  // resume-safe manifest: keyed by original image url
  type Entry = { url: string; group: string; mainFor: string[]; products: string[] };
  let manifest: Record<string, Entry> = {};
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {}

  const pending = TARGETS.map((t) => ({
    slug: t.slug,
    name: t.name,
    url: t.url,
    group: t.group,
  }));
  console.log(`target products: ${pending.length}`);

  let done = 0;
  let withMain = 0;
  const seenPath = join(OUT_DIR, "seen_products.json");
  let seen: string[] = [];
  try {
    seen = JSON.parse(readFileSync(seenPath, "utf8"));
  } catch {}
  const seenSet = new Set(seen);

  for (const prod of pending) {
    if (seenSet.has(prod.slug)) {
      done++;
      continue;
    }
    const html = await fetchPage(prod.url);
    if (!html) {
      console.error("FAIL", prod.url.slice(0, 90));
      continue;
    }
    const { main, originals } = extractOriginals(html);
    const origins = main ? [main, ...originals.filter((o) => o !== main)] : originals;
    if (main) withMain++;
    for (const orig of origins) {
      if (!manifest[orig]) manifest[orig] = { url: orig, group: prod.group, mainFor: [], products: [] };
      if (!manifest[orig].products.includes(prod.slug)) manifest[orig].products.push(prod.slug);
      if (orig === main) manifest[orig].mainFor.push(prod.slug);
    }
    done++;
    seen.push(prod.slug);
    if (done % 40 === 0) {
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
      writeFileSync(seenPath, JSON.stringify(seen));
      console.log(`... ${done}/${pending.length} (main: ${withMain}, uniq imgs: ${Object.keys(manifest).length})`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  writeFileSync(seenPath, JSON.stringify(seen));
  console.log(`DONE ${done}/${pending.length} | with main: ${withMain}`);
  console.log(`unique images: ${Object.keys(manifest).length}`);
  writeFileSync(join(OUT_DIR, "summary.txt"), [
    `products=${done}`,
    `with_main=${withMain}`,
    `unique_images=${Object.keys(manifest).length}`,
  ].join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});