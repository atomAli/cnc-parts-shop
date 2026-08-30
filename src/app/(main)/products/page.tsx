"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Filter, Grid, List, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  brand: string | { name: string };
  category: string | { name: string; slug: string };
  subcategory?: string;
  images: { url: string; isPrimary: boolean }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  children?: Category[];
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const addItem = useCartStore((s) => s.addItem);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get("sub") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?limit=1000").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([productsData, categoriesData]) => {
      setProducts(productsData.products || []);
      setCategories(categoriesData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter((p) => {
    if (selectedSubcategory) {
      if (p.subcategory !== selectedSubcategory) return false;
    } else if (selectedCategory) {
      const catSlug = typeof p.category === "string" ? p.category : p.category?.slug;
      if (catSlug !== selectedCategory) return false;
    }
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      const name = p.name.toLowerCase();
      const brand = typeof p.brand === "string" ? p.brand.toLowerCase() : p.brand?.name?.toLowerCase() || "";
      if (!name.includes(s) && !brand.includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      case "name":
        return a.name.localeCompare(b.name, "fa");
      default:
        return 0;
    }
  });

  const getBrandName = (brand: string | { name: string }) =>
    typeof brand === "string" ? brand : brand?.name || "";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fa-IR").format(price) + " تومان";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">محصولات</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <h3 className="font-bold text-lg mb-4">فیلترها</h3>

            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">جستجو</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نام محصول یا برند..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">دسته‌بندی</label>
              <div className="space-y-2">
                <button
                  onClick={() => { setSelectedCategory(""); setSelectedSubcategory(""); }}
                  className={`block w-full text-right px-3 py-2 rounded-lg text-sm ${
                    !selectedCategory ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                  }`}
                >
                  همه محصولات
                </button>
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <button
                      onClick={() => { setSelectedCategory(cat.slug); setSelectedSubcategory(""); }}
                      className={`block w-full text-right px-3 py-2 rounded-lg text-sm font-medium ${
                        selectedCategory === cat.slug ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="ml-2">{cat.icon}</span>
                      {cat.name}
                    </button>
                    {selectedCategory === cat.slug && cat.children && (
                      <div className="mr-4 mt-1 space-y-1">
                        {cat.children.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubcategory(sub.slug)}
                            className={`block w-full text-right px-3 py-1.5 rounded-lg text-xs ${
                              selectedSubcategory === sub.slug ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                فیلترها
              </button>
              <span className="text-sm text-gray-600">
                {filteredProducts.length} محصول یافت شد
              </span>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">جدیدترین</option>
                <option value="price-asc">ارزان‌ترین</option>
                <option value="price-desc">گران‌ترین</option>
                <option value="name">نام</option>
              </select>

              <div className="hidden sm:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <h3 className="font-bold mb-4">فیلترها</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">همه دسته‌بندی‌ها</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Products */}
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">در حال بارگذاری...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <p className="text-gray-500 text-lg">محصولی یافت نشد</p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                >
                  <Link href={`/products/${product.slug}`} className={`block bg-gray-50 relative overflow-hidden ${
                    viewMode === "list" ? "w-48 shrink-0" : "h-48"
                  }`}>
                    {product.images?.[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        width={200}
                        height={200}
                        className="object-contain max-h-full max-w-full m-auto transition-transform duration-300 ease-out group-hover:scale-110"
                        unoptimized
                      />
                    ) : (
                      <div className="text-gray-400 text-sm">تصویر محصول</div>
                    )}
                  </Link>
                  <div className="p-4 flex-1">
                    <div className="text-xs text-gray-500 mb-1">{getBrandName(product.brand)}</div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-bold hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-2">
                      {product.price ? (
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">تماس بگیرید</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          addItem({
                            id: product.id,
                            name: product.name,
                            slug: product.slug,
                            price: product.price || 0,
                          })
                        }
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <ShoppingCart size={16} />
                        افزودن به سبد خرید
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
