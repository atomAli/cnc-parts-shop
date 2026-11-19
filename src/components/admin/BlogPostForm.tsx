"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { slugifyBlogTitle } from "@/lib/blog-slug";

export type BlogPostInput = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image: string | null;
  published: boolean;
};

type Props = { post?: BlogPostInput };

export default function BlogPostForm({ post }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [image, setImage] = useState(post?.image || "");
  const [content, setContent] = useState(post?.content || "");
  const [published, setPublished] = useState(post?.published ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugifyBlogTitle(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = post ? `/api/admin/blog/${post.id}` : "/api/admin/blog";
    const res = await fetch(url, {
      method: post ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, excerpt, content, image, published }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "خطا در ذخیرهٔ مقاله");
      setSaving(false);
      return;
    }

    router.push("/admin/blog");
    router.refresh();
  };

  const field =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">عنوان *</label>
          <input
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={field}
            placeholder="مثلاً: راهنمای انتخاب اسپیندل مناسب"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">اسلاگ (آدرس)</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugifyBlogTitle(e.target.value));
            }}
            className={field}
            dir="ltr"
            placeholder="khodkaran-espin-del"
          />
          <p className="text-xs text-stone-500 mt-1" dir="ltr">/blog/{slug || "..."}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">خلاصه (برای فهرست و سئو)</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className={field}
          placeholder="توضیح کوتاهی دربارهٔ مقاله…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">تصویر شاخص (آدرس)</label>
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className={field}
          dir="ltr"
          placeholder="/blog-images/... یا https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">متن مقاله</label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4"
        />
        منتشر شود (در وبلاگ نمایش داده شود)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-60"
        >
          {saving ? "در حال ذخیره…" : "ذخیره"}
        </button>
        <Link href="/admin/blog" className="px-4 py-2 text-sm text-stone-600 hover:text-blue-700">
          انصراف
        </Link>
      </div>
    </form>
  );
}
