import fs from "fs";
import prisma from "./src/lib/prisma";

(async () => {
  const bb = await prisma.category.findUnique({ where: { slug: "ball-bearings" }, include: { children: true } });
  const shaft = await prisma.category.findUnique({ where: { slug: "shafts" } });
  if (!bb || !shaft) throw new Error("missing cat");
  const ids = [bb.id, ...bb.children.map((c) => c.id)];
  const rows = await prisma.product.findMany({ where: { active: true, categoryId: { in: ids } }, select: { id: true, name: true, categoryId: true } });
  fs.writeFileSync("/tmp/shaft-support-backup.json", JSON.stringify({ moved: rows.filter((p) => /^(ساپورت شفت|ساپورت شفت یا پایه شفت)/.test(p.name.trim())).map((p) => ({ id: p.id, name: p.name, oldCategoryId: p.categoryId })) }, null, 2));
  console.log("backup ok");

  const targets = rows.filter((p) => /^(ساپورت شفت|ساپورت شفت یا پایه شفت)/.test(p.name.trim()));
  console.log("to move:", targets.length);
  targets.forEach((p) => console.log("  -", p.name.substring(0, 60)));

  await prisma.product.updateMany({ where: { id: { in: targets.map((p) => p.id) } }, data: { categoryId: shaft.id } });
  console.log("moved to:", shaft.name);

  for (const c of [bb, ...bb.children]) {
    console.log("  ", c.name, "->", await prisma.product.count({ where: { categoryId: c.id } }));
  }
  console.log("  شفت root ->", await prisma.product.count({ where: { categoryId: shaft.id } }));
  await prisma.$disconnect();
})();