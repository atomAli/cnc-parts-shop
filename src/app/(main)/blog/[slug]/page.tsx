import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import SpindleGuide from "@/components/blog/SpindleGuide";

type Props = { params: Promise<{ slug: string }> };

/**
 *article اسپیندل بصورت کامپوننت تعاملی اختصاصی رندر میشود تا ابزارهای
 * انتخابگر، مقایسه و محاسبهگر بدون کتابخانهٔ اضافی و با تم سایت کار کنند.
 * متن ذخیرهشده در دیتابیس برای این اسلاگ فقط بعنوان fallback نگه داشته میشود.
 */
const INTERACTIVE_SPINDLE_SLUG =
  "راهنمای-خرید-اسپیندل-آب-خنک-در-ایران-از-توان-و-دور-تا-مدار-خنکاری";

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const post = await getPost(slug);
  if (!post) return {};

  const path = `/blog/${encodeURI(post.slug)}`;
  const description = post.excerpt || post.title;
  const title = post.title;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      type: "article",
      images: post.image ? [{ url: post.image }] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const post = await getPost(slug);
  if (!post) notFound();

  const path = `/blog/${encodeURI(post.slug)}`;
  const articleLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.image || undefined,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: `${SITE_URL}${path}`,
    author: { "@type": "Organization", name: "شیک" },
    publisher: { "@type": "Organization", name: "شیک" },
  }).replace(/</g, "\\u003c");

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleLd }} />

      <nav className="text-xs text-stone-500 mb-6" aria-label="مسیر">
        <Link href="/" className="hover:text-blue-600">خانه</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-blue-600">وبلاگ</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900 font-medium">{post.title}</span>
      </nav>

      <article className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black text-stone-900 mb-3">{post.title}</h1>
        <time className="block text-sm text-stone-400 mb-6" dateTime={post.createdAt.toISOString()}>
          {new Intl.DateTimeFormat("fa-IR").format(post.createdAt)}
        </time>

        {post.image && (
          <img
            src={post.image}
            alt={post.title}
            className="w-full max-h-96 object-cover rounded-xl bg-gray-100 mb-8"
          />
        )}

        {post.excerpt && (
          <p className="text-base text-stone-600 leading-relaxed mb-8 border-r-4 border-blue-700 pr-4">
            {post.excerpt}
          </p>
        )}

        {post.slug === INTERACTIVE_SPINDLE_SLUG ? (
          <SpindleGuide />
        ) : (
          <div
            className="blog-content text-sm leading-8 text-stone-800"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        )}

        <div className="mt-10 pt-6 border-t border-gray-200">
          <Link href="/blog" className="btn-ghost inline-flex">
            بازگشت به وبلاگ
          </Link>
        </div>
      </article>
    </div>
  );
}
