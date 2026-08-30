"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Image, GripVertical, Eye, EyeOff } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  active: boolean;
  order: number;
}

const mockBanners: Banner[] = [
  { id: "1", title: "فروش ویژه موتورهای سروو", subtitle: "تا ۲۰٪ تخفیف", link: "/products?category=servo", active: true, order: 1 },
  { id: "2", title: "جدیدترین PLC های دلتا", subtitle: "موجود در انبار", link: "/products?category=plc", active: true, order: 2 },
  { id: "3", title: "مشاوره رایگان اتوماسیون", subtitle: "تماس بگیرید", link: "/contact", active: false, order: 3 },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>(mockBanners);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState({ title: "", subtitle: "", link: "" });

  const handleAdd = () => {
    if (editingBanner) {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === editingBanner.id ? { ...b, ...newBanner } : b
        )
      );
    } else {
      setBanners((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...newBanner,
          active: true,
          order: prev.length + 1,
        },
      ]);
    }
    setShowAddModal(false);
    setEditingBanner(null);
    setNewBanner({ title: "", subtitle: "", link: "" });
  };

  const handleDelete = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    setShowDeleteModal(null);
  };

  const toggleActive = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت بنرها</h1>
        <button
          onClick={() => {
            setEditingBanner(null);
            setNewBanner({ title: "", subtitle: "", link: "" });
            setShowAddModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن بنر
        </button>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4 flex items-center gap-4">
              <GripVertical size={16} className="text-gray-400 cursor-move" />

              <div className="w-32 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                <Image size={24} className="text-gray-400" />
              </div>

              <div className="flex-1">
                <div className="font-bold">{banner.title}</div>
                <div className="text-sm text-gray-500">{banner.subtitle}</div>
                <div className="text-xs text-gray-400 mt-1" dir="ltr">{banner.link}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(banner.id)}
                  className={`p-2 rounded-lg ${
                    banner.active
                      ? "hover:bg-green-50 text-green-600"
                      : "hover:bg-gray-100 text-gray-400"
                  }`}
                  title={banner.active ? "غیرفعال کردن" : "فعال کردن"}
                >
                  {banner.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => {
                    setEditingBanner(banner);
                    setNewBanner({ title: banner.title, subtitle: banner.subtitle, link: banner.link });
                    setShowAddModal(true);
                  }}
                  className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setShowDeleteModal(banner.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {!banner.active && (
              <div className="px-4 pb-2">
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">غیرفعال</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative z-10">
            <h3 className="text-lg font-bold mb-4">
              {editingBanner ? "ویرایش بنر" : "افزودن بنر جدید"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان</label>
                <input
                  type="text"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="عنوان بنر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">زیرعنوان</label>
                <input
                  type="text"
                  value={newBanner.subtitle}
                  onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="زیرعنوان بنر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">لینک</label>
                <input
                  type="text"
                  value={newBanner.link}
                  onChange={(e) => setNewBanner({ ...newBanner, link: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="/products"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تصویر بنر</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <Image size={32} className="mx-auto text-gray-400 mb-2" />
                  <div className="text-sm text-gray-500">کلیک کنید یا تصویر را بکشید</div>
                  <div className="text-xs text-gray-400 mt-1">PNG, JPG تا ۵MB</div>
                </div>
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
                {editingBanner ? "ذخیره تغییرات" : "افزودن"}
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
            <h3 className="text-lg font-bold mb-4">حذف بنر</h3>
            <p className="text-gray-600 mb-6">آیا مطمئن هستید که می‌خواهید این بنر را حذف کنید؟</p>
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
