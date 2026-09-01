import { NextRequest, NextResponse } from "next/server";
import { normalizeFa } from "@/lib/search";
import { getSearchCandidates, rankProducts } from "@/lib/search-catalog";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

  const nq = normalizeFa(q);
  if (!nq) return NextResponse.json([]);

  const candidates = await getSearchCandidates({ active: true });
  const ranked = rankProducts(nq, candidates).slice(0, limit);

  return NextResponse.json(
    ranked.map(({ product: p }) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      discountPrice: p.discountPrice,
      brand: p.brand?.name || "",
      category: p.category?.name || "",
      parentCategory: p.category?.parent?.name || "",
      image: p.images[0]?.url || "",
    }))
  );
}