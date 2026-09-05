import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  ),
});

async function main() {
  // 1) Fix bearings: the leaf "bearings" (یاتاقان بالسکرو) was wrongly used as
  //    the "بلبرینگ و یاتاقان" group. Restore its name and keep it under ball-screw.
  const bearingsLeaf = await prisma.category.findUnique({ where: { slug: "bearings" } });
  if (bearingsLeaf) {
    await prisma.category.update({
      where: { id: bearingsLeaf.id },
      data: { name: "یاتاقان بالسکرو" },
    });
    console.log("✅ bearings leaf renamed back to «یاتاقان بالسکرو»");
  }

  // 2) Create a proper "بلبرینگ و یاتاقان" top-level group with unique slug
  const ballBearingsGroup = await prisma.category.upsert({
    where: { slug: "ball-bearings" },
    update: { name: "بلبرینگ و یاتاقان", parentId: null },
    create: { name: "بلبرینگ و یاتاقان", slug: "ball-bearings" },
  });

  // Move LinearBallbearing and ball-bearing under it
  for (const leafSlug of ["LinearBallbearing", "ball-bearing"]) {
    const leaf = await prisma.category.findUnique({ where: { slug: leafSlug } });
    if (leaf) {
      await prisma.category.update({
        where: { id: leaf.id },
        data: { parentId: ballBearingsGroup.id },
      });
    }
  }
  console.log("✅ ball-bearings group created with LinearBallbearing + ball-bearing");

  // 3) Fix laser self-cycle: create distinct group "لیزر" slug laser-group
  const laserGroup = await prisma.category.upsert({
    where: { slug: "laser-group" },
    update: { name: "لیزر", parentId: null },
    create: { name: "لیزر", slug: "laser-group" },
  });
  const laserLeaf = await prisma.category.findUnique({ where: { slug: "laser" } });
  if (laserLeaf) {
    await prisma.category.update({
      where: { id: laserLeaf.id },
      data: { parentId: laserGroup.id },
    });
  }
  console.log("✅ laser-group created, laser leaf attached (cycle fixed)");

  // 4) Sanity: find any remaining self-parents or cycles
  const all = await prisma.category.findMany({});
  const cycles = all.filter((c) => c.parentId === c.id);
  console.log("cycles remaining:", cycles.map((c) => c.slug).join(", ") || "none");

  const kidsOfParent = new Map<string, number>();
  for (const c of all) {
    if (c.parentId) kidsOfParent.set(c.parentId, (kidsOfParent.get(c.parentId) || 0) + 1);
  }
  // A category that is both a child and a parent of itself can't happen now; just report top-level
  const tops = await prisma.category.findMany({ where: { parentId: null }, orderBy: { order: "asc" } });
  console.log("top-level groups (" + tops.length + "):", tops.map((t) => t.slug).join(", "));
  console.log("total products:", await prisma.product.count());
  console.log("total categories:", all.length);
  console.log("orphans:", all.filter((c) => c.parentId && !all.some((o) => o.id === c.parentId)).map((c) => c.slug).join(", ") || "none");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });