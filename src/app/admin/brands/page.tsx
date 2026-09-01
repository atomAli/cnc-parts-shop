"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  _count: { products: number };
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  const fetchBrands = async () => {
    const res = await fetch("/api/admin/brands");
    setBrands(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editBrand ? `/api/admin/brands/${editBrand.id}` : "/api/admin/brands";
    const method = editBrand ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, website: website || null }),
    });
    setShowForm(false);
    setEditBrand(null);
    setName("");
    setWebsite("");
    fetchBrands();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا مطمئن هستید؟")) return;
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    }
    fetchBrands();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت برندها</h1>
        <button
          onClick={() => {
            setEditBrand(null);
            setName("");
            setWebsite("");
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن برند
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h3 className="font-bold">{editBrand ? "ویرایش برند" : "برند جدید"}</h3>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">نام برند *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">وبسایت</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="www.example.com"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              ذخیره
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              انصراف
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">برند</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">وبسایت</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">تعداد محصولات</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">در حال بارگذاری...</td></tr>
            ) : brands.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">برندی وجود ندارد</td></tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      <span className="font-medium">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{brand.website || "-"}</td>
                  <td className="px-6 py-4 text-sm">{brand._count.products}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditBrand(brand);
                          setName(brand.name);
                          setWebsite(brand.website || "");
                          setShowForm(true);
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(brand.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
