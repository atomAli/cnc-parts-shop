import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "وبلاگ",
  description:
    "مقالات و راهنماهای تخصصی فروشگاه شیک دربارهٔ قطعات CNC، اتوماسیون صنعتی و نحوهٔ انتخاب تجهیزات مناسب.",
  alternates: { canonical: "/blog" },
  robots: { index: true, follow: true },
};

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      image: true,
      createdAt: true,
    },
  });

  return (
    <div className="container-page py-8">
      <nav className="text-xs text-stone-500 mb-5" aria-label="مسیر">
        <Link href="/" className="hover:text-blue-600">خانه</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900 font-medium">وبلاگ</span>
      </nav>

      <h1 className="text-2xl font-black text-stone-900 mb-2">وبلاگ</h1>
      <p className="text-stone-600 mb-8 max-w-3xl leading-relaxed">
        مقالات و راهنماهای تخصصی دربارهٔ قطعات CNC و اتوماسیون صنعتی.
      </p>

      {posts.length === 0 ? (
        <div className="card p-10 text-center text-stone-500">
          بهزودی مقالاتی در این بخش منتشر میشود.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article key={post.slug} className="card overflow-hidden">
              <Link href={`/blog/${encodeURI(post.slug)}`} className="block">
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-44 w-full object-cover bg-gray-100"
                  />
                ) : (
                  <div className="h-24 bg-gray-50" aria-hidden="true" />
                )}
              </Link>
              <div className="p-5">
                <time className="text-xs text-stone-400" dateTime={post.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat("fa-IR").format(post.createdAt)}
                </time>
                <h2 className="text-lg font-bold text-stone-900 mt-1 mb-2">
                  <Link href={`/blog/${encodeURI(post.slug)}`} className="hover:text-blue-600">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">{post.excerpt}</p>
                )}
                <Link
                  href={`/blog/${encodeURI(post.slug)}`}
                  className="mt-4 inline-block text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                  ادامهٔ مطلب
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
