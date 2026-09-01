import prisma from "@/lib/prisma";
import { scoreQuery, normalizeFa } from "@/lib/search";
import type { Prisma } from "@prisma/client";

const productInclude = {
  category: { include: { parent: true } },
  brand: true,
  images: { where: { isPrimary: true }, take: 1 },
} as const;

export type SearchableProduct = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

const BATCH = 400;

export async function getSearchCandidates(
  where: Prisma.ProductWhereInput
): Promise<SearchableProduct[]> {
  const results: SearchableProduct[] = [];
  let skip = 0;
  for (;;) {
    const batch = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { id: "asc" },
      skip,
      take: BATCH,
    });
    results.push(...batch);
    if (batch.length < BATCH) break;
    skip += BATCH;
    if (skip > 50000) break;
  }
  return results;
}

export interface RankInput {
  name: string;
  sku?: string | null;
  brand?: { name: string } | null;
  category?: { name: string } | null;
}

export function rankProducts<T extends RankInput>(
  query: string,
  products: T[]
): { product: T; score: number }[] {
  const nq = normalizeFa(query);
  if (!nq) return [];
  return products
    .map((product) => ({
      product,
      score: scoreQuery(nq, {
        name: product.name,
        sku: product.sku,
        brandName: product.brand?.name || "",
        categoryName: product.category?.name || "",
      }),
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name, "fa")
    );
}