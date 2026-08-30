"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  Package,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  active: boolean;
  featured: boolean;
}

const mockProducts: Product[] = [
  { id: "1", name: "PLC دلتا DVP-SX2", slug: "plc-delta-dvp-sx2", price: 15000000, stock: 10, category: "PLC", brand: "Delta", active: true, featured: true },
  { id: "2", name: "HMI دلتا DOP-107BV", slug: "hmi-delta-dop-107bv", price: 8500000, stock: 5, category: "HMI", brand: "Delta", active: true, featured: false },
  { id: "3", name: "موتور سروو دلتا 1KW", slug: "servo-motor-delta-1kw", price: 25000000, stock: 8, category: "موتور سروو", brand: "Delta", active: true, featured: true },
  { id: "4", name: "اینورتر دلتا VFD-M", slug: "inverter-delta-vfd-m", price: 12000000, stock: 15, category: "اینورتر", brand: "Delta", active: true, featured: false },
  { id: "5", name: "ریل و واگن 20mm", slug: "lm-guide-20mm", price: 3500000, stock: 20, category: "ریل و واگن", brand: "Hiwin", active: true, featured: false },
  { id: "6", name: "بالسکرو 1605", slug: "ballscrew-1605", price: 2800000, stock: 0, category: "بالسکرو", brand: "Hiwin", active: true, featured: false },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.includes(searchQuery) || p.brand.includes(searchQuery);
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fa-IR").format(price);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    setShowDeleteModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت محصولات</h1>
        <Link
          href="/admin/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          افزودن محصول
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی محصول..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">همه دسته‌بندی‌ها</option>
          <option value="PLC">PLC</option>
          <option value="HMI">HMI</option>
          <option value="موتور سروو">موتور سروو</option>
          <option value="اینورتر">اینورتر</option>
          <option value="ریل و واگن">ریل و واگن</option>
          <option value="بالسکرو">بالسکرو</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">محصول</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">دسته‌بندی</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">قیمت</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">موجودی</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">وضعیت</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package size={20} className="text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-medium">{formatPrice(product.price)} تومان</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-medium ${
                        product.stock > 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {product.stock > 0 ? product.stock : "ناموجود"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {product.active && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          فعال
                        </span>
                      )}
                      {product.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                          ویژه
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                      >
                        <Edit2 size={16} />
                      </Link>
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        onClick={() => setShowDeleteModal(product.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            محصولی یافت نشد
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(null)} />
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative z-10">
            <h3 className="text-lg font-bold mb-4">حذف محصول</h3>
            <p className="text-gray-600 mb-6">
              آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟ این عمل قابل بازگشت نیست.
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
