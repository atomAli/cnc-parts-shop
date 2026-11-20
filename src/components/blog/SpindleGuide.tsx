"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

/**
 * نسخهٔ تعاملیarticle اسپیندل آب خنک.
 * تمام ابزارها با React ساده و بدون کتابخانهٔ اضافی پیاده شدهاند تا روی
 * Chrome 109 و Firefox 115 و سختافزار ضعیف هم روان بمانند.
 * هیچ مبلغ پولی در این محتوا وجود ندارد؛ تقسیم بودجه فقط بصورت درصدی است.
 */

const LINKS = {
  spindle: "/category/spindle",
  hqd: "/brand/hqd",
  hqm: "/brand/hqm",
  hsd: "/brand/hsd",
  invt: "/brand/invt",
  delta: "/brand/delta",
  inverter: "/category/inverter",
  underOne:
    "/category/spindle/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-%D8%B2%DB%8C%D8%B1-1-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA",
  oneToOneHalf:
    "/category/spindle/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-1-%D8%AA%D8%A7-1-5-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA",
  gdz19:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-1-5-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-hqd-%D8%A7%DA%86-%DA%A9%DB%8C%D9%88-%D8%AF%DB%8C-%D9%85%D8%AF%D9%84-gdz-19-%D8%A2%D8%A8-%D8%AE%D9%86%DA%A9-220v-1-5kw-er11-36000rpm",
  twoTwo:
    "/category/spindle/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-2-2-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA",
  gdz23:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-2-2-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-hqd-%D8%A7%DA%86-%DA%A9%DB%8C%D9%88-%D8%AF%DB%8C-%D9%85%D8%AF%D9%84-gdz-23-%D8%A2%D8%A8-%D8%AE%D9%86%DA%A9-220v-2-2kw-er20-24000rpm",
  hqmW022:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-2-2-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-hqm-%D8%A7%DA%86-%DA%A9%DB%8C%D9%88-%D8%A7%D9%85-%D9%85%D8%AF%D9%84-w022-080-2022-24-%D8%A2%D8%A8-%D8%AE%D9%86%DA%A9-%D9%82%D8%B7%D8%B1-80-%D9%85%DB%8C%D9%84%DB%8C-%D9%85%D8%AA%D8%B1-220v-2-2kw-er20-24000rpm-%D8%A7%D9%88%D8%B1%D8%AC%DB%8C%D9%86%D8%A7%D9%84-%D9%88%D8%A7%D8%B1%D8%AF%D8%A7%D8%AA%DB%8C",
  fourFiveToSix:
    "/category/spindle/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-4-5-%D8%AA%D8%A7-6-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA",
  sevenToEight:
    "/category/spindle/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-7-%D8%AA%D8%A7-8-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA",
  hqmW055:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-5-5-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-hqm-%D8%A7%DA%86-%DA%A9%DB%8C%D9%88-%D8%A7%D9%85-%D9%85%D8%AF%D9%84-w055-125-3238-24-%D8%A2%D8%A8-%D8%AE%D9%86%DA%A9-%D9%82%D8%B7%D8%B1-125-%D9%85%DB%8C%D9%84%DB%8C-%D9%85%D8%AA%D8%B1-380v-5-5kw-er32-24000rpm-%D8%A7%D9%88%D8%B1%D8%AC%DB%8C%D9%86%D8%A7%D9%84-%D9%88%D8%A7%D8%B1%D8%AF%D8%A7%D8%AA%DB%8C",
  hqdGdk75:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-7-5-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-hqd-%D8%A7%DA%86-%DA%A9%DB%8C%D9%88-%D8%AF%DB%8C-%D9%85%D8%AF%D9%84-gdk125-18z-%D8%A2%D8%A8-%D8%AE%D9%86%DA%A9-380v-7-5kw-er25-18000rpm",
  hqmW011:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-11-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-hqm-%D8%A7%DA%86-%DA%A9%DB%8C%D9%88-%D8%A7%D9%85-%D9%85%D8%AF%D9%84-w011-150-4038-18-%D8%A2%D8%A8-%D8%AE%D9%86%DA%A9-%D9%82%D8%B7%D8%B1-150-%D9%85%DB%8C%D9%84%DB%8C-%D9%85%D8%AA%D8%B1-380v-11kw-er40-18000rpm-%D8%A7%D9%88%D8%B1%D8%AC%DB%8C%D9%86%D8%A7%D9%84-%D9%88%D8%A7%D8%B1%D8%AF%D8%A7%D8%AA%DB%8C",
  atc:
    "/category/spindle/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-%D8%AA%D9%88%D9%84-%DA%86%D9%86%D8%AC",
  hsdAtc:
    "/products/%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84-7-5-%D8%A7%D9%84%DB%8C-9-%DA%A9%DB%8C%D9%84%D9%88%D9%88%D8%A7%D8%AA-toolchange-%D8%AA%D9%88%D9%84-%DA%86%D9%86%D8%AC-hsd-%D8%A7%DA%86-%D8%A7%D8%B3-%D8%AF%DB%8C-24000-%D8%AF%D9%88%D8%B1-er32%D8%8C-iso30-%DA%A9%D8%AF-h6161h0822",
  collet:
    "/category/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C-%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84/%DA%A9%D9%88%D9%84%D8%AA-%D9%88-%D9%81%D8%B4%D9%86%DA%AF%DB%8C",
  nut:
    "/category/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C-%D8%A7%D8%B3%D9%BE%DB%8C%D9%86%D8%AF%D9%84/%D9%85%D9%87%D8%B1%D9%87-%D9%88-%D8%A2%DA%86%D8%A7%D8%B1",
} as const;

type MaterialKey = "fine" | "wood" | "metal" | "stone";
type PowerKey = "220" | "380";
type CoolingKey = "pump" | "chiller";
type ToolKey = "manual" | "atc";

