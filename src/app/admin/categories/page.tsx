"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  children: Category[];
  _count: { products: number; children: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    setCategories(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name, description, order, parentId: parentId || null };
    const url = editCategory ? `/api/admin/categories/${editCategory.id}` : "/api/admin/categories";
    const method = editCategory ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowForm(false);
    setEditCategory(null);
    setName("");
    setDescription("");
    setOrder(0);
    setParentId("");
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا مطمئن هستید؟")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) alert(data.error);
    fetchCategories();
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderCategory = (cat: Category, depth = 0) => (
    <div key={cat.id}>
      <div
        className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
        style={{ paddingRight: `${(depth * 24) + 16}px` }}
      >
        {cat.children && cat.children.length > 0 ? (
          <button onClick={() => toggleExpand(cat.id)} className="text-gray-400">
            {expanded.has(cat.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-1 font-medium text-sm">{cat.name}</span>
        <span className="text-xs text-gray-500">{cat._count?.products ?? 0} محصول</span>
        <button
          onClick={() => {
            setEditCategory(cat);
            setName(cat.name);
            setDescription((cat as any).description || "");
            setOrder(cat.order);
            setShowForm(true);
          }}
          className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
        >
          <Edit2 size={14} />
        </button>
        <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
          <Trash2 size={14} />
        </button>
      </div>
      {expanded.has(cat.id) && cat.children && cat.children.map((child) => renderCategory(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت دسته‌بندی‌ها</h1>
        <button
          onClick={() => {
            setEditCategory(null);
            setName("");
            setDescription("");
            setOrder(0);
            setParentId("");
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن دسته‌بندی
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h3 className="font-bold">{editCategory ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">نام *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">توضیحات</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">والد</label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">بدون والد (دسته اصلی)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اولویت</label>
                <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">ذخیره</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">دسته‌بندی‌ای وجود ندارد</div>
        ) : (
          categories.map((cat) => renderCategory(cat))
        )}
      </div>
    </div>
  );
}
