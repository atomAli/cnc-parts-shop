import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic"],
});

const siteUrl = process.env.NEXTAUTH_URL || "https://cnc-market-shop.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "مارکت CNC | فروشگاه تخصصی قطعات CNC و اتوماسیون صنعتی",
    template: "%s | مارکت CNC",
  },
  description:
    "فروش تخصصی قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون صنعتی از برندهای معتبر جهانی",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "مارکت CNC",
    title: "مارکت CNC | فروشگاه تخصصی قطعات CNC و اتوماسیون صنعتی",
    description:
      "فروش تخصصی قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون صنعتی",
    images: [{ url: `${siteUrl}/logo.png`, width: 763, height: 327, alt: "مارکت CNC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "مارکت CNC | فروشگاه تخصصی قطعات CNC و اتوماسیون صنعتی",
    description:
      "فروش تخصصی قطعات سی ان سی، موتور سروو، پی ال سی، اچ ام آی و تجهیزات اتوماسیون صنعتی",
    images: [`${siteUrl}/logo.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "etY_5ydFPEGbEBqTBdzBf1pV2vuz0yx2TKQ8MV9lK8Y",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "مارکت CNC",
  alternateName: "CNC Market",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+982133724136",
    contactType: "customer service",
    areaServed: "IR",
    availableLanguage: "fa",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی",
    addressLocality: "تهران",
    addressCountry: "IR",
  },
};

// The JSON-LD markup is duplicated inline below so it survives SSR
const organizationLd = JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationLd }}
        />
      </head>
      <body className="min-h-full flex flex-col font-[var(--font-vazir)] bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}