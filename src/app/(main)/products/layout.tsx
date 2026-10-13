import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "همه محصولات — قطعات CNC و اتوماسیون صنعتی",
  description:
    "لیست کامل قطعات سی ان سی، سروو موتور، پی ال سی، اچ ام آی، ریل و واگن، بال اسکرو و تجهیزات اتوماسیون صنعتی؛ جستجو و فیلتر بر اساس دسته و برند در فروشگاه شیک.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
