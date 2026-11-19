import BlogPostForm from "@/components/admin/BlogPostForm";

export const metadata = { title: "مقالهٔ جدید" };

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مقالهٔ جدید</h1>
      <div className="bg-white rounded-xl border p-6">
        <BlogPostForm />
      </div>
    </div>
  );
}
