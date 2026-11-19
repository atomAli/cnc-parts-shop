import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "ارتباط با کارشناسان فروشگاه شیک برای مشاوره، استعلام قیمت و سفارش قطعات CNC و اتوماسیون صنعتی.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
