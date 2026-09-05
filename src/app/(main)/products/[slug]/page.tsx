"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ShoppingCart, Shield, ArrowRight, Plus, Minus, Phone, ExternalLink, Pencil, Lock } from "lucide-react";
import { useCartStore } from "@/store/cart";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  sourceUrl?: string;
  subcategory?: string;
  specs?: Record<string, string>;
  category: { slug: string; name: string };
  brand: { slug: string; name: string };
  images: { url: string; alt: string; isPrimary: boolean }[];
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const addItem = useCartStore((s) => s.addItem);
  const { data: session, status } = useSession();
  const isAdmin = !!session && (session.user as any)?.role === "ADMIN";
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [branchCount, setBranchCount] = useState(1);
  const [branchLength, setBranchLength] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        const imgs = data?.images?.filter((i: { url?: string }) => i.url) || [];
        const primary = imgs.findIndex((i: { isPrimary: boolean }) => i.isPrimary);
        setActiveImage(primary >= 0 ? primary : 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fa-IR").format(price) + " تومان";

  const isMeterProduct = product?.subcategory === "linear-guide" || product?.subcategory === "ball-screw";
  const isMiniature = product?.name?.includes("مینیاتوری") || product?.name?.includes("Miniature");
  const baseLength = isMiniature ? 100 : 400;

  const handleAddToCart = () => {
    if (!product) return;
    if (isMeterProduct) {
      for (let i = 0; i < quantity; i++) {
        addItem({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price || 0,
          image: product.images?.[0]?.url,
          isMeter: true,
          branchCount,
          branchLength,
          baseLength,
        });
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        addItem({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price || 0,
          image: product.images?.[0]?.url,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 text-lg">محصول یافت نشد</p>
          <Link href="/products" className="text-blue-600 hover:underline mt-4 inline-block">
            بازگشت به محصولات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      {/* Admin actions */}
      {isAdmin && product.id && (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-gray-900 rounded-xl text-sm">
          <span className="text-gray-400 flex items-center gap-1.5">
            <Lock size={14} />
            پنل ادمین:
          </span>
          <Link
            href={`/admin/products/${product.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Pencil size={14} />
            ویرایش محصول
          </Link>
          {(product.sourceUrl || "").trim() ? (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              <ExternalLink size={14} />
              مشاهده در سایت cncparts
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed" title="این محصول در سایت cncparts.ir پیوند ندارد">
              <ExternalLink size={14} />
              بدون لینک cncparts
            </span>
          )}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="text-sm text-stone-500 mb-6">
        <Link href="/" className="hover:text-blue-600">خانه</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-blue-600">محصولات</Link>
        <span className="mx-2">/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-blue-600">{product.category.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900 font-medium">{product.name}</span>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
          {/* Image */}
          <div className="group">
            <div className="bg-gradient-to-b from-gray-50 to-blue-50/60 rounded-2xl h-96 flex items-center justify-center overflow-hidden">
              {product.images?.[activeImage]?.url ? (
                <Image
                  src={product.images[activeImage].url}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="object-contain max-h-full max-w-full transition-transform duration-300 ease-out group-hover:scale-110"
                  unoptimized
                />
              ) : (
                <span className="text-gray-400">تصویر محصول</span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {product.images.map((img, index) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      index === activeImage ? "border-blue-600" : "border-transparent"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="text-sm text-stone-500 font-medium mb-2">{product.brand.name}</div>
            <h1 className="text-2xl md:text-3xl font-black mb-4 text-stone-900">{product.name}</h1>

            <div className="rounded-2xl bg-gradient-to-l from-blue-50 to-amber-50/60 border border-blue-100/60 p-5 mb-6">
              {product.price ? (
                <span className="text-3xl font-black text-blue-600">
                  {formatPrice(product.price)}
                </span>
              ) : (
                <div>
                  <span className="text-lg text-stone-500">قیمت: </span>
                  <span className="text-lg font-black text-blue-600">تماس بگیرید</span>
                </div>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {isMeterProduct ? (
              <div className="mb-6 space-y-4">
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                  <div className="text-sm font-bold text-amber-800 mb-3">محصول متری — تعداد شاخه و متراژ شاخه را وارد کنید</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">تعداد شاخه</label>
                      <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                        <button onClick={() => setBranchCount(Math.max(1, branchCount - 1))} className="p-2.5 hover:bg-gray-100 rounded-r-xl transition-colors"><Minus size={16} /></button>
                        <span className="px-4 py-2.5 font-bold min-w-[40px] text-center">{branchCount}</span>
                        <button onClick={() => setBranchCount(branchCount + 1)} className="p-2.5 hover:bg-gray-100 rounded-l-xl transition-colors"><Plus size={16} /></button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">متراژ هر شاخه (سانتی‌متر)</label>
                      <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                        <button onClick={() => setBranchLength(Math.max(10, branchLength - 10))} className="p-2.5 hover:bg-gray-100 rounded-r-xl transition-colors"><Minus size={16} /></button>
                        <span className="px-4 py-2.5 font-bold min-w-[50px] text-center">{branchLength}</span>
                        <button onClick={() => setBranchLength(Math.min(baseLength, branchLength + 10))} className="p-2.5 hover:bg-gray-100 rounded-l-xl transition-colors"><Plus size={16} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">حداکثر طول هر شاخه: {baseLength} سانتی‌متر {isMiniature && "(مینیاتوری)"}</div>
                  {product.price && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">قیمت کل:</span>
                        <span className="font-bold text-blue-600">{formatPrice(product.price * branchCount * (branchLength / baseLength))}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {branchCount} شاخه × {branchLength} سانتی‌متر × {formatPrice(product.price)} /{baseLength} سانتی‌متر
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-full border border-gray-200 bg-gray-50">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 rounded-r-full hover:bg-gray-100 transition-colors"><Minus size={18} /></button>
                    <span className="px-6 py-3 font-bold min-w-[60px] text-center">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="p-3 rounded-l-full hover:bg-gray-100 transition-colors"><Plus size={18} /></button>
                  </div>
                  <button onClick={handleAddToCart} className="btn-primary flex-1">
                    <ShoppingCart size={20} />
                    افزودن به سبد خرید
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center rounded-full border border-gray-200 bg-gray-50">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 rounded-r-full hover:bg-gray-100 transition-colors"><Minus size={18} /></button>
                  <span className="px-6 py-3 font-bold min-w-[60px] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-3 rounded-l-full hover:bg-gray-100 transition-colors"><Plus size={18} /></button>
                </div>
                <button onClick={handleAddToCart} className="btn-primary flex-1">
                  <ShoppingCart size={20} />
                  افزودن به سبد خرید
                </button>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield size={18} className="text-blue-600" />
                ضمانت اصالت
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={18} className="text-green-600" />
                مشاوره رایگان
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100 p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Description */}
            <div>
              <h2 className="text-xl font-bold mb-4">توضیحات محصول</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {/* Specifications */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">مشخصات فنی</h2>
                <table className="w-full">
                  <tbody>
                    {Object.entries(product.specs).map(([key, value]) => (
                      <tr key={key} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-gray-600 w-1/3">{key}</td>
                        <td className="py-3 font-medium">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="mt-8 relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-600 via-blue-700 to-blue-800 px-6 py-8 md:p-10 text-center text-white">
        <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h3 className="text-xl font-black mb-2">سوالی دارید؟ با ما تماس بگیرید</h3>
          <p className="text-blue-100 mb-5">شیک خرید کنید؛ مشاوران ما آماده پاسخگویی به سوالات فنی شما هستند</p>
          <a
            href="tel:+982133724136"
            className="btn-white"
          >
            تماس تلفنی
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}
