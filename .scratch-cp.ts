import fs from "fs";
import prisma from "./src/lib/prisma";

(async () => {
  const root = await prisma.category.findUnique({ where: { slug: "couplings" }, include: { children: true } });
  if (!root) throw new Error("couplings missing");
  const ids = [root.id, ...root.children.map((c) => c.id)];
  const rows = await prisma.product.findMany({ where: { active: true, categoryId: { in: ids } }, select: { id: true, name: true, categoryId: true } });
  fs.writeFileSync("/tmp/coupling-reorg-backup.json", JSON.stringify({ root: { id: root.id, name: root.name, slug: root.slug }, children: root.children.map((c) => ({ id: c.id, name: c.name, slug: c.slug })), products: rows }, null, 2));
  console.log("backup ok, products:", rows.length);

  const subs: [string, string][] = [
    ["کوپلینگ SRJ", "کوپلینگ-SRJ"],
    ["کوپلینگ D", "کوپلینگ-D"],
    ["کوپلینگ HC", "کوپلینگ-HC"],
    ["کوپلینگ SRB", "کوپلینگ-SRB"],
    ["کوپلینگ SDW", "کوپلینگ-SDW"],
    ["لاستیک کوپلینگ", "لاستیک-کوپلینگ"],
  ];
  for (const [, s] of subs) {
    const exists = await prisma.category.findUnique({ where: { slug: s } });
    if (exists) throw new Error("slug exists: " + s);
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const oc of root.children) await tx.category.update({ where: { id: oc.id }, data: { slug: oc.slug + "-old" } });
    for (let i = 0; i < subs.length; i++) {
      await tx.category.create({ data: { name: subs[i][0], slug: subs[i][1], parent: { connect: { id: root.id } }, order: i + 1 } });
    }
    const fresh = await tx.category.findMany({ where: { parentId: root.id } });
    const bySlug: Record<string, string> = {};
    for (const c of fresh) bySlug[c.slug] = c.id;

    const counter: Record<string, number> = {};
    const unclassified: string[] = [];
    for (const p of rows) {
      const n = p.name;
      let slug = "";
      if (/^لاستیک/.test(n)) slug = "لاستیک-کوپلینگ";
      else if (/SRJ\d/.test(n)) slug = "کوپلینگ-SRJ";
      else if (/SRB/.test(n)) slug = "کوپلینگ-SRB";
      else if (/SDW\d/.test(n)) slug = "کوپلینگ-SDW";
      else if (/HC\d{2}/.test(n)) slug = "کوپلینگ-HC";
      else if (/\bD\d{2}-L/.test(n)) slug = "کوپلینگ-D";
      if (!slug || !bySlug[slug]) { unclassified.push(p.name); continue; }
      await tx.product.update({ where: { id: p.id }, data: { categoryId: bySlug[slug] } });
      counter[slug] = (counter[slug] || 0) + 1;
    }
    await tx.category.deleteMany({ where: { id: { in: root.children.map((c) => c.id) } } });
    return { counter, unclassified };
  }, { timeout: 120000 });

  for (const [k, v] of Object.entries(result.counter)) console.log("  ", k, v);
  console.log("unclassified:", result.unclassified.length);
  result.unclassified.forEach((n) => console.log("  -", n));

  const verify = await prisma.category.findUnique({ where: { id: root.id }, include: { children: { orderBy: { order: "asc" } } } });
  for (const ch of verify!.children) console.log(`  ${ch.order}. ${ch.name}: ${await prisma.product.count({ where: { categoryId: ch.id } })}`);
  await prisma.$disconnect();
})();