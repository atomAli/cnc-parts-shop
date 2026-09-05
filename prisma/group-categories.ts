import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  ),
});

interface Group {
  name: string;
  slug: string;
  order: number;
  children: { slug: string; order: number }[];
}

const GROUPS: Group[] = [
  {
    name: "اینورتر و درایو",
    slug: "inverter",
    order: 1,
    children: [
      { slug: "اینورتر-دلتا-delta", order: 1 },
      { slug: "اینورتر-دلتا،-آلفا،-فوتک-invt", order: 2 },
      { slug: "alpha-inverter", order: 3 },
      { slug: "gd20", order: 4 },
      { slug: "gd10", order: 5 },
      { slug: "em730", order: 6 },
      { slug: "em700", order: 7 },
      { slug: "سری-vfd-el", order: 8 },
      { slug: "سری-c2000", order: 9 },
      { slug: "brake-resistance", order: 10 },
    ],
  },
  {
    name: "سروو موتور",
    slug: "servo-motors",
    order: 2,
    children: [
      { slug: "servo-motor", order: 1 },
      { slug: "سروو-موتور-اینوت-invt", order: 2 },
      { slug: "سروو-موتور-اچ-کیو-ام-hqm", order: 3 },
      { slug: "سرووموتور-400-وات", order: 4 },
      { slug: "سروو-دلتا-سری-b3", order: 5 },
      { slug: "سرووموتور-hqm-plus-اچ-کیو-ام-پلاس", order: 6 },
    ],
  },
  {
    name: "استپ موتور و درایو",
    slug: "stepper-motors",
    order: 3,
    children: [
      { slug: "hqm-step-motor-step-drive", order: 1 },
      { slug: "استپ-درایو-hqm-اچ-کیو-ام", order: 2 },
      { slug: "leadshine-steppermotor", order: 3 },
    ],
  },
  {
    name: "اسپیندل و قطعات",
    slug: "spindle",
    order: 4,
    children: [
      { slug: "hqm-spindle-motor", order: 1 },
      { slug: "hqd-spindle-motor", order: 2 },
      { slug: "hertz-spindle-motor", order: 3 },
      { slug: "اسپیندل-موتور-hsd", order: 4 },
      { slug: "اسپیندل-cc", order: 5 },
      { slug: "spindle-deci", order: 6 },
      { slug: "spindle-motor", order: 7 },
      { slug: "اسپیندل-1.5-کیلووات", order: 8 },
      { slug: "اسپیندل-4.5-کیلووات", order: 9 },
      { slug: "اسپیندل-6-کیلووات", order: 10 },
      { slug: "اسپیندل-تول-چنج", order: 11 },
      { slug: "spindle-accessories", order: 12 },
      { slug: "spindle-nut", order: 13 },
      { slug: "spindle-wrench", order: 14 },
      { slug: "spindle-fan", order: 15 },
      { slug: "fan-spindle-hqm", order: 16 },
      { slug: "caver-fan-spindle-hqm", order: 17 },
      { slug: "fan-spindle-hqd", order: 18 },
      { slug: "stator-spindle-hqm", order: 19 },
      { slug: "rotor-spindle-hqm", order: 20 },
      { slug: "stator-spindle-hqd", order: 21 },
      { slug: "rotor-spindle-hqd", order: 22 },
      { slug: "yadaki-spindle", order: 23 },
      { slug: "yadaki-spindle-hqd", order: 24 },
      { slug: "terminal-elec-spindle", order: 25 },
      { slug: "terminal-elec-spindle-hqd", order: 26 },
      { slug: "connector-spindle-hqm", order: 27 },
      { slug: "sensor-spindle-hqm", order: 28 },
      { slug: "tool-gripper", order: 29 },
      { slug: "tool-set-spindle", order: 30 },
      { slug: "aluminum-bracket", order: 31 },
      { slug: "servo-spindle", order: 32 },
    ],
  },
  {
    name: "کنترلر CNC",
    slug: "controllers",
    order: 5,
    children: [
      { slug: "mach3-controller", order: 1 },
      { slug: "radonix-controller", order: 2 },
      { slug: "controller-data-cable", order: 3 },
      { slug: "hqm-controller", order: 4 },
    ],
  },
  {
    name: "PLC و HMI",
    slug: "plc-hmi",
    order: 6,
    children: [
      { slug: "plc-delta", order: 1 },
      { slug: "hmi-delta", order: 2 },
      { slug: "dvp-e2", order: 3 },
    ],
  },
  {
    name: "منبع تغذیه و تجهیزات برق",
    slug: "power-supplies",
    order: 7,
    children: [
      { slug: "powerdc", order: 1 },
      { slug: "connector-relay-sensor", order: 2 },
      { slug: "cable-robotic", order: 3 },
      { slug: "linkan-electrical-jack", order: 4 },
    ],
  },
  {
    name: "اسلیپ رینگ",
    slug: "slip-rings",
    order: 8,
    children: [
      { slug: "slip-ring-rotary-connector", order: 1 },
      { slug: "single-conductor", order: 2 },
      { slug: "multi-conductors", order: 3 },
      { slug: "through-bore-multi-conductors-10-2mm", order: 4 },
      { slug: "through-bore-multi-conductors-16-2mm", order: 5 },
      { slug: "lead-wire-multi-conductors", order: 6 },
    ],
  },
  {
    name: "پمپ",
    slug: "pumps",
    order: 9,
    children: [
      { slug: "oil-vacuum-pump", order: 1 },
      { slug: "lubricating", order: 2 },
    ],
  },
  {
    name: "لیزر",
    slug: "laser-group",
    order: 10,
    children: [{ slug: "laser", order: 1 }],
  },
  {
    name: "ریل و واگن خطی",
    slug: "linear-guide",
    order: 11,
    children: [
      { slug: "rail-wagon", order: 1 },
      { slug: "hiwin-wagon", order: 2 },
    ],
  },
  {
    name: "بال اسکرو",
    slug: "ball-screw",
    order: 12,
    children: [
      { slug: "ball-screw-nut-support", order: 1 },
      { slug: "bearings", order: 2 },
    ],
  },
  {
    name: "بلبرینگ و یاتاقان",
    slug: "ball-bearings",
    order: 13,
    children: [
      { slug: "LinearBallbearing", order: 1 },
      { slug: "ball-bearing", order: 2 },
    ],
  },
  {
    name: "گیربکس",
    slug: "gearboxes",
    order: 14,
    children: [
      { slug: "planetary-spiral-gearbox", order: 1 },
      { slug: "liming-gearbox", order: 2 },
      { slug: "snail-gearbox", order: 3 },
      { slug: "snail-gearbox-liming", order: 4 },
      { slug: "gearbox-accessories", order: 5 },
      { slug: "sbl-gearbox", order: 6 },
      { slug: "گیربکس-1-به-10", order: 7 },
      { slug: "belt-gearbox", order: 8 },
    ],
  },
  {
    name: "کوپلینگ",
    slug: "couplings",
    order: 15,
    children: [{ slug: "coupling", order: 1 }],
  },
  {
    name: "دنده شانه‌ای",
    slug: "gear-racks",
    order: 16,
    children: [{ slug: "gear-rack-pinion", order: 1 }],
  },
  {
    name: "محافظ کابل",
    slug: "cable-carriers",
    order: 17,
    children: [
      { slug: "cable-carrier", order: 1 },
      { slug: "cable-carrier-topline", order: 2 },
    ],
  },
  {
    name: "شفت و پروفیل",
    slug: "shafts",
    order: 18,
    children: [
      { slug: "shaft", order: 1 },
      { slug: "شفت-خام-هاردکروم", order: 2 },
      { slug: "شفت-پایه-دار-هاردکروم", order: 3 },
      { slug: "aluminium-profiles", order: 4 },
    ],
  },
];

