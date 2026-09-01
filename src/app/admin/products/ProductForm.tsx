"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowRight, Upload, X } from "lucide-react";
import Link from "next/link";

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

interface ProductForm {
  name: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  sku: string;
  categoryId: string;
  brandId: string;
  active: boolean;
  featured: boolean;
  specifications: string;
}

export default function ProductEditPage({ productId }: { productId?: string }) {
  const router = useRouter();
  const isNew = !productId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: 0,
    discountPrice: null,
    stock: 0,
    sku: "",
    categoryId: "",
    brandId: "",
    active: true,
    featured: false,
    specifications: "",
  });
  const [images, setImages] = useState<{ id?: string; url: string; alt: string; isPrimary: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/brands").then((r) => r.json()),
    ]).then(([cats, brs]) => {
      setCategories(cats);
      setBrands(brs);
    });

    if (productId) {
      fetch(`/api/admin/products/${productId}`)
        .then((r) => r.json())
        .then((product) => {
          setForm({
            name: product.name || "",
            description: product.description || "",
            price: product.price || 0,
            discountPrice: product.discountPrice || null,
            stock: product.stock || 0,
            sku: product.sku || "",
            categoryId: product.categoryId || "",
            brandId: product.brandId || "",
            active: product.active ?? true,
            featured: product.featured ?? false,
            specifications: product.specifications || "",
          });
          if (product.images) {
            setImages(product.images);
          }
          setLoading(false);
        });
    }
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let specs = null;
    if (form.specifications.trim()) {
      try {
        specs = JSON.parse(form.specifications);
      } catch {
        alert("فرمت مشخصات فنی نادرست است. لطفاً JSON معتبر وارد کنید.");
        setSaving(false);
        return;
      }
    }

    const body = {
      ...form,
      price: Number(form.price) || 0,
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      stock: Number(form.stock) || 0,
      images,
      specifications: specs,
    };

    const url = isNew ? "/api/admin/products" : `/api/admin/products/${productId}`;
    const method = isNew ? "POST" : "PUT";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    router.push("/admin/products");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", files[i]);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setImages((prev) => [
          ...prev,
          { url: data.url, alt: files[i].name, isPrimary: prev.length === 0 },
        ]);
      }
      setUploading(false);
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-2xl font-bold">
          {isNew ? "افزودن محصول جدید" : "ویرایش محصول"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نام محصول *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">قیمت (تومان)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">قیمت 0 = تماس بگیرید</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">قیمت تخفیفی (تومان)</label>
            <input
              type="number"
              min="0"
              value={form.discountPrice || ""}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">موجودی</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مشخصات فنی (JSON)</label>
          <textarea
            rows={3}
            value={form.specifications}
            onChange={(e) => setForm({ ...form, specifications: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder='{"برند": "Delta", "مدل": "DVP-SX2"}'
          />
          <p className="text-xs text-gray-500 mt-1">فرمت: JSON - مثلاً {"{"}&quot;کلید&quot;: &quot;مقدار&quot;{"}"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">انتخاب دسته‌بندی</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">برند</label>
            <select
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">انتخاب برند</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">فعال</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">محصول ویژه</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">تصاویر محصول</label>
          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((img, index) => (
              <div
                key={index}
                className={`relative group w-24 h-24 rounded-lg overflow-hidden border-2 ${
                  img.isPrimary ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(index)}
                      className="bg-blue-500 text-white rounded p-1 text-xs"
                      title="تصویر اصلی"
                    >
                      ★
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-red-500 text-white rounded p-1 text-xs"
                    title="حذف"
                  >
                    <X size={12} />
                  </button>
                </div>
                {img.isPrimary && (
                  <span className="absolute bottom-0 right-0 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-tl">
                    اصلی
                  </span>
                )}
              </div>
            ))}
            <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-[10px] text-gray-400 mt-1">
                {uploading ? "آپلود..." : "افزودن"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/admin/products" className="px-6 py-2 border rounded-lg hover:bg-gray-50">
            انصراف
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </div>
      </form>
    </div>
  );
}
