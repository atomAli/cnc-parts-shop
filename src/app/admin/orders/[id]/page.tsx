"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";

const toPersianNumber = (n: number) => n.toLocaleString("fa-IR");

const statusLabels: Record<string, string> = {
  PENDING: "در انتظار",
  CONFIRMED: "تایید شده",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
};

interface OrderDetail {
  id: string;
  totalPrice: number;
  status: string;
  shippingAddress: string | null;
  phone: string;
  notes: string | null;
  createdAt: string;
  user: { name: string; phone: string; email: string } | null;
  items: { product: { name: string }; price: number; quantity: number }[];
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        setStatus(data.status);
        setLoading(false);
      });
  }, [id]);

  const handleUpdate = async () => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  if (loading) return <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>;
  if (!order) return <div className="text-center py-12 text-gray-400">سفارش یافت نشد</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-2xl font-bold">جزئیات سفارش</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">شماره سفارش:</span>
            <span className="font-mono mr-2">{order.id.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-gray-500">تاریخ:</span>
            <span className="mr-2">{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
          </div>
          <div>
            <span className="text-gray-500">مشتری:</span>
            <span className="mr-2">{order.user?.name || "نامشخص"}</span>
          </div>
          <div>
            <span className="text-gray-500">تلفن:</span>
            <span className="mr-2" dir="ltr">{order.user?.phone}</span>
          </div>
        </div>

        <div>
          <span className="text-gray-500 text-sm">آدرس:</span>
          <p className="text-sm mt-1">{order.shippingAddress || "ثبت نشده"}</p>
        </div>

        <div>
          <h3 className="font-medium mb-2">اقلام سفارش</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2">محصول</th>
                <th className="text-right py-2">قیمت</th>
                <th className="text-right py-2">تعداد</th>
                <th className="text-right py-2">جمع</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{item.product.name}</td>
                  <td className="py-2" dir="ltr">{toPersianNumber(item.price)} تومان</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2 font-medium" dir="ltr">{toPersianNumber(item.price * item.quantity)} تومان</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-2 font-bold">جمع کل</td>
                <td className="py-2 font-bold" dir="ltr">{toPersianNumber(order.totalPrice)} تومان</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="pt-4 border-t">
          <label className="block text-sm font-medium mb-1">وضعیت</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg max-w-xs"
          >
            {Object.entries(statusLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleUpdate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save size={18} />
            بروزرسانی
          </button>
        </div>
      </div>
    </div>
  );
}
