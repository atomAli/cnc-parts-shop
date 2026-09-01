import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(process.cwd(), "dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔄 Starting category reorganization...\n");

  // Define new clean structure
  const newCategories = [
    {
      slug: "electrical",
      name: "برقی و اتوماسیون",
      order: 1,
      children: [
        { slug: "servo-motor", name: "سروموتور و درایو", order: 1 },
        { slug: "step-motor", name: "استپ موتور و درایو", order: 2 },
        { slug: "inverter", name: "اینورتر و درایو فرکانس", order: 3 },
        { slug: "controller", name: "کنترلر و کارت اتصال", order: 4 },
        { slug: "spindle-motor", name: "اسپیندل موتور و اینورتر", order: 5 },
        { slug: "vacuum-pump", name: "پمپ وکیوم", order: 6 },
        { slug: "slip-ring", name: "اسلیپ رینگ", order: 7 },
        { slug: "power-supply", name: "منبع تغذیه", order: 8 },
        { slug: "laser", name: "لیزر فایبر و تجهیزات برش", order: 9 },
        { slug: "electric-jack", name: "جک برقی صنعتی", order: 10 },
      ],
    },
    {
      slug: "mechanical",
      name: "مکانیکی و حرکتی",
      order: 2,
      children: [
        { slug: "linear-guide", name: "ریل و واگن خطی", order: 1 },
        { slug: "ball-screw", name: "بالسکرو و مهره و ساپورت", order: 2 },
        { slug: "bearing", name: "بلبرینگ و یاتاقان", order: 3 },
        { slug: "gearbox", name: "گیربکس و متعلقات", order: 4 },
        { slug: "coupling", name: "کوپلینگ و اتصالات", order: 5 },
        { slug: "cable-carrier", name: "محافظ کابل و انرژی چین", order: 6 },
        { slug: "shaft", name: "شفت و پروفیل آلومینیوم", order: 7 },
        { slug: "gear-rack", name: "دنده شانه‌ای و دنده مقابل", order: 8 },
      ],
    },
  ];

  // Map old slugs to new slugs
  const slugMap: Record<string, string> = {
    // Electrical - servo
    "servo-motor": "servo-motor",
    "servo-spindle": "servo-motor",
    // Electrical - step motor
    "step-motor": "step-motor",
    "hqm-step-motor-step-drive": "step-motor",
    "leadshine-steppermotor": "step-motor",
    // Electrical - controller
    "controller": "controller",
    "radonix-controller": "controller",
    "controller-data-cable": "controller",
    "mach3-controller": "controller",
    "hqm-controller": "controller",
    // Electrical - spindle
    "spindle-motor": "spindle-motor",
    "hqm-spindle-motor": "spindle-motor",
    "hqd-spindle-motor": "spindle-motor",
    "hertz-spindle-motor": "spindle-motor",
    "hsd-spindle-motor": "spindle-motor",
    "cc-spindle-motor": "spindle-motor",
    "spindle-deci": "spindle-motor",
    // Electrical - power
    "power-dc": "power-supply",
    // Electrical - laser
    "laser": "laser",
    // Electrical - jack
    "linkan-electrical-jack": "electric-jack",
    // Mechanical - linear guide
    "rail-wagon": "linear-guide",
    // Mechanical - ball screw
    "ballscrew": "ball-screw",
    "ball-screw-nut-support": "ball-screw",
    "nut-support": "ball-screw",
    // Mechanical - bearing
    "linear-bearing": "bearing",
    "ball-bearing": "bearing",
    "bearing": "bearing",
    // Mechanical - gearbox
    "planetary-spiral-gearbox": "gearbox",
    "liming-gearbox": "gearbox",
    "snail-gearbox": "gearbox",
    "snail-gearbox-liming": "gearbox",
    "belt-gearbox": "gearbox",
    "sbl-gearbox": "gearbox",
    "gearbox-accessories": "gearbox",
    // Mechanical - coupling
    "coupling": "coupling",
    // Mechanical - cable carrier
    "cable-carrier": "cable-carrier",
    "cable-carrier-topline": "cable-carrier",
    // Mechanical - shaft
    "shaft": "shaft",
    "aluminium-profile": "shaft",
    // Mechanical - gear rack
    "gear-rack-pinion": "gear-rack",
  };

  // Step 1: Create new categories
  console.log("📁 Creating new categories...");
  const newCategoryMap: Record<string, string> = {}; // slug -> id

  for (const parent of newCategories) {
    const created = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, order: parent.order },
      create: { name: parent.name, slug: parent.slug, order: parent.order },
    });
    newCategoryMap[parent.slug] = created.id;

    for (const child of parent.children) {
      const childCreated = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, order: child.order, parentId: created.id },
        create: { name: child.name, slug: child.slug, parentId: created.id, order: child.order },
      });
      newCategoryMap[child.slug] = childCreated.id;
    }
    console.log(`  ✅ ${parent.name} + ${parent.children.length} subcategories`);
  }

  // Step 2: Move products to new categories
  console.log("\n📦 Moving products to new categories...");
  const oldCategories = await prisma.category.findMany({
    where: { parentId: { not: null } },
  });

  let movedCount = 0;
  for (const oldCat of oldCategories) {
    const newSlug = slugMap[oldCat.slug];
    if (!newSlug || !newCategoryMap[newSlug]) {
      console.log(`  ⚠️ No mapping for: ${oldCat.name} (${oldCat.slug})`);
      continue;
    }

    const result = await prisma.product.updateMany({
      where: { categoryId: oldCat.id },
      data: { categoryId: newCategoryMap[newSlug] },
    });
    if (result.count > 0) {
      movedCount += result.count;
      console.log(`  ✅ ${oldCat.name} → ${newSlug} (${result.count} products)`);
    }
  }
  console.log(`  Total moved: ${movedCount} products`);

  // Step 3: Delete old categories
  console.log("\n🗑️ Cleaning up old categories...");
  const deleted = await prisma.category.deleteMany({
    where: { id: { notIn: Object.values(newCategoryMap) } },
  });
  console.log(`  Deleted ${deleted.count} old categories`);

  // Step 4: Verify
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
    const totalProducts = cat._count.products + cat.children.reduce((sum, c) => sum + c._count.products, 0);
    console.log(`\n  📁 ${cat.name} (${totalProducts} products)`);
    for (const child of cat.children) {
      console.log(`     ${child.name} — ${child._count.products}`);
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