async function main() {
  console.log("🔄 Grouping categories...");
  const groupBySlug = new Map<string, string>();
  const assigned = new Map<string, string>();

  // 1. Create/update groups (parents)
  for (const g of GROUPS) {
    const created = await prisma.category.upsert({
      where: { slug: g.slug },
      update: { name: g.name, order: g.order, parentId: null },
      create: { name: g.name, slug: g.slug, order: g.order },
    });
    groupBySlug.set(g.slug, created.id);
  }
  console.log(`✅ ${GROUPS.length} groups ready`);

  // 2. Attach children to groups
  for (const g of GROUPS) {
    for (const child of g.children) {
      const childCat = await prisma.category.findUnique({ where: { slug: child.slug } });
      if (!childCat) {
        console.log(`  ⚠️ Missing child category: ${child.slug}`);
        continue;
      }
      await prisma.category.update({
        where: { id: childCat.id },
        data: { parentId: groupBySlug.get(g.slug), order: child.order },
      });
      assigned.set(child.slug, g.slug);
    }
  }
  console.log(`✅ ${assigned.size} children attached to groups`);

  // 3. Remove old top-level parents (electrical / mechanical)
  const deleted = await prisma.category.deleteMany({
    where: { slug: { in: ["electrical", "mechanical"] } },
  });
  console.log(`✅ Removed old parents: ${deleted.count}`);

  // 4. Orphan check
  const orphans = await prisma.category.findMany({
    where: { parentId: null, slug: { notIn: GROUPS.map((g) => g.slug) } },
  });
  console.log(`⚠️ Orphan top-level categories (should be none): ${orphans.map((c) => c.slug).join(", ") || "none"}`);

  // 5. Verify structure
  console.log("\n📊 Final structure:");
  const final = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: { _count: { select: { products: true } } },
        orderBy: { order: "asc" },
      },
      _count: { select: { products: true } },
    },
    orderBy: { order: "asc" },
  });

  for (const cat of final) {
    const total =
      cat._count.products + cat.children.reduce((sum, c) => sum + c._count.products, 0);
    console.log(`\n  📁 ${cat.name} (${cat.children.length} دسته / ${total} محصول)`);
    for (const child of cat.children) {
      console.log(`     • ${child.name} — ${child._count.products}`);
    }
  }

  console.log("\n🎉 Done!");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });