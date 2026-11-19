export const SITE_URL = process.env.SITE_URL || "https://shik.app";

/**
 * عنوان سئوی لیستها و صفحات محصول. چون title.template در layout ریشه "%s | شیک"
 * است، از { absolute } استفاده میشود تا postfix دوباره اضافه نشود.
 */
export function catalogTitle(name: string): string {
  return `${name} | لیست قیمت و خرید اینترنتی shik.app`;
}