"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronLeft,
  FolderTree,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  active: boolean;
  children?: Category[];
}

const mockCategories: Category[] = [
  {
    id: "1",
    name: "قطعات برقی",
    slug: "electrical",
    productCount: 45,
    active: true,
    children: [
      { id: "1-1", name: "PLC", slug: "plc", productCount: 12, active: true },
      { id: "1-2", name: "HMI", slug: "hmi", productCount: 8, active: true },
      { id: "1-3", name: "موتور سروو", slug: "servo-motor", productCount: 10, active: true },
      { id: "1-4", name: "استپ موتور", slug: "step-motor", productCount: 6, active: true },
      { id: "1-5", name: "اینورتر", slug: "inverter", productCount: 9, active: true },
    ],
  },
  {
    id: "2",
    name: "قطعات مکانیکی",
    slug: "mechanical",
    productCount: 38,
    active: true,
    children: [
      { id: "2-1", name: "ریل و واگن", slug: "lm-guide", productCount: 15, active: true },
      { id: "2-2", name: "بالسکرو", slug: "ballscrew", productCount: 12, active: true },
      { id: "2-3", name: "گیربکس", slug: "gearbox", productCount: 6, active: true },
      { id: "2-4", name: "کوپلینگ", slug: "coupling", productCount: 5, active: true },
    ],
  },
  {
    id: "3",
    name: "خدمات",
    slug: "services",
    productCount: 4,
    active: true,
    children: [
      { id: "3-1", name: "تعمیرات", slug: "repairs", productCount: 1, active: true },
      { id: "3-2", name: "قالب‌سازی", slug: "plastic-injection", productCount: 1, active: true },
    ],
  },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["1", "2"]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", parentId: "" });

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (newCategory.parentId) {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === newCategory.parentId) {
            return {
              ...cat,
              children: [
                ...(cat.children || []),
                {
                  id: Date.now().toString(),
                  name: newCategory.name,
                  slug: newCategory.slug,
                  productCount: 0,
                  active: true,
                },
              ],
            };
          }
          return cat;
        })
      );
    } else {
      setCategories((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: newCategory.name,
          slug: newCategory.slug,
          productCount: 0,
          active: true,
          children: [],
        },
      ]);
    }
    setShowAddModal(false);
    setNewCategory({ name: "", slug: "", parentId: "" });
  };

  const handleDelete = (id: string) => {
    setCategories((prev) =>
      prev
        .filter((cat) => cat.id !== id)
        .map((cat) => ({
          ...cat,
          children: cat.children?.filter((child) => child.id !== id),
        }))
    );
    setShowDeleteModal(null);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.includes(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 ${
            level > 0 ? "mr-8" : ""
          }`}
        >
          <GripVertical size={16} className="text-gray-400 cursor-move" />

          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <FolderTree size={18} className={level > 0 ? "text-gray-400" : "text-blue-500"} />

          <div className="flex-1">
            <div className="font-medium">{category.name}</div>
            <div className="text-xs text-gray-500">/{category.slug}</div>
          </div>

          <span className="text-sm text-gray-500">
            {category.productCount} محصول
          </span>

          <span
            className={`px-2 py-1 rounded text-xs ${
              category.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {category.active ? "فعال" : "غیرفعال"}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditingCategory(category);
                setShowAddModal(true);
              }}
              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setShowDeleteModal(category.id)}
              className="p-2 hover:bg-red-50 rounded-lg text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {isExpanded &&
          hasChildren &&
          category.children!.map((child) => renderCategory(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت دسته‌بندی‌ها</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setNewCategory({ name: "", slug: "", parentId: "" });
            setShowAddModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن دسته‌بندی
        </button>
      </div>

      {/* Categories Tree */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>نام دسته‌بندی</span>
            <span>عملیات</span>
          </div>
        </div>
        {categories.map((category) => renderCategory(category))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative z-10">
            <h3 className="text-lg font-bold mb-4">
              {editingCategory ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="نام دسته‌بندی"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام انگلیسی (slug)</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="category-slug"
                  dir="ltr"
                />
              </div>
              {!editingCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی والد</label>
                  <select
                    value={newCategory.parentId}
                    onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ندارد (دسته‌بندی اصلی)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                انصراف
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingCategory ? "ذخیره تغییرات" : "افزودن"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(null)} />
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative z-10">
            <h3 className="text-lg font-bold mb-4">حذف دسته‌بندی</h3>
            <p className="text-gray-600 mb-6">
              آیا مطمئن هستید؟ تمام زیردسته‌ها و محصولات این دسته‌بندی نیز حذف خواهند شد.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                انصراف
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
