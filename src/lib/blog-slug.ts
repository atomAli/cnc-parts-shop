/** اسلاگ فارسیپسند برای مقالات وبلاگ. */
export function slugifyBlogTitle(value: string): string {
  return value
    .trim()
    .replace(/[\u200c\u200d]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
