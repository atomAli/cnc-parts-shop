"use client";

import { useEffect, useState } from "react";
import { Search, CheckSquare, Square, Percent, RefreshCw } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
}

interface PriceProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  discountPrice: number | null;
  brandId: string | null;
  category: { name: string } | null;
  brand: { name: string } | null;
}

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

export default function PriceManagerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [products, setProducts] = useState<PriceProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [percent, setPercent] = useState("");
  const [mode, setMode] = useState<"increase" | "decrease">("increase");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data);
  };

  const fetchBrands = async () => {
    const res = await fetch("/api/admin/brands");
    const data = await res.json();
    if (Array.isArray(data)) setBrands(data);
  };

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  const loadProducts = async (catId: string) => {
    setLoadingProducts(true);
    setResult(null);
    const res = await fetch(`/api/admin/prices?categoryId=${encodeURIComponent(catId)}`);
    const data = await res.json();
    setProducts(data.products || []);
    setSelected(new Set());
    setSearch("");
    setBrandId("");
    setLoadingProducts(false);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    if (value) loadProducts(value);
    else {
      setProducts([]);
      setSelected(new Set());
      setBrandId("");
    }
  };

  const byBrand = brandId ? products.filter((p) => p.brandId === brandId) : products;

  const filtered = search.trim()
    ? byBrand.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.trim().toLowerCase())))
    : byBrand;

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pct = Number(percent);
  const factor = Number.isFinite(pct) && pct !== 0 ? (mode === "increase" ? 1 + pct / 100 : 1 - pct / 100) : null;
  const calcNewPrice = (price: number) => (factor ? Math.max(0, Math.round(price * factor)) : price);

  const selectedProducts = products.filter((p) => selected.has(p.id));
  const selectedWithPrice = selectedProducts.filter((p) => p.price > 0);

  const handleApply = async () => {
    if (selectedProducts.length === 0) {
      setResult("هیچ محصولی انتخاب نشده است");
      return;
    }
    if (!Number.isFinite(pct) || pct === 0) {
      setResult("درصد تغییر را وارد کنید");
      return;
    }
    const confirmText = `قیمت ${selectedWithPrice.length} کالا به میزان ${pct}% ${
      mode === "increase" ? "افزایش" : "کاهش"
    } پیدا می‌کند.${
      selectedWithPrice.length !== selectedProducts.length
        ? `\n${selectedProducts.length - selectedWithPrice.length} کالا قیمت 0 دارند و تغییر نمی‌کنند.`
        : ""
    }\nآیا مطمئن هستید؟`;

    if (!window.confirm(confirmText)) return;

    setApplying(true);
    setResult(null);
    const res = await fetch("/api/admin/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds: Array.from(selected),
        percent: pct,
        mode,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult(`${data.updated} کالا به‌روزرسانی شد${data.skipped ? ` (${data.skipped} کالای بدون قیمت رد شد)` : ""}`);
      loadProducts(categoryId);
    } else {
      setResult(data.error || "خطا در اعمال تغییر قیمت");
    }
    setApplying(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت قیمت</h1>
        <p className="text-sm text-gray-500 mt-1">
          انتخاب گروهی کالاها و اعمال تغییر درصدی قیمت
        </p>
      </div>

      {/* Select category */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              انتخاب دسته‌بندی
            </label>
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">انتخاب دسته‌بندی...</option>
              {categories.map((c) =>
                c.children && c.children.length > 0 ? (
                  <optgroup key={c.id} label={c.name}>
                    {c.children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فیلتر برند
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              disabled={!categoryId}
              className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">همه برندها</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoryId && (
          <p className="text-sm text-gray-500 mt-3">
            {loadingProducts
              ? "در حال بارگذاری..."
              : `${filtered.length} کالا از ${products.length} کالای این دسته${
                  brandId ? " (فیلتر برند)" : ""
                }`}
          </p>
        )}
      </div>

      {categoryId && !loadingProducts && (
        <>
          {/* Products list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 p-4 border-b border-gray-100">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="جستجوی نام یا SKU..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFiltered}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                {allFilteredSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                {allFilteredSelected ? "لغو انتخاب همه" : "انتخاب همه"}
              </button>
              <span className="text-sm text-gray-600">
                {selected.size} انتخاب شده
              </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400">کالایی یافت نشد</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
                    <tr>
                      <th className="py-2 px-4 text-right font-medium">انتخاب</th>
                      <th className="py-2 px-4 text-right font-medium">نام</th>
                      <th className="py-2 px-4 text-right font-medium">برند</th>
                      <th className="py-2 px-4 text-right font-medium">قیمت فعلی</th>
                      <th className="py-2 px-4 text-right font-medium">قیمت جدید</th>
                      <th className="py-2 px-4 text-right font-medium">قیمت تخفیفی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const isSelected = selected.has(p.id);
                      const changed = p.price > 0 && factor && calcNewPrice(p.price) !== p.price;
                      const newPrice = p.price > 0 ? calcNewPrice(p.price) : p.price;
                      return (
                        <tr
                          key={p.id}
                          className={`border-t border-gray-50 cursor-pointer hover:bg-blue-50/40 ${
                            isSelected ? "bg-blue-50/60" : ""
                          }`}
                          onClick={() => toggleOne(p.id)}
                        >
                          <td className="py-2 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(p.id)}
                              className="rounded accent-blue-600"
                            />
                          </td>
                          <td className="py-2 px-4 max-w-[320px]">
                            <div className="truncate">{p.name}</div>
                            {p.category && <div className="text-xs text-gray-400">{p.category.name}</div>}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-gray-600">{p.brand?.name || "-"}</td>
                          <td className="py-2 px-4 whitespace-nowrap">
                            {p.price > 0 ? formatPrice(p.price) : <span className="text-gray-400">تماس بگیرید</span>}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap">
                            {p.price > 0 && factor ? (
                              <span className={changed ? (newPrice > p.price ? "text-green-600 font-medium" : "text-red-600 font-medium") : "text-gray-400"}>
                                {formatPrice(newPrice)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap">
                            {p.discountPrice ? formatPrice(p.discountPrice) : <span className="text-gray-400">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Percent change */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">درصد تغییر</label>
                <div className="flex items-center gap-2">
                  <Percent size={18} className="text-gray-400" />
                  <input
                    type="number"
                    step="any"
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    placeholder="مثلاً 15"
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع تغییر</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("increase")}
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                      mode === "increase"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    افزایش
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("decrease")}
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                      mode === "decrease"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    کاهش
                  </button>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-4 justify-end">
                {selectedWithPrice.length > 0 && factor && (
                  <span className="text-sm text-gray-600">
                    قیمت {selectedWithPrice.length} کالای انتخابی{" "}
                    {mode === "increase" ? "افزایش" : "کاهش"} می‌یابد
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || selectedWithPrice.length === 0}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applying ? <RefreshCw size={18} className="animate-spin" /> : <Percent size={18} />}
                  {applying ? "در حال اعمال..." : "اعمال تغییر قیمت"}
                </button>
              </div>
            </div>

            {result && (
              <div
                className={`mt-4 px-4 py-3 rounded-lg text-sm ${
                  result.includes("به‌روزرسانی")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {result}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}