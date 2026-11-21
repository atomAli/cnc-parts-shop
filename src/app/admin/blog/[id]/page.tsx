import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import BlogPostForm from "@/components/admin/BlogPostForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ویرایش مقاله</h1>
      <div className="bg-white rounded-xl border p-6">
        <BlogPostForm post={post} />
      </div>
    </div>
  );
}
