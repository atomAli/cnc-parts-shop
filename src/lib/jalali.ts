/**
 * تبدیل تاریخ میلادی ↔ شمسی — بدون هیچ وابستگی به سمت سرور،
 * تا هم routeهای API و هم کامپوننت‌های client بتوانند استفاده کنند.
 *
 * پشتوانهٔ `toJalali`: الگوریتم تأییدشدهٔ convert-access-invoices (۸ تاریخ مرجع).
 * پشتوانهٔ `jalaliToIso`: همان `j2g` که پشتوانهٔ `toJalali` است.
 */

const DIV = (a: number, b: number) => Math.trunc(a / b);
const MOD = (a: number, b: number) => a - b * Math.floor(a / b);
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635,
  2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number) {
  const bl = BREAKS.length, gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jump = 0;
  for (let i = 1; i < bl; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + DIV(jump, 33) * 8 + DIV(MOD(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + DIV(n, 33) * 8 + DIV(MOD(n, 33) + 3, 4);
  if (MOD(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = DIV(gy, 4) - DIV((DIV(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + DIV(jump + 4, 33) * 33;
  return { gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = DIV((gy + DIV(gm - 8, 6) + 100100) * 1461, 4) + DIV(153 * MOD(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - DIV(DIV(gy + 100100 + DIV(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + DIV(DIV(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = DIV(MOD(j, 1461), 4) * 5 + 308;
  const gd = DIV(MOD(i, 153), 5) + 1;
  const gm = MOD(DIV(i, 153), 12) + 1;
  return { gy: DIV(j, 1461) - 100100 + DIV(8 - gm, 6), gm, gd };
}

function j2g(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return d2g(g2d(r.gy, 3, r.march) + (jm - 1) * 31 - DIV(jm, 7) * (jm - 7) + jd - 1);
}

const p2 = (n: number) => String(n).padStart(2, "0");

function jKey(jy: number, jm: number, jd: number) {
  const g = j2g(jy, jm, jd);
  return Date.UTC(g.gy, g.gm - 1, g.gd, 12, 0, 0);
}

/** شمسی (YYYY/MM/DD) به میلادی (YYYY-MM-DD) */
export function jalaliToIso(j: string): string | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(j.trim());
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  const g = j2g(jy, jm, jd);
  if (!(g.gy > 0) || g.gm < 1 || g.gm > 12 || g.gd < 1 || g.gd > 31) return null;
  return `${g.gy}-${p2(g.gm)}-${p2(g.gd)}`;
}

/** میلادی → شمسی («۲۰۲۶-۱۰-۰۶» ← «۱۴۰۵/۰۷/۱۴») */
export function toJalali(iso: string): string {
  const [Y, M, D] = iso.split("-").map(Number);
  const target = Date.UTC(Y, M - 1, D, 12, 0, 0);
  for (let jy = 1390; jy <= 1430; jy++) {
    if (jKey(jy, 1, 1) > target) break;
    for (let jm = 1; jm <= 12; jm++) {
      const maxd = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
      for (let jd = 1; jd <= maxd; jd++) {
        const k = jKey(jy, jm, jd);
        if (k === target) return `${jy}/${p2(jm)}/${p2(jd)}`;
        if (k > target) { jm = 99; break; }
      }
      if (jm === 99) break;
    }
  }
  return iso;
}

/** امروز به شمسی — برای پیش‌فرض کردن بازهٔ تاریخ */
export function todayJalali(): string {
  const now = new Date();
  return toJalali(
    `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`
  );
}
