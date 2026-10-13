import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { CardProduct } from "@/lib/catalog";

function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان";
}

export default function ProductCard({ product }: { product: CardProduct }) {
  return (
    <div className="card overflow-hidden transition-colors duration-150 hover:shadow-[var(--shadow-card)]">
      <Link
        href={`/products/${product.slug}`}
        className="block bg-gray-50 relative h-48 overflow-hidden"
      >
        {product.image?.url ? (
          <img
            src={product.image.url}
            alt={product.image.alt || product.name}
            width={400}
            height={400}
            loading="lazy"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            width={200}
            height={200}
            loading="lazy"
            className="opacity-60 max-h-full max-w-full object-contain p-4 mx-auto"
          />
        )}
        {product.isMeter && (
          <span className="absolute top-3 left-3 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow">
            متری
          </span>
        )}
      </Link>
      <div className="p-5 flex flex-col">
        {product.brandName && (
          <div className="text-xs text-stone-500 font-medium mb-1">{product.brandName}</div>
        )}
        <Link
          href={`/products/${product.slug}`}
          className="font-bold text-stone-800 hover:text-blue-600 transition-colors line-clamp-2"
        >
          {product.name}
        </Link>
        <div className="mt-2">
          {product.price ? (
            <span className="text-lg font-bold text-blue-700">{formatPrice(product.price)}</span>
          ) : (
            <span className="text-sm text-stone-500 font-medium">تماس بگیرید</span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Link href={`/products/${product.slug}`} className="btn-primary w-full justify-center">
            <ShoppingCart size={16} />
            مشاهده و خرید
          </Link>
        </div>
      </div>
    </div>
  );
}
