import prisma from "@/lib/prisma";

export async function getAllCategoriesIndex(): Promise<Map<string, string[]>> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }
  return childrenByParent;
}

export function collectDescendantIds(childrenByParent: Map<string, string[]>, rootId: string): string[] {
  const out: string[] = [];
  // محافظت در برابر رکوردهایی که parentId=self دارند (جلوگیری از حلقهٔ بیپایان).
  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const id of childrenByParent.get(cur) ?? []) {
      if (visited.has(id)) continue;
      visited.add(id);
      out.push(id);
      queue.push(id);
    }
  }
  return out;
}