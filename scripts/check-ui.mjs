#!/usr/bin/env node
/**
 * بازرسی سازگاری UI — تضمین ماندن در سطح سادگی ۲۰۲۰
 *
 * استفاده:  node scripts/check-ui.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const BLOCKLIST = [
  ["bg-gradient-to-",    "گرادیان تخت‌نشده (کند روی GPU نرم‌افزاری)"],
  ["bg-linear-to-",      "گرادیان تخت‌نشده"],
  ["blur-3xl",           "blur سنگین"],
  ["blur-2xl",           "blur سنگین"],
  ["blur-xl",            "blur سنگین"],
  ["backdrop-blur",      "backdrop-filter"],
  ["bg-clip-text",       "با text-transparent متن را نامرئی می‌کند (Chrome 109)"],
  ["text-transparent",   "متن شفاف — خطر نامرئی‌شدن"],
  ["shadow-2xl",         "سایه سنگین"],
  ["rounded-3xl",        "گردی بیش از حد"],
  ["group-hover:scale",  "انیمیشن غیرضروری"],
  ["group-hover:rotate", "انیمیشن غیرضروری"],
  ["hover:scale-",       "انیمیشن غیرضروری"],
  ["oklch(",             "رنگ مدرن — فقط داخل @supports"],
  ["color-mix(",         "رنگ مدرن — فقط داخل @supports"],
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".git")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

let failed = 0;

console.log("\n۱) اسکن سورس");
console.log("─".repeat(56));
const files = walk("src");
for (const f of files) {
  const src = readFileSync(f, "utf8");
  // خط‌هایی که فقط در کامنت/رنگ هستند را نادیده می‌گیریم
  const hits = BLOCKLIST.filter(([pat]) => {
    const esc = pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // باید «کلاس» باشد: با whitespace/quote/`:` (variant) یا خط جدید شروع شود.
    // برای الگوهایی که با «-» تمام می‌شوند، lookahead لازم نیست.
    const tail = pat.endsWith("-") ? "" : "(?![\\w-])";
    return new RegExp(`(^|[\\s"'\`])((?:[a-z]+:)*)${esc}${tail}`, "m").test(src);
  });
  if (hits.length) {
    failed++;
    console.log(`\n  ✗ ${f.replace("src/", "")}`);
    for (const [pat, why] of hits) {
      const n = (src.match(new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
      console.log(`      ${n}× ${pat}  — ${why}`);
    }
  }
}
if (!failed) console.log("  ✓ هیچ الگوی ممنوعی یافت نشد");

console.log("\n۲) بررسی typecheck");
console.log("─".repeat(56));
try {
  const out = execSync("npx tsc --noEmit 2>&1", { encoding: "utf8" });
  const errs = out.split("\n").filter((l) => l.startsWith("src/"));
  console.log(errs.length ? `  ✗ ${errs.length} خطا` : "  ✓ ۰ خطا");
  if (errs.length) { failed++; errs.slice(0, 8).forEach((l) => console.log("      " + l)); }
} catch (e) {
  const errs = String(e.stdout || "").split("\n").filter((l) => l.startsWith("src/"));
  console.log(errs.length ? `  ✗ ${errs.length} خطا در src/` : "  ✓ ۰ خطا");
}

console.log("\n" + "═".repeat(56));
console.log(failed ? `✗ ${failed} فایل/مرحله نیاز به اصلاح دارد\n` : "✓ همه‌چیز سازگار است\n");
process.exit(failed ? 1 : 0);