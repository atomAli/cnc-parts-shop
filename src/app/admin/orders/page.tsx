"use client";

import { useState } from "react";
import {
  Search,
  Eye,
  ChevronDown,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from "lucide-react";

interface Order {
  id: string;
  customer: string;
  phone: string;
  total: number;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  items: { name: string; quantity: number; price: number }[];
  date: string;
  address: string;
  notes: string;
}

const mockOrders: Order[] = [
  {
    id: "1021",
    customer: "علی رجمندی",
    phone: "09121234567",
    total: 25000000,
    status: "CONFIRMED",
    items: [
      { name: "PLC دلتا DVP-SX2", quantity: 1, price: 15000000 },
      { name: "HMI دلتا DOP-107BV", quantity: 1, price: 10000000 },
    ],
    date: "۱۴۰۳/۰۴/۱۵",
    address: "تهران، خیابان آزادی",
    notes: "ارسال با پست پیشتاز",
  },
  {
    id: "1020",
    customer: "محمد احمدی",
    phone: "09198765432",
    total: 8500000,
    status: "PENDING",
    items: [{ name: "HMI دلتا DOP-107BV", quantity: 1, price: 8500000 }],
    date: "۱۴۰۳/۰۴/۱۵",
    address: "اصفهان، خیابان چهارباغ",
    notes: "",
  },
  {
    id: "1019",
    customer: "رضا کریمی",
    phone: "09111111111",
    total: 12000000,
    status: "SHIPPED",
    items: [{ name: "اینورتر دلتا VFD-M", quantity: 1, price: 12000000 }],
    date: "۱۴۰۳/۰۴/۱۴",
    address: "شیراز، خیابان زند",
    notes: "شماره پیگیری: ۱۲۳۴۵۶۷۸۹",
  },
  {
    id: "1018",
    customer: "مریم محمدی",
    phone: "09351234567",
    total: 35000000,
    status: "DELIVERED",
    items: [
      { name: "موتور سروو دلتا 1KW", quantity: 1, price: 25000000 },
      { name: "ریل و واگن 20mm", quantity: 2, price: 5000000 },
    ],
    date: "۱۴۰۳/۰۴/۱۴",
    address: "تبریز، خیابان امام",
    notes: "",
  },
  {
    id: "1017",
    customer: "حسین عباسی",
    phone: "09129876543",
    total: 6200000,
    status: "CANCELLED",
    items: [{ name: "بالسکرو 1605", quantity: 2, price: 3100000 }],
    date: "۱۴۰۳/۰۴/۱۳",
    address: "مشهد، خیابان احمدآباد",
    notes: "لغو شده به درخواست مشتری",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "در انتظار", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  CONFIRMED: { label: "تایید شده", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  SHIPPED: { label: "ارسال شده", color: "bg-purple-100 text-purple-700", icon: Truck },
  DELIVERED: { label: "تحویل شده", color: "bg-green-100 text-green-700", icon: Package },
  CANCELLED: { label: "لغو شده", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.includes(searchQuery) ||
      order.id.includes(searchQuery) ||
      order.phone.includes(searchQuery);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
  };

  const updateStatus = (orderId: string, newStatus: Order["status"]) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت سفارشات</h1>
        <div className="text-sm text-gray-500">{filteredOrders.length} سفارش</div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی سفارش..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING">در انتظار</option>
          <option value="CONFIRMED">تایید شده</option>
          <option value="SHIPPED">ارسال شده</option>
          <option value="DELIVERED">تحویل شده</option>
          <option value="CANCELLED">لغو شده</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">شماره</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">مشتری</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">مبلغ کل</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">وضعیت</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تاریخ</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusInfo = statusConfig[order.status];
                return (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">#{order.id}</td>
                    <td className="px-6 py-4">
                      <div>{order.customer}</div>
                      <div className="text-xs text-gray-500" dir="ltr">{order.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.date}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} />
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 relative z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">جزئیات سفارش #{selectedOrder.id}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-500">مشتری</div>
                <div className="font-medium">{selectedOrder.customer}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">تلفن</div>
                <div className="font-medium" dir="ltr">{selectedOrder.phone}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">آدرس</div>
                <div className="font-medium">{selectedOrder.address}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">تاریخ</div>
                <div className="font-medium">{selectedOrder.date}</div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">یادداشت</div>
                <div className="text-sm">{selectedOrder.notes}</div>
              </div>
            )}

            <div className="mb-6">
              <div className="text-sm font-medium text-gray-500 mb-3">اقلام سفارش</div>
              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-gray-500 mr-2">× {item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between">
                <span className="font-bold">جمع کل:</span>
                <span className="font-bold text-blue-600">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500 mb-3">تغییر وضعیت</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusConfig) as Order["status"][]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(selectedOrder.id, status)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedOrder.status === status
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {statusConfig[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
