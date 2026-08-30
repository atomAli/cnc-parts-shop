import { NextResponse } from "next/server";
import { categories as staticCategories, subcategories as staticSubcategories } from "@/lib/data";

export async function GET() {
  const result = staticCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    children: staticSubcategories
      .filter((sub) => sub.categoryId === cat.id)
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        icon: sub.icon,
        parentId: cat.id,
        _count: { products: 0 },
      })),
    _count: {
      products: staticSubcategories.filter((sub) => sub.categoryId === cat.id).length,
    },
  }));

  return NextResponse.json(result);
}
