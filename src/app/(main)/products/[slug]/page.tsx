import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { localImages } from "@/lib/local-images";
import { categoryPath } from "@/lib/category-url";
import { SITE_URL } from "@/lib/site";
import ProductView from "./ProductView";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 86400;
export const dynamic = "force-static";

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, active: true },
    include: {
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          parent: { select: { slug: true } },
        },
      },
      brand: { select: { slug: true, name: true } },
      images: {
        where: { url: { not: "" } },
        orderBy: { order: "asc" },
      },
    },
  });
}

/** محصولات همان دسته (بدون محصول فعلی) — برای لینک داخلی و کاهش نرخ خروج. */
async function getRelatedProducts(categoryId: string, excludeId: string) {
  const rows = await prisma.product.findMany({
    where: { active: true, categoryId, id: { not: excludeId } },
    take: 6,
    orderBy: { name: "asc" },
    include: {
      brand: { select: { name: true } },
      images: { where: { url: { not: "" } }, orderBy: { order: "asc" }, take: 1 },
    },
  });

  return rows.map((p) => {
    const local = localImages(p.slug, true);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      image: local?.[0]?.url || p.images[0]?.url || "",
      brandName: p.brand?.name || "",
    };
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const related = product.categoryId
    ? await getRelatedProducts(product.categoryId, product.id)
    : [];

  let specs: Record<string, string> = {};
  if (product.specifications) {
    try {
      specs = JSON.parse(product.specifications);
    } catch {}
  }

  const images = product.images.map((img) => ({
    url: img.url,
    alt: img.alt || "",
    isPrimary: img.isPrimary,
  }));

  const ldImages = product.images.map((i) => i.url).filter(Boolean);
  if (!ldImages.length) ldImages.push(`${SITE_URL}/logo.png`);

  // قیمتهای دیتابیس به تومان هستند؛ Schema باید ریال باشد.
  const priceRial = product.price > 0 ? Math.round(product.price * 10) : null;
  const offers = priceRial
    ? {
        "@type": "Offer",
        url: `${SITE_URL}/products/${slug}`,
        priceCurrency: "IRR",
        price: String(priceRial),
        // stock در دیتابیس نگهداری نمیشود (تقریباً همه 0اند)، بنابراین InStock میماند.
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: "شیک" },
      }
    : undefined;

  const productLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: ldImages,
    sku: product.sku || (product.legacyGoodId ? String(product.legacyGoodId) : product.slug),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    category: product.category?.name,
    offers,
  }).replace(/</g, "\\u003c");

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "محصولات", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: product.category?.name, item: product.category ? `${SITE_URL}${categoryPath(product.category)}` : `${SITE_URL}/products` },
      { "@type": "ListItem", position: 4, name: product.name, item: `${SITE_URL}/products/${slug}` },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <ProductView
        slug={slug}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          price: product.price,
          sourceUrl: product.sourceUrl || undefined,
          isMeter: product.isMeter,
          specs,
          category: {
            slug: product.category?.slug || "",
            name: product.category?.name || "",
            parentSlug: product.category?.parent?.slug,
          },
          brand: {
            slug: product.brand?.slug || "",
            name: product.brand?.name || "",
          },
          images,
        }}
      />

      {related.length > 0 && (
        <section className="container-page pb-16">
          <h2 className="section-title mb-6">محصولات مرتبط</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/products/${encodeURI(item.slug)}`}
                className="card overflow-hidden"
              >
                <div className="h-40 bg-gray-50 grid place-items-center overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain p-3"
                    />
                  ) : (
                    <img
                      src="/logo.png"
                      alt=""
                      aria-hidden="true"
                      className="opacity-50 h-full mx-auto p-6"
                    />
                  )}
                </div>
                <div className="p-4">
                  {item.brandName && (
                    <div className="text-xs text-stone-500 mb-1">{item.brandName}</div>
                  )}
                  <div className="font-bold text-stone-800 line-clamp-2 min-h-[3rem]">
                    {item.name}
                  </div>
                  <div className="mt-2">
                    {item.price > 0 ? (
                      <span className="text-base font-bold text-blue-700">
                        {new Intl.NumberFormat("fa-IR").format(item.price)} تومان
                      </span>
                    ) : (
                      <span className="text-sm text-stone-500">تماس بگیرید</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}