type Material = {
  label: string;
  power: string;
  rpm: string;
  collet: string;
  bearing: string;
  series: string;
  shares: [number, number, number, number];
  needThreePhase: boolean;
  note: string;
};

const MATERIALS: Record<MaterialKey, Material> = {
  fine: {
    label: "حکاکی ظریف، PCB، طلا و پلکسی",
    power: "۰٫۸ تا ۱٫۵ کیلووات",
    rpm: "۲۴٬۰۰۰ تا ۴۰٬۰۰۰ دور",
    collet: "ER11 / ER16",
    bearing: "دقیق و کم لرزش",
    series: "HQD GDZ / HQM",
    shares: [48, 28, 9, 15],
    needThreePhase: false,
    note: "در کارهای ظریف، دور بالا و لرزش کم اهمیت بیشتری از توان دارد تا لبهٔ برش تمیز بماند.",
  },
  wood: {
    label: "چوب، MDF و مصنوعات چوبی",
    power: "۲٫۲ تا ۴٫۵ کیلووات",
    rpm: "۱۸٬۰۰۰ تا ۲۴٬۰۰۰ دور",
    collet: "ER20 / ER25",
    bearing: "تماس زاویهای P4",
    series: "HQD GDZ / HQM",
    shares: [58, 24, 8, 10],
    needThreePhase: false,
    note: "اسپیندل ۲٫۲ کیلووات با کولت ER20، استانداردترین انتخاب کارگاهی برای چوب و MDF است.",
  },
  metal: {
    label: "آلومینیوم، مس و برنج",
    power: "۳٫۵ تا ۵٫۵ کیلووات",
    rpm: "۱۲٬۰۰۰ تا ۲۴٬۰۰۰ دور",
    collet: "ER25 / ER32",
    bearing: "سرامیکی تقویتشده",
    series: "HQD GDK / HQM",
    shares: [55, 25, 7, 13],
    needThreePhase: true,
    note: "برای فلزات غیرآهنی، صلبیت محور و مقاومت در برابر بار شعاعی مهمتر از حداکثر دور است.",
  },
  stone: {
    label: "سنگ، گرانیت و برش عمیق",
    power: "۵٫۵ تا ۱۱ کیلووات",
    rpm: "۶٬۰۰۰ تا ۱۸٬۰۰۰ دور",
    collet: "ER32 / ER40",
    bearing: "سرامیکی سنگین",
    series: "HQD GDK / HQM / HSD",
    shares: [52, 24, 6, 18],
    needThreePhase: true,
    note: "اینجا گشتاور و دفع حرارت حرف اول را میزند؛ دور پایینتر و چیلر صنعتی لازم است.",
  },
};

type Model = {
  model: string;
  brand: "HQD" | "HQM" | "HSD";
  kw: number;
  rpm: string;
  collet: string;
  voltage: string;
  href: string;
};

const MODELS: Model[] = [
  { model: "HQD GDZ-17B", brand: "HQD", kw: 1.5, rpm: "۲۴٬۰۰۰", collet: "ER16", voltage: "۲۲۰ ولت", href: "/products/" + encodeURI("اسپیندل-1-5-کیلووات-hqd-اچ-کیو-دی-مدل-gdz-17b-آب-خنک-220v-1-5kw-er16-24000rpm") },
  { model: "HQD GDZ-19", brand: "HQD", kw: 1.5, rpm: "۳۶٬۰۰۰", collet: "ER11", voltage: "۲۲۰ ولت", href: "/products/" + encodeURI("اسپیندل-1-5-کیلووات-hqd-اچ-کیو-دی-مدل-gdz-19-آب-خنک-220v-1-5kw-er11-36000rpm") },
  { model: "HQM W015-080-1122-36", brand: "HQM", kw: 1.5, rpm: "۳۶٬۰۰۰", collet: "ER11", voltage: "۲۲۰ ولت", href: "/products/" + encodeURI("اسپیندل-1-5-کیلووات-hqm-اچ-کیو-ام-مدل-w015-080-1122-36-آب-خنک-قطر-80-میلی-متر-220v-1-5kw-er11-36000rpm-اورجینال-وارداتی") },
  { model: "HQM W015-080-1622-24", brand: "HQM", kw: 1.5, rpm: "۲۴٬۰۰۰", collet: "ER16", voltage: "۲۲۰ ولت", href: "/products/" + encodeURI("اسپیندل-1-5-کیلووات-hqm-اچ-کیو-ام-مدل-w015-080-1622-24-آب-خنک-قطر-80-میلی-متر-220v-1-5kw-er16-24000rpm-اورجینال-وارداتی") },
  { model: "HQD GDZ-23", brand: "HQD", kw: 2.2, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۲۲۰ ولت", href: "/products/" + encodeURI("اسپیندل-2-2-کیلووات-hqd-اچ-کیو-دی-مدل-gdz-23-آب-خنک-220v-2-2kw-er20-24000rpm") },
  { model: "HQD GDZ-23", brand: "HQD", kw: 2.2, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-2-2-کیلووات-hqd-اچ-کیو-دی-مدل-gdz-23-آب-خنک-380v-2-2kw-er20-24000rpm") },
  { model: "HQM W022-080-2022-24", brand: "HQM", kw: 2.2, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۲۲۰ ولت", href: "/products/" + encodeURI("اسپیندل-2-2-کیلووات-hqm-اچ-کیو-ام-مدل-w022-080-2022-24-آب-خنک-قطر-80-میلی-متر-220v-2-2kw-er20-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W022-080-2038-24", brand: "HQM", kw: 2.2, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-2-2-کیلووات-hqm-اچ-کیو-ام-مدل-w022-080-2038-24-آب-خنک-قطر-80-میلی-متر-380v-2-2kw-er20-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W030-100-2038-24", brand: "HQM", kw: 3, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-3-کیلووات-hqm-اچ-کیو-ام-مدل-w030-100-2038-24-آب-خنک-قطر-100-میلی-متر-380v-3kw-er20-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W032-100-2038-24", brand: "HQM", kw: 3.2, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-3-2-کیلووات-hqm-اچ-کیو-ام-مدل-w032-100-2038-24-آب-خنک-قطر-100-میلی-متر-380v-3-2kw-er20-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W040-100-2038-24", brand: "HQM", kw: 4, rpm: "۲۴٬۰۰۰", collet: "ER20", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-4-کیلووات-hqm-اچ-کیو-ام-مدل-w040-100-2038-24-آب-خنک-قطر-100-میلی-متر-380v-4kw-er20-24000rpm-اورجینال-وارداتی") },
  { model: "HSD H6162H0124", brand: "HSD", kw: 4.5, rpm: "۲۴٬۰۰۰", collet: "ER32", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-4-5-کیلووات-hsd-اچ-اس-دی-آب-خنک-24000-دور-380-ولت-er32-کد-h6162h0124") },
  { model: "HQM W055-125-2538-24", brand: "HQM", kw: 5.5, rpm: "۲۴٬۰۰۰", collet: "ER25", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-5-5-کیلووات-hqm-اچ-کیو-ام-مدل-w055-125-2538-24-آب-خنک-قطر-125-میلی-متر-380v-5-5kw-er25-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W055-125-3238-24", brand: "HQM", kw: 5.5, rpm: "۲۴٬۰۰۰", collet: "ER32", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-5-5-کیلووات-hqm-اچ-کیو-ام-مدل-w055-125-3238-24-آب-خنک-قطر-125-میلی-متر-380v-5-5kw-er32-24000rpm-اورجینال-وارداتی") },
  { model: "HSD H6162H0120", brand: "HSD", kw: 5.5, rpm: "۱۸٬۰۰۰", collet: "ER32", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-5-5-کیلووات-hsd-اچ-اس-دی-آب-خنک-18000-دور-er32-کد-h6162h0120") },
  { model: "HQM W065-125-2538-24", brand: "HQM", kw: 6.5, rpm: "۲۴٬۰۰۰", collet: "ER25", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-6-5-کیلووات-hqm-اچ-کیو-ام-مدل-w065-125-2538-24-آب-خنک-قطر-125-میلی-متر-380v-6-5kw-er25-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W065-125-3238-24", brand: "HQM", kw: 6.5, rpm: "۲۴٬۰۰۰", collet: "ER32", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-6-5-کیلووات-hqm-اچ-کیو-ام-مدل-w065-125-3238-24-آب-خنک-قطر-125-میلی-متر-380v-6-5kw-er32-24000rpm-اورجینال-وارداتی") },
  { model: "HQD GDK125-18Z", brand: "HQD", kw: 7.5, rpm: "۱۸٬۰۰۰", collet: "ER25", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-7-5-کیلووات-hqd-اچ-کیو-دی-مدل-gdk125-18z-آب-خنک-380v-7-5kw-er25-18000rpm") },
  { model: "HQM W075-125-3238-24", brand: "HQM", kw: 7.5, rpm: "۲۴٬۰۰۰", collet: "ER32", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-7-5-کیلووات-hqm-اچ-کیو-ام-مدل-w075-125-3238-24-آب-خنک-قطر-125-میلی-متر-380v-7-5kw-er32-24000rpm-اورجینال-وارداتی") },
  { model: "HQM W011-150-4038-18", brand: "HQM", kw: 11, rpm: "۱۸٬۰۰۰", collet: "ER40", voltage: "۳۸۰ ولت", href: "/products/" + encodeURI("اسپیندل-11-کیلووات-hqm-اچ-کیو-ام-مدل-w011-150-4038-18-آب-خنک-قطر-150-میلی-متر-380v-11kw-er40-18000rpm-اورجینال-وارداتی") },
];

const TIERS = [
  { key: "workshop", label: "کارگاهی (تا ۴ کیلووات)", test: (kw: number) => kw <= 4 },
  { key: "semi", label: "نیمهصنعتی (۴٫۵ تا ۶٫۵)", test: (kw: number) => kw > 4 && kw <= 6.5 },
  { key: "industrial", label: "صنعتی (۷ کیلووات به بالا)", test: (kw: number) => kw > 6.5 },
];

const CHECKLIST = [
  {
    title: "پلاک و کد مدل را با دیتاشیت مطابقت دهید",
    text: "غلط املایی روی برچسب یا کد مدل نامشخص، نخستین نشانهٔ نمونهٔ متفرقه است. کد سری را با مدلهای معرفیشده توسط فروشنده چک کنید.",
  },
  {
    title: "شفت و نشیمن کولت را از نزدیک ببینید",
    text: "سطح شفت باید صیقلی و مخروط داخلی کولت تمیز باشد. نمونههای بی کیفیت معمولاً مرحلهٔ سنگزنی نهایی را طی نکردهاند.",
  },
  {
    title: "شفت را پیش از نصب با دست بچرخانید",
    text: "چرخش باید نرم، روان و بیصدا باشد؛ هرگونه سفتی یا خش خش یعنی یاتاقان آسیب دیده است.",
  },
  {
    title: "هم محوری و تعادل مهره را بررسی کنید",
    text: "لرزش غیرعادی در دور بالا از نقص بالانس یا مهرهٔ کولت است. در مدلهای بالانسشده، لرزش باید در حد چند میکرومتر بماند.",
  },
  {
    title: "راهاندازی بیبار را جدی بگیرید",
    text: "پس از وصل کردن گردش آب و تنظیم درایو، موتور را بیبار روشن کنید؛ جریان باید پایدار بماند، خطای Overcurrent ظاهر نشود و پوسته داغ نشود. مدلهای ATC را هرگز بدون ابزارگیر روشن نکنید.",
  },
];

const fa = new Intl.NumberFormat("fa-IR");
const fa1 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={active ? "chip chip-active" : "chip chip-muted"}>
      {children}
    </button>
  );
}

function SectionTitle({ id, number, title, children }: { id: string; number: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mt-10">
      <div className="border-r-4 border-blue-700 pr-4 mb-4">
        <h2 className="text-xl md:text-2xl font-black text-stone-900">
          {number}. {title}
        </h2>
        <p className="text-sm text-stone-600 leading-7 mt-2">{children}</p>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={`text-sm font-extrabold ${accent ? "text-blue-700" : "text-stone-900"}`}>{value}</p>
    </div>
  );
}

export default function SpindleGuide() {
  const [material, setMaterial] = useState<MaterialKey>("wood");
  const [power, setPower] = useState<PowerKey>("220");
  const [cooling, setCooling] = useState<CoolingKey>("pump");
  const [tool, setTool] = useState<ToolKey>("manual");

  const [scenario, setScenario] = useState<"heavy" | "light">("heavy");
  const [brandFilter, setBrandFilter] = useState<"ALL" | "HQD" | "HQM" | "HSD">("ALL");
  const [tierFilter, setTierFilter] = useState<"all" | "workshop" | "semi" | "industrial">("all");
  const [search, setSearch] = useState("");

  const [tank, setTank] = useState(20);
  const [climate, setClimate] = useState<"temperate" | "cold">("temperate");
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  const selected = MATERIALS[material];
  const shares = useMemo(() => {
    const base = [...selected.shares] as [number, number, number, number];
    if (cooling === "chiller") {
      base[1] -= 3;
      base[3] += 3;
    }
    if (tool === "atc") {
      base[0] += 6;
      base[1] -= 4;
      base[2] -= 2;
    }
    return base;
  }, [selected, cooling, tool]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MODELS.filter((item) => {
      const brandOk = brandFilter === "ALL" || item.brand === brandFilter;
      const tierOk =
        tierFilter === "all" || TIERS.find((t) => t.key === tierFilter)?.test(item.kw);
      const text = `${item.model} ${item.brand} ${item.kw} ${item.rpm} ${item.collet} ${item.voltage}`.toLowerCase();
      return brandOk && tierOk && (!q || text.includes(q));
    });
  }, [brandFilter, tierFilter, search]);

  const tierCounts = useMemo(
    () =>
      TIERS.map((t) => ({
        ...t,
        count: MODELS.filter((m) => (brandFilter === "ALL" || m.brand === brandFilter) && t.test(m.kw)).length,
      })),
    [brandFilter],
  );
  const maxTier = Math.max(...tierCounts.map((t) => t.count), 1);

  const glycolPct = climate === "temperate" ? 30 : 50;
  const distilledPct = 100 - glycolPct;
  const glycolLiters = (tank * glycolPct) / 100;
  const distilledLiters = tank - glycolLiters;

  const checkedCount = checked.filter(Boolean).length;
  const checklistPercent = Math.round((checkedCount / CHECKLIST.length) * 100);

  return (
    <div className="mt-8 space-y-2 text-sm leading-7 text-stone-800">
      <nav className="flex flex-wrap gap-2" aria-label="بخشهایarticle">
        <a className="chip chip-muted" href="#sec-config">انتخابگر و بودجه</a>
        <a className="chip chip-muted" href="#sec-cooling-type">آب خنک یا هواخنک</a>
        <a className="chip chip-muted" href="#sec-models">مدلهای موجود</a>
        <a className="chip chip-muted" href="#sec-fluid">سیال خنککننده</a>
        <a className="chip chip-muted" href="#sec-checklist">چکلیست اصالت</a>
      </nav>

      <p>
        اگر دستگاهتان ساعتهای طولانی روشن است، روی سنگ یا فلز کار میکند یا محیط کارگاه گرم است،
        اسپیندل آب خنک همان انتخابی است که بعداً پشیمانیتان نمیکند. برخلاف مدل هواخنک، گرما از بدنه
        بیرون رانده میشود و دور موتور در شیفتهای پیاپی ثابت میماند. البته خرید اسپیندل تنها بخشی از
        ماجراست؛ اینورتر، کولت، کلمپ و مدار آب هم باید درست انتخاب شوند.
      </p>

      <p>
        در <Link href={LINKS.spindle} className="text-blue-700 hover:text-blue-800 underline">دسته اسپیندل شیک</Link>{" "}
        سه طیف موجود داریم: <Link href={LINKS.hqd} className="text-blue-700 hover:text-blue-800 underline">HQD</Link> و{" "}
        <Link href={LINKS.hqm} className="text-blue-700 hover:text-blue-800 underline">HQM</Link> برای کارگاهها و کارهای
        نیمهصنعتی، و <Link href={LINKS.hsd} className="text-blue-700 hover:text-blue-800 underline">HSD</Link> برای خطوط
        دقیق صنعتی. ابزارهای زیر کمک میکنند پیش از ثبت سفارش، تصمیم خود را آزمایش کنید.
      </p>

      <SectionTitle id="sec-config" number="۱" title="چهار پرسش قبل از ثبت سفارش">
        متریال، ساعت کار، برق در دسترس و شیوهٔ تعویض ابزار؛ این چهار مورد مشخصات فنی و تجهیزات جانبی
        مورد نیازتان را تعیین میکند.
      </SectionTitle>

      <ol className="list-decimal list-inside pr-4 space-y-1">
        <li><strong>روی چه متریالی کار میکنید؟</strong> سختی قطعه و طول تماس تیغه با آن، تعیین میکند چقدر توان و گشتاور لازم دارید.</li>
        <li><strong>چند ساعت در روز کار میکند؟</strong> اگر شیفتهای مداوم دارید، حتماً به سراغ آب خنک بروید.</li>
        <li><strong>برق کارگاهتان چیست؟</strong> ۲۲۰ ولت تکفاز شهری یا ۳۸۰ ولت سهفاز صنعتی؟ این موضوع هم مدل اسپیندل و هم اینورتر را تعیین میکند.</li>
        <li><strong>چطور ابزار را بست میکنید؟</strong> تعویض دستی با کولت ER یا تعویض اتوماتیک ATC؟</li>
      </ol>

      <div className="card p-5 mt-5">
        <h3 className="text-base font-extrabold text-stone-900 mb-4">انتخابگر هوشمند اسپیندل</h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-stone-700 mb-2">متریال اصلی</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MATERIALS) as MaterialKey[]).map((key) => (
                  <ChipButton key={key} active={material === key} onClick={() => setMaterial(key)}>
                    {MATERIALS[key].label}
                  </ChipButton>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-stone-700 mb-2">برق در دسترس</p>
              <div className="flex flex-wrap gap-2">
                <ChipButton active={power === "220"} onClick={() => setPower("220")}>تکفاز ۲۲۰ ولت</ChipButton>
                <ChipButton active={power === "380"} onClick={() => setPower("380")}>سهفاز ۳۸۰ ولت</ChipButton>
              </div>
              {selected.needThreePhase && power === "220" && (
                <p className="text-xs text-amber-700 mt-2">
                  برای این متریال، برق ۳۸۰ ولت سهفاز پیشنهاد میشود؛ با ۲۲۰ ولت باید توان را کاهش دهید.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-stone-700 mb-2">شدت شیفت کاری</p>
              <div className="flex flex-wrap gap-2">
                <ChipButton active={cooling === "pump"} onClick={() => setCooling("pump")}>مقطعی / پمپ و مخزن</ChipButton>
                <ChipButton active={cooling === "chiller"} onClick={() => setCooling("chiller")}>شیفت طولانی / چیلر</ChipButton>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-stone-700 mb-2">تعویض ابزار</p>
              <div className="flex flex-wrap gap-2">
                <ChipButton active={tool === "manual"} onClick={() => setTool("manual")}>دستی (کولت ER)</ChipButton>
                <ChipButton active={tool === "atc"} onClick={() => setTool("atc")}>اتوماتیک (ATC)</ChipButton>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-stone-900">پیشنهاد فنی شما</h4>
              <span className="eyebrow">{selected.series}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="توان پیشنهادی" value={selected.power} accent />
              <Stat label="دور چرخش" value={selected.rpm} />
              <Stat label="ابزارگیر" value={tool === "atc" ? "ISO30 / HSK" : selected.collet} />
              <Stat label="یاتاقان" value={selected.bearing} />
            </div>

            <blockquote className="text-xs sm:text-sm leading-6">
              {selected.note}
              {cooling === "chiller" && " چیلر صنعتی دما را در شیفتهای طولانی ثابت نگه میدارد."}
              {tool === "atc" &&
                " با انتخاب تول چنج به کمپرسور هوای خشک و ابزارگیر مخروطی هم نیاز دارید و مدل را نباید بدون ابزارگیر روشن کنید."}
            </blockquote>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-bold text-stone-700 mb-2">تقسیم نسبی بودجهٔ راهاندازی</p>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                <div className="bg-blue-700 h-full" style={{ width: `${shares[0]}%` }} />
                <div className="bg-amber-600 h-full" style={{ width: `${shares[1]}%` }} />
                <div className="bg-stone-400 h-full" style={{ width: `${shares[2]}%` }} />
                <div className="bg-blue-400 h-full" style={{ width: `${shares[3]}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 mt-3">
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-700 ml-1" />اسپیندل {shares[0]}٪</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-amber-600 ml-1" />اینورتر {shares[1]}٪</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-stone-400 ml-1" />کولت و کلمپ {shares[2]}٪</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 ml-1" />خنککاری {shares[3]}٪</span>
              </div>
              <p className="text-xs text-stone-500 mt-3">
                این درصدها فقط یک راهنمای نسبیاند؛ سهم واقعی هر قلم را از فهرست روز کالاها بگیرید و پیش از خرید استعلام کنید.
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionTitle id="sec-cooling-type" number="۲" title="آب خنک یا هواخنک؛ تصمیم را با نوع کار بگیرید">
        اسپیندل هواخنک با پروانه، هوا را روی پوسته میدواند. ساده است و لولهکشی ندارد. مدل آب خنک
        دو اتصال ورودی و خروجی دارد و حرارت سیمپیچ و یاتاقانها را با گردش سیال بیرون میدهد.
      </SectionTitle>

      <div className="card p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <ChipButton active={scenario === "heavy"} onClick={() => setScenario("heavy")}>برش سنگ، فلز و شیفت پیوسته</ChipButton>
          <ChipButton active={scenario === "light"} onClick={() => setScenario("light")}>برش مقطعی چوب و کارگاه کوچک</ChipButton>
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-5">
          <h3 className="text-sm font-extrabold text-blue-800 mb-2">
            {scenario === "heavy"
              ? "حکم فنی: در کارهای سنگین، آب خنک برتر است"
              : "حکم فنی: در برشهای سبک، هواخنک سادهتر است"}
          </h3>
          <p className="text-xs sm:text-sm leading-6 text-stone-700">
            {scenario === "heavy"
              ? "در ماشینکاری فلز، سنگ و شیفتهای طولانی، پروانه هواخنک نمیتواند گرما را به اندازهٔ کافی بیرون دهد و داغ شدن، عمر یاتاقانها را کوتاه میکند. گردش آب، دمای پوسته را در محدودهٔ ایمن نگه میدارد و صدای فن را هم حذف میکند."
              : "اگر برشهایتان روی چوب، MDF یا پلاستیک و بهصورت مقطعی است و فضای میز محدود است، مدل هواخنک بهدلیل نصب سریع و نبود دردسر نگهداری مدار آب، گزینهٔ منطقیتری است."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <h4 className="text-sm font-extrabold text-blue-700 mb-3">آب خنک</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-stone-700">
              <li>دفع حرارت پایدار در شیفتهای طولانی</li>
              <li>صدای خیلی کمتر در دورهای بالا</li>
              <li>نیازمند پمپ، شلنگ و چیلر در کار سنگین</li>
              <li>خطر سوختن در صورت انسداد مسیر آب</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <h4 className="text-sm font-extrabold text-amber-700 mb-3">هواخنک</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-stone-700">
              <li>نصب ساده بدون مخزن و لولهکشی</li>
              <li>بدون نگرانی از یخزدگی یا نشتی سیال</li>
              <li>نویز صوتی بالا در دورهای زیاد</li>
              <li>احتمال داغ شدن در برش سنگین</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
          {[
            { label: "دفع حرارت در شیفت طولانی", water: "زیاد", air: "متوسط" },
            { label: "آرامش کارگاه و صدای کم", water: "زیاد", air: "کم" },
            { label: "سادگی نصب و نبود لولهکشی", water: "کم", air: "زیاد" },
            { label: "مقاومت در برابر یخزدگی", water: "متوسط", air: "زیاد" },
          ].map((row) => {
            const width = (v: string) => (v === "زیاد" ? "88%" : v === "متوسط" ? "58%" : "28%");
            return (
              <div key={row.label}>
                <p className="text-xs font-bold text-stone-700 mb-1">{row.label}</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-stone-500 w-16 shrink-0">آب خنک</span>
                  <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-blue-700" style={{ width: width(row.water) }} />
                  </div>
                  <span className="text-[11px] w-12 text-left text-stone-600">{row.water}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 w-16 shrink-0">هواخنک</span>
                  <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-amber-600" style={{ width: width(row.air) }} />
                  </div>
                  <span className="text-[11px] w-12 text-left text-stone-600">{row.air}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SectionTitle id="sec-models" number="۳" title="مدلهای آب خنک موجود در شیک را فیلتر کنید">
        برندهای موجود در این فهرست HQD، HQM و HSDاند. میتوانید بر اساس برند، ردهٔ توان یا متن جستجو
        مدلها را ببینید و مستقیم به صفحهٔ کالا بروید. در اینجا خبری از ارقام بازار نیست؛ فقط مشخصات فنی
        و لینک محصول آمده است.
      </SectionTitle>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            aria-label="فیلتر برند"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value as typeof brandFilter)}
            className="input w-auto py-2 text-xs"
          >
            <option value="ALL">همهٔ برندها</option>
            <option value="HQD">HQD</option>
            <option value="HQM">HQM</option>
            <option value="HSD">HSD</option>
          </select>
          <select
            aria-label="فیلتر ردهی توان"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)}
            className="input w-auto py-2 text-xs"
          >
            <option value="all">همهٔ ردهها</option>
            {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input
            aria-label="جستجوی مدل"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: GDZ، ۲٫۲، ER32…"
            className="input w-auto py-2 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {tierCounts.map((t) => (
            <div key={t.key} className="rounded-xl border border-gray-100 p-3">
              <div className="flex justify-between text-xs text-stone-600 mb-2">
                <span>{t.label}</span>
                <span className="font-extrabold text-stone-900">{fa.format(t.count)} مدل</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-blue-700" style={{ width: `${Math.round((t.count / maxTier) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-stone-700 border-b border-gray-200">
                <th className="py-2 px-3 font-bold">مدل و برند</th>
                <th className="py-2 px-3 font-bold">توان</th>
                <th className="py-2 px-3 font-bold">دور</th>
                <th className="py-2 px-3 font-bold">کولت</th>
                <th className="py-2 px-3 font-bold">برق</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-stone-500">مدلی با این فیلتر پیدا نشد.</td></tr>
              ) : (
                filteredModels.map((item, i) => (
                  <tr key={`${item.model}-${item.voltage}-${i}`} className="border-b border-gray-100">
                    <td className="py-2 px-3">
                      <Link href={item.href} className="text-blue-700 hover:text-blue-800 underline font-bold">
                        {item.model}
                      </Link>
                    </td>
                    <td className="py-2 px-3">{fa.format(item.kw)} کیلووات</td>
                    <td className="py-2 px-3">{item.rpm} دور</td>
                    <td className="py-2 px-3">{item.collet}</td>
                    <td className="py-2 px-3">{item.voltage}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500 mt-3">
          برای دیدن طیف کامل، دستهٔ <Link href={LINKS.spindle} className="text-blue-700 hover:text-blue-800 underline">اسپیندل و قطعات</Link> را ببینید.
        </p>
      </div>

      <SectionTitle id="sec-inverter" number="۴" title="برق کارگاه و اینورتر؛ جایی که خیلی از اسپیندلها میسوزند">
        اسپیندل آب خنک را نمیشود مستقیماً به برق ۵۰ Hz شهر وصل کرد. موتور سهفاز فرکانس بالا است و
        حتماً به <Link href={LINKS.inverter} className="text-blue-700 hover:text-blue-800 underline">اینورتر یا VFD</Link> نیاز
        دارد که تا ۳۰۰ یا ۴۰۰ Hz را پشتیبانی کند. مدلهای ۰٫۸ تا ۲٫۲ کیلووات معمولاً ۲۲۰ ولتاند و
        از ۳٫۵ یا ۵٫۵ کیلووات به بالا عملاً برق ۳۸۰ ولت سهفاز لازم است.
      </SectionTitle>

      <p>
        پیش از اولین روشن کردن، منحنی V/F، فرکانس ماکزیمم، ولتاژ نامی و جریان نامی را در تنظیمات درایو
        وارد کنید و جریان کشی موتور را در حالت بیبار پایش نمایید. برندهای{" "}
        <Link href={LINKS.invt} className="text-blue-700 hover:text-blue-800 underline">INVT</Link> و{" "}
        <Link href={LINKS.delta} className="text-blue-700 hover:text-blue-800 underline">Delta</Link> در شیک موجوداند.
        خطای Overcurrent بعد از روشن شدن، معمولاً یعنی پارامترهای درایو درست تنظیم نشدهاند، نه اینکه اسپیندل خراب باشد.
      </p>

      <SectionTitle id="sec-collet" number="۵" title="کولت، یاتاقان و نگهدارنده">
        کولت ER در سایزهای مختلفی عرضه میشود: ER11 و ER16 برای ابزارهای ریز، ER20 و ER25 برای کار عمومی،
        ER32 و ER40 برای برادهبرداری سنگین. مهره و آچار مناسب را حتماً همان موقع بخرید؛ در{" "}
        <Link href={LINKS.collet} className="text-blue-700 hover:text-blue-800 underline">کولت و فشنگی</Link> و{" "}
        <Link href={LINKS.nut} className="text-blue-700 hover:text-blue-800 underline">مهره و آچار</Link> گزینههای لازم را پیدا میکنید.
      </SectionTitle>

      <p>
        بلبرینگ سرامیکی گرمای کمتری تولید میکند و در دور بالا دوام بیشتری دارد. سری GDZ برند HQD برای چوب
        و تبلیغات و سری GDK آن برای برشهای سنگینتر شناخته میشود. <Link href={LINKS.hqm} className="text-blue-700 hover:text-blue-800 underline">HQM</Link>{" "}
        هم تنوع بالایی از ۰٫۷۵ تا ۱۱ کیلووات ارائه میدهد. اگر در یک برنامهٔ ماشینکاری بارها ابزار عوض
        میکنید، مدل تول چنج بهصرفهتر است؛ در <Link href={LINKS.atc} className="text-blue-700 hover:text-blue-800 underline">اسپیندل تول چنج</Link>{" "}
        مدلهای <Link href={LINKS.hsd} className="text-blue-700 hover:text-blue-800 underline">HSD</Link> با ابزارگیر ISO30 و HSK F63
        موجوداند، مثلاً <Link href={LINKS.hsdAtc} className="text-blue-700 hover:text-blue-800 underline">HSD تول چنج ۷٫۵ تا ۹ کیلووات</Link>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        <div className="rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-extrabold text-stone-900 mb-2">حکاکی و کار ریز</h3>
          <p className="text-xs leading-6 text-stone-600">
            دور بالا و کولت کوچک مهماند. دستهٔ{" "}
            <Link href={LINKS.underOne} className="text-blue-700 hover:text-blue-800 underline">زیر ۱ کیلووات</Link> و{" "}
            <Link href={LINKS.oneToOneHalf} className="text-blue-700 hover:text-blue-800 underline">۱ تا ۱٫۵ کیلووات</Link> را ببینید؛
            نمونهٔ خوب <Link href={LINKS.gdz19} className="text-blue-700 hover:text-blue-800 underline">HQD GDZ-19 آب خنک</Link> با ۳۶٬۰۰۰ دور و ER11 است.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-extrabold text-stone-900 mb-2">چوب و MDF</h3>
          <p className="text-xs leading-6 text-stone-600">
            در <Link href={LINKS.twoTwo} className="text-blue-700 hover:text-blue-800 underline">اسپیندل ۲٫۲ کیلووات</Link>{" "}
            هم <Link href={LINKS.gdz23} className="text-blue-700 hover:text-blue-800 underline">HQD GDZ-23 با برق ۲۲۰ ولت</Link> و
            هم نسخهٔ ۳۸۰ ولت آن موجود است. مدل ۸۰ میلیمتری{" "}
            <Link href={LINKS.hqmW022} className="text-blue-700 hover:text-blue-800 underline">HQM W022 آب خنک</Link> را هم نگاه کنید.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-extrabold text-stone-900 mb-2">فلز و سنگ</h3>
          <p className="text-xs leading-6 text-stone-600">
            دستهٔ <Link href={LINKS.fourFiveToSix} className="text-blue-700 hover:text-blue-800 underline">۴٫۵ تا ۶ کیلووات</Link> و{" "}
            <Link href={LINKS.sevenToEight} className="text-blue-700 hover:text-blue-800 underline">۷ تا ۸ کیلووات</Link> مناسباند.
            نمونهها: <Link href={LINKS.hqmW055} className="text-blue-700 hover:text-blue-800 underline">HQM ۵٫۵ کیلووات ER32</Link>،{" "}
            <Link href={LINKS.hqdGdk75} className="text-blue-700 hover:text-blue-800 underline">HQD GDK ۷٫۵ کیلووات</Link> و{" "}
            <Link href={LINKS.hqmW011} className="text-blue-700 hover:text-blue-800 underline">HQM ۱۱ کیلووات ER40</Link>.
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-extrabold text-stone-900 mb-2">قاعدهٔ کلی توان و دور</h3>
          <p className="text-xs leading-6 text-stone-600">
            دور بالا برای کارهای ظریف و متریال نرم، دور پایین و گشتاور بالا برای فلز و سنگ. توان را
            همیشه یک پله بالاتر از حداقل نیاز بگیرید تا موتور تحت فشار دائم نباشد.
          </p>
        </div>
      </div>

      <SectionTitle id="sec-fluid" number="۶" title="آزمایشگاه سیال خنککننده">
        عمر اسپیندل آب خنک بیشتر به کیفیت مدار آب بستگی دارد تا به نام برند روی بدنه. آب لولهکشی بهتنهایی
        رسوب میگذارد و ضدیخ بیش از حد هم انتقال حرارت را بدتر میکند. حجم مخزن و اقلیم کارگاهتان را
        وارد کنید تا نسبت آب مقطر و ضدیخ گلیکولی مشخص شود.
      </SectionTitle>

      <div className="card p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-stone-700 mb-2">
                <span>حجم مخزن یا مدار (لیتر)</span>
                <span className="text-blue-700 text-sm">{fa.format(tank)} لیتر</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={tank}
                onChange={(e) => setTank(Number(e.target.value))}
                aria-label="حجم مخزن"
                className="w-full accent-blue-700"
              />
              <div className="flex justify-between text-[11px] text-stone-400 mt-1">
                <span>۵ لیتر</span><span>۵۰ لیتر</span><span>۱۰۰ لیتر</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-stone-700 mb-2">اقلیم کارگاه</p>
              <div className="flex flex-wrap gap-2">
                <ChipButton active={climate === "temperate"} onClick={() => setClimate("temperate")}>معتدل و گرم (۳۰٪ ضدیخ)</ChipButton>
                <ChipButton active={climate === "cold"} onClick={() => setClimate("cold")}>سردسیر زمستانی (۵۰٪ ضدیخ)</ChipButton>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-700">آب مقطر</span>
                <span className="font-extrabold text-blue-700">{fa1.format(distilledLiters)} لیتر ({fa.format(distilledPct)}٪)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-700">ضدیخ گلیکولی</span>
                <span className="font-extrabold text-amber-700">{fa1.format(glycolLiters)} لیتر ({fa.format(glycolPct)}٪)</span>
              </div>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                <div className="bg-blue-700 h-full" style={{ width: `${distilledPct}%` }} />
                <div className="bg-amber-600 h-full" style={{ width: `${glycolPct}%` }} />
              </div>
              <p className="text-xs text-stone-600">
                نقطهٔ انجماد تقریبی: {climate === "temperate" ? "حدود ۱۲- تا ۱۴- درجه" : "حدود ۳۵- درجه سانتیگراد (حداکثر مجاز)"}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-6 text-stone-700">
              <strong className="text-blue-800">از ضدیخ متانولی و محلول نمکی پرهیز کنید.</strong> این مواد مجراهای
              فلزی و واشرها را میخورند. غلظت گلیکول را از ۵۰ درصد بالاتر نبرید چون انتقال حرارت کاهش مییابد.
            </div>
            <div className="rounded-xl border border-gray-100 p-3 text-xs leading-6 text-stone-700">
              <strong className="text-stone-900">فشار پمپ و انسداد مسیر:</strong> فشار بیش از حد مجاز میتواند آب را
              وارد محفظهٔ سیمپیچ کند. مسیر ورود و خروج نباید هوا بگیرد و سنسور جریان یا دما اگر هست، حتماً وصل شود.
            </div>
            <div className="rounded-xl border border-gray-100 p-3 text-xs leading-6 text-stone-700">
              <strong className="text-stone-900">تنظیم اینورتر:</strong> درایوهای عمومی پیشفرض روی ۵۰ Hzاند. فرکانس
              ماکزیمم، منحنی V/F و جریان نامی اسپیندل را پیش از استارت اولیه وارد کنید. آب مخزن را هم مرتب عوض کنید.
            </div>
            <blockquote className="text-xs leading-6">
              یک شلنگ پارهشده یا پمپ ضعیف، در چند دقیقه همان کاری را میکند که یک اسپیندل بیکیفیت در چند ماه.
            </blockquote>
          </div>
        </div>
      </div>

      <SectionTitle id="sec-checklist" number="۷" title="چکلیست تشخیص اصالت و سلامت فنی">
        با توجه به حضور نمونههای متفرقه یا کارکرده، مراحل زیر را هنگام تحویل کالا تیک بزنید تا ریسک
        خرید اشتباه کاهش یابد.
      </SectionTitle>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
          <div>
            <p className="text-xs text-stone-500">وضعیت بازرسی</p>
            <p className="text-sm font-extrabold text-stone-900 mt-0.5">
              {checkedCount} از {CHECKLIST.length} مرحله بررسی شد
              {checkedCount === CHECKLIST.length && " — کالا آمادهٔ نصب ایمن است"}
            </p>
          </div>
          <div className="w-full sm:w-56 h-3 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-blue-700" style={{ width: `${checklistPercent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHECKLIST.map((item, idx) => (
            <label key={item.title} className="flex items-start gap-3 rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-blue-300">
              <input
                type="checkbox"
                checked={checked[idx]}
                onChange={(e) => {
                  const next = [...checked];
                  next[idx] = e.target.checked;
                  setChecked(next);
                }}
                className="mt-1 h-4 w-4 accent-blue-700"
              />
              <span className="text-xs sm:text-sm">
                <span className="block font-extrabold text-stone-900 mb-1">{idx + 1}. {item.title}</span>
                <span className="block text-stone-600 leading-6">{item.text}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-5 mt-10">
        <p>
          اگر هنوز مطمئن نیستید کدام مدل به دستگاهتان میخورد، مشخصات متریال، ساعت کار و ولتاژ کارگاهتان
          را برای کارشناسان شیک بفرستید تا مدل مناسب را انتخاب کنیم. همین حالا میتوانید{" "}
          <Link href={LINKS.spindle} className="text-blue-700 hover:text-blue-800 underline">لیست کامل اسپیندلها</Link> را مقایسه کنید.
        </p>
      </div>
    </div>
  );
}
