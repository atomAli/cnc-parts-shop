import { NextResponse } from "next/server";
import { products as staticProducts, categories as staticCategories, subcategories as staticSubcategories } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const search = searchParams.get("search");
  const brand = searchParams.get("brand");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");

  let filtered = [...staticProducts];

  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (subcategory) {
    filtered = filtered.filter((p) => p.subcategory === subcategory);
  }
  if (brand) {
    filtered = filtered.filter((p) => p.brand === brand);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        p.brand.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    products: paginated.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      subcategory: p.subcategory,
      category: {
        id: staticCategories.find((c) => c.slug === p.category)?.id || "",
        slug: p.category,
        name: staticCategories.find((c) => c.slug === p.category)?.name || p.category,
      },
      brand: {
        id: p.brand,
        slug: p.brand.toLowerCase(),
        name: p.brand,
      },
      images: p.imageUrl ? [{ id: p.id, url: p.imageUrl, alt: p.name, isPrimary: true }] : [],
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
