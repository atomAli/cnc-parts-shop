import { readFileSync } from "fs";
import { join } from "path";

const DIR = process.env.LOCAL_IMAGES_DIR?.trim() || "";
const INDEX_PATH = process.env.LOCAL_IMAGES_INDEX || (DIR ? join(DIR, "..", "image_to_products.json") : "");

type Entry = { file: string; isMain: boolean };
let index: Record<string, Entry[]> | null | undefined;

function loadIndex(): Record<string, Entry[]> | null {
  if (process.env.NODE_ENV !== "development" || !DIR) return null;
  if (index !== undefined) return index;
  try {
    const rows = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as {
      file: string;
      products: { slug: string; main: boolean }[];
    }[];
    const map: Record<string, Entry[]> = {};
    for (const r of rows) {
      for (const p of r.products) {
        const list = (map[p.slug] ??= []);
        if (!list.some((e) => e.file === r.file)) list.push({ file: r.file, isMain: p.main });
      }
    }
    index = map;
  } catch {
    index = {};
  }
  return index;
}

export function localImages(slug: string, isAdmin: boolean) {
  const map = loadIndex();
  if (!map) return null;
  const all = map[slug] || [];
  const main = all.filter((e) => e.isMain);
  const gallery = all.filter((e) => !e.isMain);
  const ordered = [...main, ...gallery];
  const keep = isAdmin ? ordered : main.length ? main.slice(0, 1) : ordered.slice(0, 1);
  return keep.map((e, i) => ({
    id: "",
    url: `/local-image/${encodeURIComponent(e.file)}`,
    alt: "",
    isPrimary: e.isMain || keep.length === 1,
  }));
}