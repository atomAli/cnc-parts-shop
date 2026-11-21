#!/usr/bin/env node
/**
 * واترمارک دسته‌جمعی تصاویر محصولات — لوکال یا FTP
 *
 * نمونه‌ها:
 *   # تست روی چند فایل لوکال (بدون تغییر فایل اصلی)
 *   node scripts/watermark-images.mjs --local public/uploads --out /tmp/wm-test --limit 3
 *
 *   # فقط شمردن فایل‌های FTP و حجم کل (هیچ تغییری نمی‌دهد)
 *   node scripts/watermark-images.mjs --ftp --host 2870351934.cloudydl.com --user USER --dir /img --dry-run
 *
 *   # تست روی ۳ فایل FTP با بکاپ محلی
 *   node scripts/watermark-images.mjs --ftp --host 2870351934.cloudydl.com --user USER --dir /img --limit 3 --backup
 *
 *   # اجرای کامل (قابل ادامه؛ فایل‌های انجام‌شده در state ذخیره می‌شوند)
 *   node scripts/watermark-images.mjs --ftp --host 2870351934.cloudydl.com --user USER --dir /img --backup
 *
 * رمز FTP را می‌توانی با پرامپت وارد کنی یا در متغیر محیطی FTP_PASS بگذاری.
 */

import { Client } from "basic-ftp";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function usage() {
  console.log(`
استفاده:
  node scripts/watermark-images.mjs --local <dir> [--out <dir>] [--limit N] [--dry-run]
  node scripts/watermark-images.mjs --ftp --host <host> --user <user> [--dir <remote-dir>] [--secure] [--dry-run]

گزینه‌های واترمارک:
  --mode logo|text       حالت واترمارک (پیش‌فرض: logo)
  --logo <path>          مسیر لوگو (پیش‌فرض: public/logo.png)
  --text <text>          متن واترمارک در حالت text (پیش‌فرض: shik.app)
  --opacity <0..1>       شفافیت واترمارک گوشه (پیش‌فرض: 0.55)
  --scale <0..1>         عرض لوگوی گوشه نسبت به عرض عکس (پیش‌فرض: 0.16)
  --center               واترمارک بزرگ محو وسط عکس (پیش‌فرض: روشن)
  --no-center            بدون واترمارک وسط
  --center-opacity <0..1> شفافیت واترمارک وسط (پیش‌فرض: 0.28)
  --center-scale <0..1>  عرض لوگوی وسط نسبت به عرض عکس (پیش‌فرض: 0.55)
  --quality <1..100>     کیفیت JPEG/WebP (پیش‌فرض: 85)
  --margin <0..1>        حاشیه نسبت به ضلع کوچک‌تر (پیش‌فرض: 0.02)

گزینه‌های اجرا:
  --limit N              فقط N فایل اول
  --only <substr>        فقط فایل‌هایی که این رشته در نامشان هست
  --recursive            زیرپوشه‌ها هم بررسی شوند
  --backup               از هر فایل اصلی یک کپی در watermark-backup/ نگه دار
  --backup-dir <dir>     مسیر بکاپ (پیش‌فرض: watermark-backup)
  --state <file>         فایل وضعیت برای ادامهٔ اجرا (پیش‌فرض: .watermark-state.json)
  --preview <dir>        فقط N فایل را دانلود و واترمارک‌شده لوکال ذخیره کن (هیچ آپلودی نمی‌شود)
  --yes                  بدون پرسش تأیید
  --dry-run              فقط لیست/حجم را نشان بده

مثال امن برای شروع (بدون تغییر روی سرور):
  node scripts/watermark-images.mjs --ftp --host HOST --user USER --dir /img --preview ./wm-preview --limit 6
`);
}

