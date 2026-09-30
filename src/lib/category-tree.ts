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
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const id of childrenByParent.get(cur) ?? []) {
      out.push(id);
      queue.push(id);
    }
  }
  return out;
}