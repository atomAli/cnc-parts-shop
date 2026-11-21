export type CategoryPathInput = {
  slug: string;
  parent?: { slug: string } | null;
};

/**
 * مسیر یکتای دسته.
 * زیردسته‌ها همیشه زیر مسیر دستهٔ اصلی می‌آیند: /category/<parent>/<sub>
 */
export function categoryPath(category: CategoryPathInput): string {
  const own = encodeURI(category.slug);
  return category.parent?.slug
    ? `/category/${encodeURI(category.parent.slug)}/${own}`
    : `/category/${own}`;
}
