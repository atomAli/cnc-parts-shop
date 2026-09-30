import fs from "fs";
import prisma from "./src/lib/prisma";

(async () => {
  const bb = await prisma.category.findUnique({ where: { slug: "ball-bearings" }, include: { children: true } });
  const shaft = await prisma.category.findUnique({ where: { slug: "shafts" } });
  const lin = await prisma.category.findFirst({ where: { slug: "LinearBallbearing" } });
  if (!bb || !shaft || !lin) throw new Error("missing cat");

  const linRows = await prisma.product.findMany({ where: { categoryId: lin.id }, select: { id: true, name: true, categoryId: true } });
  fs.writeFileSync("/tmp/linear-bearing-to-shaft-backup.json", JSON.stringify({ fromCat: { id: lin.id, name: lin.name, slug: lin.slug }, toCat: { id: shaft.id, name: shaft.name, slug: shaft.slug }, products: linRows }, null, 2));
  console.log("backup ok, moving:", linRows.length);

  await prisma.product.updateMany({ where: { id: { in: linRows.map((p) => p.id) } }, data: { categoryId: shaft.id } });
  await prisma.category.delete({ where: { id: lin.id } });
  console.log("deleted empty subcat:", lin.name, lin.slug);

  console.log("  بلبرینگ و یاتاقان root ->", await prisma.product.count({ where: { categoryId: bb.id } }));
  console.log("  بلبرینگ ->", await prisma.product.count({ where: { categoryId: (await prisma.category.findUnique({ where: { slug: "ball-bearing" } }))!.id } }));
  console.log("  شفت root ->", await prisma.product.count({ where: { categoryId: shaft.id } }));
  await prisma.$disconnect();
})();