function parseArgs(argv) {
  const opts = {
    ftp: false,
    local: "",
    out: "",
    host: "",
    user: "",
    pass: process.env.FTP_PASS || "",
    dir: "",
    secure: false,
    mode: "logo",
    logo: "public/logo.png",
    text: "shik.app",
    opacity: 0.55,
    scale: 0.16,
    center: true,
    centerOpacity: 0.28,
    centerScale: 0.55,
    quality: 85,
    margin: 0.02,
    limit: 0,
    only: "",
    recursive: false,
    backup: false,
    backupDir: "watermark-backup",
    state: ".watermark-state.json",
    preview: "",
    yes: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`مقدار برای ${a} داده نشده`);
      return v;
    };
    switch (a) {
      case "--ftp": opts.ftp = true; break;
      case "--local": opts.local = next(); break;
      case "--out": opts.out = next(); break;
      case "--host": opts.host = next(); break;
      case "--user": opts.user = next(); break;
      case "--pass": opts.pass = next(); break;
      case "--dir": opts.dir = next(); break;
      case "--secure": opts.secure = true; break;
      case "--mode": opts.mode = next(); break;
      case "--logo": opts.logo = next(); break;
      case "--text": opts.text = next(); break;
      case "--opacity": opts.opacity = Number(next()); break;
      case "--scale": opts.scale = Number(next()); break;
      case "--center": opts.center = true; break;
      case "--no-center": opts.center = false; break;
      case "--center-opacity": opts.centerOpacity = Number(next()); break;
      case "--center-scale": opts.centerScale = Number(next()); break;
      case "--quality": opts.quality = Number(next()); break;
      case "--margin": opts.margin = Number(next()); break;
      case "--limit": opts.limit = Number(next()); break;
      case "--only": opts.only = next(); break;
      case "--recursive": opts.recursive = true; break;
      case "--backup": opts.backup = true; break;
      case "--backup-dir": opts.backupDir = next(); break;
      case "--state": opts.state = next(); break;
      case "--preview": opts.preview = next(); break;
      case "--yes": opts.yes = true; break;
      case "--dry-run": opts.dryRun = true; break;
      case "--help":
      case "-h": usage(); process.exit(0); break;
      default:
        throw new Error(`گزینهٔ ناشناخته: ${a}`);
    }
  }
  return opts;
}

function isImage(name) {
  return IMAGE_EXT.has(path.extname(name).toLowerCase());
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function escapeXml(s) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
}

async function askHidden(prompt) {
  if (!process.stdin.isTTY) {
    throw new Error("رمز داده نشده. از --pass یا متغیر محیطی FTP_PASS استفاده کن.");
  }
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    process.stdout.write(prompt);
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode(wasRaw);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        stdin.setRawMode(wasRaw);
        process.stdout.write("\n");
        process.exit(1);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function ask(prompt) {
  if (!process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    process.stdout.write(prompt);
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(wasRaw);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        stdin.setRawMode(wasRaw);
        process.stdout.write("\n");
        process.exit(1);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function loadState(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);
    return { done: new Set(data.done || []), failed: new Set(data.failed || []) };
  } catch {
    return { done: new Set(), failed: new Set() };
  }
}

async function saveState(file, state) {
  const data = {
    done: [...state.done],
    failed: [...state.failed],
  };
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

/**
 * نسخهٔ محو لوگو با عرض مشخص.
 * `allowEnlarge` برای واترمارک بزرگ وسط عکس لازم است؛ در گوشه معمولاً بزرگ‌نمایی نمی‌کنیم.
 */
async function makeFadedLogo(logoRaw, targetWidth, opacity, allowEnlarge) {
  return sharp(logoRaw)
    .resize({ width: Math.max(1, Math.round(targetWidth)), withoutEnlargement: !allowEnlarge })
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

/**
 * واترمارک را روی بافر تصویر می‌چسباند و بافر خروجی را برمی‌گرداند.
 * فقط jpg/jpeg/png/webp پشتیبانی می‌شوند؛ GIF و بقیه رد می‌شوند.
 */
export async function watermarkBuffer(inputBuffer, opts) {
  const image = sharp(inputBuffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  let width = meta.width || 0;
  let height = meta.height || 0;
  // sharp.metadata ابعاد قبل از چرخش EXIF را می‌دهد؛ برای جای‌گذاری واترمارک باید ابعاد نهایی را بدانیم.
  if (meta.orientation && meta.orientation >= 5 && meta.orientation <= 8) {
    [width, height] = [height, width];
  }
  if (!width || !height) throw new Error("ابعاد تصویر خوانده نشد");
  if ((meta.pages || 1) > 1) throw new Error("تصویر متحرک است");
  if (width < 120 || height < 120) throw new Error("تصویر خیلی کوچک است");

  const margin = Math.max(8, Math.round(Math.min(width, height) * opts.margin));
  const composites = [];

  if (opts.mode === "logo") {
    const logoRaw = await fs.readFile(opts.logo);
    const logoMeta = await sharp(logoRaw).metadata();
    const sourceWidth = logoMeta.width || 763;
    const sourceHeight = logoMeta.height || 327;
    const aspect = sourceHeight / sourceWidth;

    // ۱) واترمارک کوچک گوشهٔ پایین‌راست
    const cornerWidth = Math.max(70, Math.round(width * opts.scale));
    const corner = await makeFadedLogo(logoRaw, cornerWidth, opts.opacity, false);
    const cm = await sharp(corner).metadata();
    composites.push({
      input: corner,
      left: Math.max(0, width - (cm.width || cornerWidth) - margin),
      top: Math.max(0, height - (cm.height || Math.round(cornerWidth * aspect)) - margin),
    });

    // ۲) واترمارک بزرگ محو در مرکز عکس
    if (opts.center) {
      // بزرگ‌نمایی بیش از ۲ برابر لوگو را پیکسلی می‌کند؛ سقف می‌گذاریم.
      const byWidth = Math.round(width * opts.centerScale);
      const byHeight = Math.round((height * 0.9) / aspect);
      const centerWidth = Math.max(120, Math.min(byWidth, byHeight, sourceWidth * 2));
      const center = await makeFadedLogo(logoRaw, centerWidth, opts.centerOpacity, true);
      const gm = await sharp(center).metadata();
      const cw = gm.width || centerWidth;
      const ch = gm.height || Math.round(centerWidth * aspect);
      composites.push({
        input: center,
        left: Math.max(0, Math.round((width - cw) / 2)),
        top: Math.max(0, Math.round((height - ch) / 2)),
      });
    }
  } else {
    const fontSize = Math.max(14, Math.round(width * 0.035));
    const strokeWidth = Math.max(1, Math.round(fontSize / 12));
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - margin}" y="${height - margin}" text-anchor="end"
        font-family="sans-serif" font-size="${fontSize}" font-weight="bold"
        fill="#ffffff" fill-opacity="${opts.opacity}"
        stroke="#000000" stroke-opacity="${Math.min(0.75, opts.opacity * 0.9)}"
        stroke-width="${strokeWidth}" paint-order="stroke">${escapeXml(opts.text)}</text>
    </svg>`;
    composites.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }

  const out = image.composite(composites).withMetadata();
  const format = (meta.format || "").toLowerCase();

  if (format === "jpeg" || format === "jpg") {
    return out.jpeg({ quality: opts.quality, mozjpeg: true }).toBuffer();
  }
  if (format === "png") {
    return out.png({ compressionLevel: 9 }).toBuffer();
  }
  if (format === "webp") {
    return out.webp({ quality: opts.quality }).toBuffer();
  }
  throw new Error(`فرمت پشتیبانی نمی‌شود: ${format || "unknown"}`);
}

async function walkLocal(dir, recursive) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive) out.push(...(await walkLocal(p, recursive)));
    } else if (isImage(e.name)) {
      const st = await fs.stat(p);
      out.push({ name: e.name, path: p, size: st.size });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function runLocal(opts, state) {
  const files = (await walkLocal(opts.local, opts.recursive)).filter(
    (f) => !opts.only || f.name.includes(opts.only)
  );
  const selected = opts.limit > 0 ? files.slice(0, opts.limit) : files;
  const total = selected.reduce((s, f) => s + f.size, 0);

  console.log(`منبع: ${opts.local}`);
  console.log(`تعداد تصاویر: ${selected.length} (از ${files.length}) — حجم: ${formatBytes(total)}`);
  if (opts.dryRun) return;

  const outDir = opts.out || `${opts.local.replace(/[\\/]+$/, "")}-watermarked`;
  await fs.mkdir(outDir, { recursive: true });

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < selected.length; i++) {
    const f = selected[i];
    const rel = path.relative(opts.local, f.path);
    const dest = path.join(outDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    try {
      const input = await fs.readFile(f.path);
      const out = await watermarkBuffer(input, opts);
      await fs.writeFile(dest, out);
      ok++;
      console.log(`[${i + 1}/${selected.length}] ✓ ${rel}`);
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${selected.length}] ✗ ${rel} — ${err.message}`);
    }
  }

  console.log(`\nپایان. موفق: ${ok} — ناموفق: ${failed}`);
  console.log(`خروجی: ${outDir}`);
}

async function listRemoteImages(client, dir, recursive) {
  const out = [];
  const entries = await client.list(dir);
  for (const e of entries) {
    const remote = path.posix.join(dir, e.name);
    if (e.isDirectory) {
      if (recursive) out.push(...(await listRemoteImages(client, remote, recursive)));
    } else if (isImage(e.name)) {
      out.push({ name: e.name, path: remote, size: e.size });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function detectRemoteDir(client, opts) {
  const candidates = [
    opts.dir,
    "/img",
    "/public_html/img",
    "/httpdocs/img",
    "/www/img",
    "/htdocs/img",
    `/home/${opts.user}/public_html/img`,
    "/",
  ].filter(Boolean);

  for (const dir of [...new Set(candidates)]) {
    try {
      const list = await client.list(dir);
      const images = list.filter((e) => !e.isDirectory && isImage(e.name));
      if (images.length) {
        console.log(`پوشهٔ تصاویر پیدا شد: ${dir} (${images.length} تصویر در سطح اول)`);
        return dir;
      }
    } catch {
      // پوشه وجود ندارد یا دسترسی ندارد؛ بعدی را امتحان کن
    }
  }
  throw new Error("پوشهٔ تصاویر پیدا نشد. با --dir مسیر درست را بده.");
}

async function runFtp(opts, state) {
  if (!opts.host) throw new Error("--host لازم است");
  if (!opts.user) throw new Error("--user لازم است");
  if (!opts.pass) opts.pass = await askHidden(`رمز FTP برای ${opts.user}@${opts.host}: `);

  const client = new Client(60_000);
  client.ftp.verbose = false;

  console.log(`اتصال به ${opts.host} ...`);
  await client.access({
    host: opts.host,
    user: opts.user,
    password: opts.pass,
    secure: opts.secure,
  });
  console.log("متصل شد.");

  try {
    const dir = opts.dir || (await detectRemoteDir(client, opts));
    const files = (await listRemoteImages(client, dir, opts.recursive)).filter(
      (f) => !opts.only || f.name.includes(opts.only)
    );
    const pending = files.filter((f) => !state.done.has(f.path));
    const selected = opts.limit > 0 ? pending.slice(0, opts.limit) : pending;
    const total = selected.reduce((s, f) => s + f.size, 0);

    console.log(`پوشه: ${dir}`);
    console.log(`تعداد کل: ${files.length} — انجام‌شده: ${files.length - pending.length} — باقی‌مانده: ${pending.length}`);
    console.log(`انتخاب‌شده در این اجرا: ${selected.length} — حجم تقریبی: ${formatBytes(total)}`);

    if (opts.dryRun) return;
    if (!selected.length) {
      console.log("چیزی برای انجام نمانده.");
      return;
    }

    const previewMode = Boolean(opts.preview);
    if (previewMode) {
      await fs.mkdir(path.join(opts.preview, "before"), { recursive: true });
      await fs.mkdir(path.join(opts.preview, "after"), { recursive: true });
      console.log(`حالت پیش‌نمایش: هیچ فایلی روی سرور تغییر نمی‌کند. خروجی: ${opts.preview}`);
    }

    if (!opts.yes && !previewMode) {
      const answer = await ask(`ادامه می‌دهی؟ ${selected.length} فایل بازنویسی می‌شود [y/N]: `);
      if (answer.trim().toLowerCase() !== "y") {
        console.log("لغو شد.");
        return;
      }
    }

    let ok = 0;
    let failed = 0;
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      const ext = path.extname(f.name).toLowerCase();
      const tmpIn = path.join(os.tmpdir(), `wm-in-${crypto.randomUUID()}${ext}`);
      const tmpOut = path.join(os.tmpdir(), `wm-out-${crypto.randomUUID()}${ext}`);

      try {
        await client.downloadTo(tmpIn, f.path);
        const input = await fs.readFile(tmpIn);

        if (opts.backup) {
          const safeRel = f.path.replace(/^\/+/, "");
          const backupPath = path.join(opts.backupDir, safeRel);
          await fs.mkdir(path.dirname(backupPath), { recursive: true });
          await fs.writeFile(backupPath, input);
        }

        const out = await watermarkBuffer(input, opts);

        if (previewMode) {
          const safeName = f.path.replace(/^\/+/, "").replace(/\//g, "__");
          await fs.writeFile(path.join(opts.preview, "before", safeName), input);
          await fs.writeFile(path.join(opts.preview, "after", safeName), out);
        } else {
          await fs.writeFile(tmpOut, out);
          await client.uploadFrom(tmpOut, f.path);
          state.done.add(f.path);
          state.failed.delete(f.path);
          await saveState(opts.state, state);
        }
        ok++;
        console.log(`[${i + 1}/${selected.length}] ✓ ${f.path}`);
      } catch (err) {
        failed++;
        state.failed.add(f.path);
        await saveState(opts.state, state);
        console.error(`[${i + 1}/${selected.length}] ✗ ${f.path} — ${err.message}`);
      } finally {
        await fs.rm(tmpIn, { force: true }).catch(() => {});
        await fs.rm(tmpOut, { force: true }).catch(() => {});
      }
    }

    console.log(`\nپایان. موفق: ${ok} — ناموفق: ${failed}`);
    if (failed) console.log("برای تلاش دوباره، همان دستور را اجرا کن؛ فایل‌های موفق رد می‌شوند.");
  } finally {
    client.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.mode !== "logo" && opts.mode !== "text") {
    throw new Error("--mode باید logo یا text باشد");
  }
  if (opts.opacity < 0 || opts.opacity > 1) throw new Error("--opacity باید بین 0 و 1 باشد");
  if (opts.scale <= 0 || opts.scale > 1) throw new Error("--scale باید بین 0 و 1 باشد");

  const state = await loadState(opts.state);

  if (opts.local) {
    await runLocal(opts, state);
    return;
  }
  if (opts.ftp) {
    await runFtp(opts, state);
    return;
  }
  usage();
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\nخطا: ${err.message}`);
    process.exit(1);
  });
}
