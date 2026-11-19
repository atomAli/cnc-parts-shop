export const SITE_URL = process.env.SITE_URL || "https://shik.app";

/**
 * عنوان بالای صفحات لیست (H1) در دستهها، برندها و /products.
 * متادیتای <title> این صفحات جداگانه ساخته میشود، پس قالب در اینجا فقط متن H1 است.
 */
export function catalogTitle(name: string): string {
  return `لیست قیمت و خرید ${name} | فروشگاه اینترنتی شیک shik.app`;
}