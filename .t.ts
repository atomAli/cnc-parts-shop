import prisma from "./src/lib/prisma";
(async () => {
  const root = await prisma.category.findUnique({ where: { slug: "shafts" }, include: { children: { orderBy: { order: "asc" } } } });
  console.log("ROOT:", root?.name, "| slug:", root?.slug, "| order:", root?.order);
  root!.children.forEach(c=>console.log("  child:", c.name, "|", c.slug, "| order", c.order));
  const ids = [root!.id, ...root!.children.map((c) => c.id)];
  const rows = await prisma.product.findMany({ where: { active: true, categoryId: { in: ids } }, select: { name: true, category: { select: { slug: true } } }, orderBy: [{ categoryId: "asc" }, { name: "asc" }] });
  console.log("total:", rows.length, "| root direct:", await prisma.product.count({ where: { categoryId: root!.id } }));
  const byChild: Record<string,string[]> = {};
  for (const r of rows) { (byChild[r.category.slug] ??= []).push(r.name); }
  for (const [slug, names] of Object.entries(byChild)) {
    console.log(`\n## ${slug} (${names.length}):`);
    names.forEach(n=>console.log("  -", n.substring(0,80)));
  }
  await prisma.$disconnect();
})();
