import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/cart",
          "/profile/",
          "/auth/",
          "/api/",
          "/*?*q=", // جستجو
          // ?brand= و ?page= بسته نمی‌شوند: فیلتر برند و صفحه‌بندی در صفحات
          // فرود دسته/برند استفاده می‌شوند و با noindex/canonical مدیریت می‌شوند.
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-images.xml`],
  };
}
