"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  createdAt: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const res = await fetch("/api/admin/blog");
    setPosts(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("آیا مطمئن هستید که این مقاله حذف شود؟")) return;
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    fetchPosts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مدیریت وبلاگ</h1>
        <Link
          href="/admin/blog/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          مقاله جدید
        </Link>
      </div>

      {loading ? (
        <p className="text-stone-500">در حال بارگذاری…</p>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-stone-500">
          هنوز مقالهای نوشته نشده است.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-stone-600">
              <tr>
                <th className="text-right px-4 py-3 font-medium">عنوان</th>
                <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                <th className="text-right px-4 py-3 font-medium">تاریخ</th>
                <th className="text-left px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{post.title}</div>
                    <div className="text-xs text-stone-400" dir="ltr">/blog/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        post.published
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700"
                          : "rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-stone-600"
                      }
                    >
                      {post.published ? "منتشرشده" : "پیشنویس"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Intl.DateTimeFormat("fa-IR").format(new Date(post.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {post.published && (
                        <Link
                          href={`/blog/${encodeURI(post.slug)}`}
                          target="_blank"
                          className="text-xs text-blue-700 hover:underline"
                        >
                          مشاهده
                        </Link>
                      )}
                      <Link
                        href={`/admin/blog/${post.id}`}
                        title="ویرایش"
                        className="p-1.5 rounded-lg text-stone-500 hover:bg-gray-100 hover:text-blue-700"
                      >
                        <Edit2 size={16} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        title="حذف"
                        className="p-1.5 rounded-lg text-stone-500 hover:bg-gray-100 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
