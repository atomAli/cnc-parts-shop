"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Trash2, User, Receipt, ChevronDown, Check, Printer } from "lucide-react";
import { isRailOrScrew, getProductMaxLength } from "@/lib/meter-product";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  isMeter?: boolean | null;
  sku?: string | null;
  category?: { slug?: string } | null;
}

interface CrmUser {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface InvoiceItem {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  price?: number;
  quantity: number;
  length?: number;
  isMeter?: boolean;
  branchCount?: number;
  branchLength?: number;
  baseLength?: number;
  discountPercent?: number;
}

interface CategoryOpt {
  id: string;
  name: string;
  slug: string;
}

interface BrandOpt {
  id: string;
  name: string;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber?: number;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  totalPrice: number;
  createdAt: string;
  user?: CrmUser | null;
}

interface LineItem {
  productId: string;
  name: string;
  slug: string;
  isMeter: boolean;
  baseLength: number;
  sitePrice: number;
  unitPrice: string;
  quantity: number;
  branchLength: string;
  discount: string;
}

const faNum = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

export default function AdminInvoicesPage() {
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<CrmUser[]>([]);
  const [userOpen, setUserOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<InvoiceRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [invoiceCount, setInvoiceCount] = useState<number | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);
  const [mainCategories, setMainCategories] = useState<CategoryOpt[]>([]);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [catSlug, setCatSlug] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  const [lines, setLines] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [markDone, setMarkDone] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<number | null>(null);

  const lastPrices = useMemo(() => {
    const map: Record<string, { unitPrice: number; quantity: number; date: string; discount?: number }> = {};
    if (!history) return map;
    for (const inv of history) {
      for (const it of inv.items ?? []) {
        if (it.productId && !(it.productId in map)) {
          map[it.productId] = {
            unitPrice: it.unitPrice ?? it.price ?? 0,
            quantity: it.quantity,
            date: inv.createdAt,
            discount: it.discountPercent,
          };
        }
      }
    }
    return map;
  }, [history]);

  useEffect(() => {
    if (!userSearch.trim()) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch.trim())}&limit=8`);
        const data = await res.json();
        setUserResults(data.users || []);
      } catch {
        setUserResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/brands").then((r) => r.json()),
    ])
      .then(([cats, brs]) => {
        setMainCategories(Array.isArray(cats) ? cats.map((c: CategoryOpt) => ({ id: c.id, name: c.name, slug: c.slug })) : []);
        setBrands(Array.isArray(brs) ? brs.map((b: BrandOpt) => ({ id: b.id, name: b.name })) : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/invoices/count")
      .then((r) => r.json())
      .then((d: { count?: number }) => setInvoiceCount(d.count ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (!editId) return;
    fetch(`/api/admin/invoices/${editId}`)
      .then((r) => r.json())
      .then(async (inv) => {
        if (!inv || inv.id !== editId) return;
        const record: InvoiceRecord = {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          items: inv.items,
          totalPrice: inv.totalPrice,
          createdAt: inv.createdAt,
          user: inv.user,
        };
        await loadInvoiceIntoBuilder(record);
        setEditingId(inv.id);
        setEditingNumber(inv.invoiceNumber ?? null);
        setNotes(inv.notes || "");
        setMarkDone(inv.status === "DONE");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productSearch.trim() && !catSlug && !selectedBrand) return;
    const t = setTimeout(async () => {
      setSearchingProduct(true);
      const params = new URLSearchParams({ limit: "8" });
      if (productSearch.trim()) params.set("search", productSearch.trim());
      if (catSlug) params.set("category", catSlug);
      if (selectedBrand) params.set("brandId", selectedBrand);
      try {
        const res = await fetch(`/api/admin/products?${params.toString()}`);
        const data = await res.json();
        setProductResults(data.products || []);
      } catch {
        setProductResults([]);
      }
      setSearchingProduct(false);
    }, 350);
    return () => clearTimeout(t);
  }, [productSearch, catSlug, selectedBrand, productOpen]);

  const loadHistory = async (uid: string | null, phone: string) => {
    setHistoryLoading(true);
    setHistory(null);
    setExpandedHistory(null);
    const q = uid ? `userId=${uid}` : `phone=${encodeURIComponent(phone.trim())}`;
    try {
      const res = await fetch(`/api/admin/invoices/history?${q}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const selectUser = (u: CrmUser) => {
    setUserId(u.id);
    setCustomerName(u.name || "");
    setCustomerPhone(u.phone || "");
    setUserSearch("");
    setUserResults([]);
    setUserOpen(false);
    setHistory(null);
  };

  const addProduct = (p: Product) => {
    const meter = isRailOrScrew({ name: p.name, isMeter: p.isMeter ?? null, subcategory: p.category?.slug ?? null });
    const base = getProductMaxLength({ name: p.name, isMeter: p.isMeter ?? null, subcategory: p.category?.slug ?? null });
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) {
      setLines((prev) =>
        prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l)),
      );
      setProductSearch("");
      setProductOpen(false);
      return;
    }
    const last = lastPrices[p.id];
    const defaultPrice = last ? String(last.unitPrice) : String(p.discountPrice || p.price || "");
    setLines((prev) => [
      ...prev,
      {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        isMeter: meter,
        baseLength: base,
        sitePrice: p.discountPrice || p.price || 0,
        unitPrice: defaultPrice,
        quantity: 1,
        branchLength: String(base),
        discount: last && last.discount ? String(last.discount) : "",
      },
    ]);
    setProductSearch("");
    setProductOpen(false);
  };

  const updateLine = (index: number, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const setCatFilter = (slug: string) => {
    setCatSlug(slug);
    setSelectedBrand("");
    setProductSearch("");
    setProductOpen(true);
    loadBrandsFor(slug);
  };

  const setBrandFilter = (id: string) => {
    setSelectedBrand(id);
    setProductSearch("");
    setProductOpen(true);
  };

  const loadBrandsFor = async (slug: string) => {
    const q = slug ? `?category=${encodeURIComponent(slug)}` : "";
    try {
      const res = await fetch(`/api/admin/brands${q}`);
      const data = await res.json();
      setBrands(Array.isArray(data) ? data.map((b: BrandOpt) => ({ id: b.id, name: b.name })) : []);
    } catch {
      setBrands([]);
    }
  };

  const meterLen = (l: LineItem) => {
    const base = l.baseLength || 400;
    return Math.min(Math.max(parseInt(l.branchLength) || 10, 10), base);
  };

  const lineTotal = (l: LineItem) => {
    const unit = Number(l.unitPrice) || 0;
    const base = l.isMeter ? unit * l.quantity * (meterLen(l) / 100) : unit * l.quantity;
    const discount = Math.min(Math.max(Number(l.discount) || 0, 0), 100);
    return Math.round(base * (100 - discount) / 100);
  };

  const totalPrice = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const loadInvoiceIntoBuilder = async (inv: InvoiceRecord) => {
    const enriched = await Promise.all(
      (inv.items || []).map(async (it) => {
        let sitePrice = 0;
        let baseLen = it.baseLength || 0;
        try {
          const res = await fetch(`/api/admin/products/${it.productId}`);
          const p: Product = await res.json();
          sitePrice = p.discountPrice || p.price || 0;
          if (!baseLen) {
            baseLen = getProductMaxLength({ name: p.name, isMeter: p.isMeter ?? null, subcategory: p.category?.slug ?? null });
          }
        } catch {
          // ignore
        }
        const isMeter = it.isMeter === true || it.branchLength != null;
        return {
          productId: it.productId,
          name: it.name,
          slug: it.slug,
          isMeter,
          baseLength: baseLen || 400,
          sitePrice,
          unitPrice: String(it.unitPrice ?? it.price ?? ""),
          quantity: isMeter ? it.branchCount || 1 : it.quantity || 1,
          branchLength: isMeter ? String(it.branchLength != null ? it.branchLength : baseLen || 400) : "",
          discount: it.discountPercent ? String(it.discountPercent) : "",
        };
      }),
    );
    setLines(enriched);
    setCustomerName(inv.customerName);
    setCustomerPhone(inv.customerPhone);
    setUserId(inv.user?.id || null);
    setExpandedHistory(null);
  };

  const save = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("نام و شماره تلفن مشتری را وارد کنید");
      return;
    }
    if (lines.length === 0) {
      alert("حداقل یک کالا انتخاب کنید");
      return;
    }
    setSaving(true);
    const body = {
      customerName,
      customerPhone,
      userId,
      notes: notes.trim() || null,
      status: markDone ? "DONE" : "PENDING",
      items: lines.map((l) => {
        const discount = Math.min(Math.max(Number(l.discount) || 0, 0), 100);
        if (l.isMeter) {
          const base = l.baseLength || 400;
          const bl = Math.min(Math.max(parseInt(l.branchLength) || 10, 10), base);
          return {
            productId: l.productId,
            unitPrice: Number(l.unitPrice) || 0,
            branchCount: l.quantity,
            branchLength: bl,
            baseLength: base,
            discountPercent: discount || undefined,
          };
        }
        return {
          productId: l.productId,
          unitPrice: Number(l.unitPrice) || 0,
          quantity: l.quantity,
          discountPercent: discount || undefined,
        };
      }),
    };
    try {
      const isEditing = editingId !== null;
      const res = await fetch(isEditing ? `/api/admin/invoices/${editingId}` : "/api/admin/invoices", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "خطا در ثبت فاکتور");
        setSaving(false);
        return;
      }
      setLines([]);
      setNotes("");
      if (isEditing) {
        setEditingId(null);
        setEditingNumber(null);
        window.history.replaceState(null, "", "/admin/invoices");
        alert("فاکتور اصلاح شد");
      } else {
        setInvoiceCount((c) => (c ?? 0) + 1);
        alert("فاکتور ثبت شد");
      }
    } catch {
      alert("خطا در ثبت فاکتور");
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNumber(null);
    setLines([]);
    setNotes("");
    setMarkDone(false);
    window.history.replaceState(null, "", "/admin/invoices");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{editingId ? "اصلاح فاکتور" : "ثبت فاکتور"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {editingId ? "در حال ویرایش فاکتور موجود؛ با ذخیره، اصلاحات اعمال می‌شود." : "صدور فاکتور با قیمت سفارشی مخصوص مشتری؛ بدون تغییر قیمت‌های سایت"}
          </p>
        </div>
        {editingNumber !== null && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2 rounded-lg">
            در حال اصلاح شماره فاکتور: {faNum(editingNumber)}
          </div>
        )}
        {invoiceCount !== null && editingId === null && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg">
            تعداد فاکتورهای صادرشده تاکنون: {faNum(invoiceCount)}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <div>
          <h3 className="font-bold mb-3">مشتری</h3>
          <div className="relative">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <Search size={18} className="text-gray-400" />
              <input
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserOpen(true);
                  if (!e.target.value.trim()) setUserResults([]);
                }}
                onFocus={() => setUserOpen(true)}
                placeholder="جستجوی کاربران ثبت‌نام‌شده (نام / تلفن)"
                className="flex-1 outline-none bg-transparent"
              />
            </div>
            {userOpen && userResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium">{u.name || "بدون نام"}</span>
                    <span className="text-xs text-gray-500" dir="ltr">{u.phone || ""}</span>
                    {u.email && <span className="text-xs text-gray-400" dir="ltr">{u.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام مشتری *</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="نام مشتری"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">شماره تلفن *</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={() => {
                  if (customerPhone.trim() && !userId && history !== null) setHistory(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="مثلاً 09121234567"
                dir="ltr"
              />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => {
                if (history !== null) {
                  setHistory(null);
                  setExpandedHistory(null);
                  return;
                }
                loadHistory(userId, customerPhone);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <Receipt size={14} />
              {history !== null ? "بستن سابقه مشتری" : "نمایش سابقه مشتری"}
            </button>
            {historyLoading && <span>در حال بارگذاری سابقه...</span>}
          </div>

          {history !== null && history.length === 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
              سابقه‌ای برای این مشتری یافت نشد؛ قیمت پیش‌فرض از قیمت سایت خواهد بود.
            </div>
          )}

          {history !== null && history.length > 0 && (
            <div className="mt-3 space-y-2">
              {history.map((inv) => (
                <div key={inv.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedHistory(expandedHistory === inv.id ? null : inv.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown size={16} className={"text-gray-400 transition-transform " + (expandedHistory === inv.id ? "rotate-180" : "")} />
                      <span className="text-xs text-gray-500">{inv.invoiceNumber ? "شماره " + faNum(inv.invoiceNumber) : ""}</span>
                      <span className="text-sm font-bold">{faNum(inv.totalPrice)} تومان</span>
                      <span className="text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString("fa-IR")}</span>
                      <span className="text-xs text-gray-400">{inv.items.length} کالا</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/invoices/${inv.id}/print`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                        title="چاپ / PDF"
                      >
                        <Printer size={14} className="inline-block ml-1" />
                        PDF
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadInvoiceIntoBuilder(inv);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        استفاده از این فاکتور
                      </button>
                    </div>
                  </div>
                  {expandedHistory === inv.id && (
                    <div className="border-t border-gray-100 p-3">
                      <table className="w-full text-sm text-right">
                        <tbody className="divide-y divide-gray-50">
                          {(inv.items || []).map((it, i) => {
                            const p = it.unitPrice ?? it.price ?? 0;
                            const isMeter = it.isMeter === true || it.branchLength != null;
                            const base = isMeter
                              ? p * (it.branchCount || 1) * ((it.branchLength ?? 0) / 100)
                              : p * it.quantity;
                            const discount = Math.min(Math.max(Number(it.discountPercent) || 0, 0), 100);
                            const itemTotal = Math.round(base * (100 - discount) / 100);
                            return (
                              <tr key={i}>
                                <td className="py-1.5">
                                  {it.name}
                                  {isMeter && <span className="mr-1 text-[10px] text-amber-600">متری</span>}
                                </td>
                                <td className="py-1.5 text-xs text-gray-500">
                                  {isMeter
                                    ? `${faNum(it.branchLength ?? 0)} سانتی‌متر × ${faNum(it.branchCount || 1)} شاخه`
                                    : `${faNum(it.quantity)} عدد`}
                                </td>
                                <td className="py-1.5 text-xs">{faNum(p)} تومان / {isMeter ? "متر" : "واحد"}</td>
                                <td className="py-1.5 text-xs font-bold">
                                  {discount > 0 && <span className="text-red-500 ml-1">{faNum(discount)}٪ تخفیف</span>}
                                </td>
                                <td className="py-1.5 font-bold">{faNum(itemTotal)} تومان</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h3 className="font-bold mb-3">کالاها</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">دسته اصلی</label>
              <select
                value={catSlug}
                onChange={(e) => setCatFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">همه دسته‌ها</option>
                {mainCategories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">برند</label>
              <select
                value={selectedBrand}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">همه برندها</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <Search size={18} className="text-gray-400" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onFocus={() => setProductOpen(true)}
                placeholder="جستجوی کالا..."
                className="flex-1 outline-none bg-transparent"
              />
              {searchingProduct && <span className="text-xs text-gray-400">...</span>}
            </div>
            {productOpen && productResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productResults.map((p) => {
                  const last = lastPrices[p.id];
                  const meter = isRailOrScrew({ name: p.name, isMeter: p.isMeter ?? null, subcategory: p.category?.slug ?? null });
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-sm">{p.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {meter ? <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">متری</span> : `${faNum(p.price)} تومان`}
                        {last && <span className="mr-2 text-blue-600">آخرین قیمت: {faNum(last.unitPrice)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="px-3 py-2">کالا</th>
                    <th className="px-3 py-2">تعداد شاخه / تعداد</th>
                    <th className="px-3 py-2">متراژ هر شاخه (سانتی‌متر)</th>
                    <th className="px-3 py-2">قیمت واحد (تومان)</th>
                    <th className="px-3 py-2">تخفیف ٪</th>
                    <th className="px-3 py-2">جمع</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((l, i) => {
                    const last = lastPrices[l.productId];
                    const sameAsSite = l.sitePrice === Number(l.unitPrice);
                    return (
                      <tr key={l.productId}>
                        <td className="px-3 py-2">
                          <div className="font-medium">
                            {l.name}
                            {l.isMeter && (
                              <span className="mr-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white align-middle">متری</span>
                            )}
                          </div>
                          {l.isMeter && (
                            <div className="text-[11px] text-amber-600 mt-0.5">
                              حداکثر طول هر شاخه: {faNum(l.baseLength || 400)} سانتی‌متر
                            </div>
                          )}
                          {last && (
                            <div className="text-[11px] text-blue-600 mt-0.5">
                              قیمت سری قبل: {faNum(last.unitPrice)} تومان
                              {l.unitPrice !== String(last.unitPrice) && " (بیشتر/کمتر از قبل)"}
                            </div>
                          )}
                          {!sameAsSite && (
                            <div className="text-[11px] text-amber-600 mt-0.5">
                              قیمت سفارشی — قیمت سایت: {faNum(l.sitePrice)} تومان
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) => updateLine(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-center"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {l.isMeter ? (
                            <input
                              type="number"
                              min={10}
                              max={l.baseLength || 400}
                              step={10}
                              value={l.branchLength}
                              onChange={(e) => updateLine(i, { branchLength: e.target.value.replace(/[^\d]/g, "") })}
                              onBlur={() => {
                                const base = l.baseLength || 400;
                                const v = Math.min(Math.max(parseInt(l.branchLength) || 10, 10), base);
                                updateLine(i, { branchLength: String(v) });
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-center"
                              dir="ltr"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={l.unitPrice}
                            onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                            className="w-32 px-2 py-1 border border-gray-300 rounded-lg text-center"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={l.discount}
                            onChange={(e) => updateLine(i, { discount: e.target.value.replace(/[^\d]/g, "") })}
                            onBlur={() => {
                              const v = Math.min(Math.max(parseInt(l.discount) || 0, 0), 100);
                              updateLine(i, { discount: String(v) });
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center"
                          />
                        </td>
                        <td className="px-3 py-2 font-bold whitespace-nowrap">
                          {faNum(lineTotal(l))} تومان
                          {l.isMeter && (
                            <div className="text-[10px] text-gray-400 font-normal">
                              {faNum(l.quantity)} شاخه × {faNum(meterLen(l))} سانتی‌متر × هر متر {faNum(Number(l.unitPrice) || 0)} تومان
                            </div>
                          )}
                          {(Number(l.discount) || 0) > 0 && (
                            <div className="text-[10px] text-red-500 font-normal">
                              {faNum(Number(l.discount) || 0)}٪ تخفیف
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeLine(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات (اختیاری)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="توضیحی برای این فاکتور"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={markDone}
              onChange={(e) => setMarkDone(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            ثبت به عنوان فاکتور تکمیل‌شده (اگر تیک به‌صورت «در انتظار بررسی» ثبت می‌شود)
          </label>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">مبلغ کل:</div>
            <div className="text-xl font-bold text-blue-600">{faNum(totalPrice)} تومان</div>
          </div>

          <div className="flex justify-end gap-3">
            {editingId && (
              <button
                onClick={cancelEdit}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                لغو ویرایش
              </button>
            )}
            <button
              onClick={() => {
                setLines([]);
                setNotes("");
              }}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              پاک کردن
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={18} />
              {saving ? "در حال ذخیره..." : editingId ? "ذخیره اصلاحات" : "ثبت فاکتور"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}