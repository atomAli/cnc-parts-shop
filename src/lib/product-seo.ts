/**
 * محصولاتی که هم توضیح ندارند و هم عکس، صفحهٔ نازکی دارند: نه کاربر چیزی
 * برای خواندن دارد و نه گوگل. اینها از sitemap حذف میشوند و noindex میگیرند
 * تا بودجهٔ خزیدن به صفحات دسته و محصولات کامل اختصاص پیدا کند.
 */
export function isThinProduct(product: {
  description?: string | null;
  images?: ReadonlyArray<{ url?: string | null }>;
}): boolean {
  const hasDescription = Boolean((product.description || "").trim());
  const hasImage = Boolean(product.images?.some((image) => Boolean(image.url?.trim())));
  return !hasDescription && !hasImage;
}
