"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Award, ExternalLink } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  productsCount: number;
  website: string;
}

const mockBrands: Brand[] = [
  { id: "1", name: "Delta (دلتا)", slug: "delta", productsCount: 45, website: "www.delta.com.tw" },
  { id: "2", name: "Hiwin (هایوین)", slug: "hiwin", productsCount: 30, website: "www.hiwin.com" },
  { id: "3", name: "Siemens (زیمنس)", slug: "siemens", productsCount: 20, website: "www.siemens.com" },
  { id: "4", name: "Mitsubishi (میتسوبیشی)", slug: "mitsubishi", productsCount: 18, website: "www.mitsubishielectric.com" },
  { id: "5", name: "Schneider (اشنایدر)", slug: "schneider", productsCount: 15, website: "www.se.com" },
];

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>(mockBrands);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState({ name: "", slug: "", website: "" });

  const handleAdd = () => {
    if (editingBrand) {
      setBrands((prev) =>
        prev.map((b) =>
          b.id === editingBrand.id ? { ...b, ...newBrand } : b
        )
      );
    } else {
      setBrands((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...newBrand,
          productsCount: 0,
        },
      ]);
    }
    setShowAddModal(false);
    setEditingBrand(null);
    setNewBrand({ name: "", slug: "", website: "" });
  };

  const handleDelete = (id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    setShowDeleteModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت برندها</h1>
        <button
          onClick={() => {
            setEditingBrand(null);
            setNewBrand({ name: "", slug: "", website: "" });
            setShowAddModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن برند
        </button>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Award size={24} className="text-gray-500" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingBrand(brand);
                    setNewBrand({ name: brand.name, slug: brand.slug, website: brand.website });
                    setShowAddModal(true);
                  }}
                  className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setShowDeleteModal(brand.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-1">{brand.name}</h3>
            <div className="text-sm text-gray-500 mb-3">/{brand.slug}</div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{brand.productsCount} محصول</span>
              {brand.website && (
                <a
                  href={`https://${brand.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink size={14} />
                  وبسایت
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative z-10">
            <h3 className="text-lg font-bold mb-4">
              {editingBrand ? "ویرایش برند" : "افزودن برند جدید"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام برند</label>
                <input
                  type="text"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثلاً Delta (دلتا)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام انگلیسی (slug)</label>
                <input
                  type="text"
                  value={newBrand.slug}
                  onChange={(e) => setNewBrand({ ...newBrand, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="delta"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وبسایت</label>
                <input
                  type="text"
                  value={newBrand.website}
                  onChange={(e) => setNewBrand({ ...newBrand, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="www.example.com"
                  dir="ltr"
                />
              </div>
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
                {editingBrand ? "ذخیره تغییرات" : "افزودن"}
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
            <h3 className="text-lg font-bold mb-4">حذف برند</h3>
            <p className="text-gray-600 mb-6">
              آیا مطمئن هستید؟ محصولات این برند از دسته‌بندی حذف نخواهند شد.
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
