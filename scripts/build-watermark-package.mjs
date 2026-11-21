#!/usr/bin/env node
/**
 * آمادهسازی بستهٔ واترمارک بدون تغییر نام فایلها.
 *
 *  - تمام URLهای منحصربهفرد را از دیتابیس میخواند (watermark-package/manifest.json)
 *  - تصاویر dl.shik.app را دانلود و واترمارک میکند → watermark-package/ready/<همان نام>
 *  - تصاویر Vercel Blob را جداگانه واترمارک میکند → watermark-package/blob-ready/<همان نام>
 *  - قابل ادامه است: فایلهای موجود رد میشوند
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { watermarkBuffer } from "./watermark-images.mjs";

const ROOT = path.resolve("watermark-package");
const OPTS = {
  mode: "logo",
  logo: "public/logo.png",
  opacity: 0.55,
  scale: 0.16,
  center: true,
  centerOpacity: 0.28,
  centerScale: 0.55,
  margin: 0.02,
  quality: 85,
  text: "shik.app",
};
const DOWNLOAD_CONCURRENCY = 12;
const WATERMARK_CONCURRENCY = 4;
const RETRIES = 3;

async function pool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

async function existsNonEmpty(p) {
  try {
    const st = await fs.stat(p);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await existsNonEmpty(dest)) return "cached";
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(45_000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; shik-watermark/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) throw new Error("پاسخ خالی");
      //validate decode before writing
      const meta = await sharp(buf, { failOn: "error" }).metadata();
      if (!meta.width || !meta.height) throw new Error("ابعاد نامعتبر");
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, buf);
      return "ok";
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) await new Promise(r => setTimeout(r, attempt * 1200));
    }
  }
  throw lastErr;
}

async function watermarkOne(src, dest) {
  if (await existsNonEmpty(dest)) return "cached";
  const input = await fs.readFile(src);
  const out = await watermarkBuffer(input, OPTS);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, out);
  return "ok";
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "manifest.json"), "utf8"));
  const groups = [
    { key: "dl", srcDir: path.join(ROOT, "source"), outDir: path.join(ROOT, "ready") },
    { key: "blob", srcDir: path.join(ROOT, "blob-source"), outDir: path.join(ROOT, "blob-ready") },
  ];
  const report = {};

  for (const g of groups) {
    const entries = Object.entries(manifest[g.key]);
    console.log(`\n=== ${g.key}: ${entries.length} فایل منحصربهفرد ===`);
    await fs.mkdir(g.srcDir, { recursive: true });
    await fs.mkdir(g.outDir, { recursive: true });

    const failedDownload = [];
    let dOk = 0, dCached = 0;
    await pool(entries, DOWNLOAD_CONCURRENCY, async ([name, info]) => {
      try {
        const r = await download(info.url, path.join(g.srcDir, name));
        if (r === "ok") dOk++; else dCached++;
      } catch (e) {
        failedDownload.push({ name, error: e.message });
      }
    });
    console.log(`دانلود: ${dOk} جدید، ${dCached} موجود، ${failedDownload.length} ناموفق`);

    const failedWatermark = [];
    let wOk = 0, wCached = 0;
    const ready = entries.filter(([name]) => !failedDownload.some(f => f.name === name));
    await pool(ready, WATERMARK_CONCURRENCY, async ([name]) => {
      try {
        const r = await watermarkOne(path.join(g.srcDir, name), path.join(g.outDir, name));
        if (r === "ok") wOk++; else wCached++;
      } catch (e) {
        failedWatermark.push({ name, error: e.message });
      }
    });
    console.log(`واترمارک: ${wOk} جدید، ${wCached} موجود، ${failedWatermark.length} ناموفق`);
    if (failedDownload.length) console.log("دانلود ناموفق:", failedDownload.slice(0, 10));
    if (failedWatermark.length) console.log("واترمارک ناموفق:", failedWatermark.slice(0, 10));

    report[g.key] = {
      total: entries.length,
      downloaded: dOk,
      downloadCached: dCached,
      watermarked: wOk,
      watermarkCached: wCached,
      failedDownload,
      failedWatermark,
    };
  }

  await fs.writeFile(path.join(ROOT, "report.json"), JSON.stringify(report, null, 2));
  const bad = Object.values(report).reduce((s, r) => s + r.failedDownload.length + r.failedWatermark.length, 0);
  console.log(bad ? `\nخطاها: ${bad} — report.json را ببین` : "\nهمهٔ فایلها آمادهاند.");
}

main().catch(e => { console.error(e); process.exit(1); });
