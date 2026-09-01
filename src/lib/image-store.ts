import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";

export interface StoredImage {
  url: string;
}

/**
 * Stores an image byte array.
 * - When `BLOB_READ_WRITE_TOKEN` is set (Vercel Blob), uploads to the bucket
 *   and returns the absolute public URL.
 * - Otherwise falls back to writing into `public/uploads` (local dev) and
 *   returns a `/uploads/...` URL.
 */
export async function storeImage(
  buffer: Buffer,
  ext: string,
  contentType: string
): Promise<StoredImage> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    const { put } = await import("@vercel/blob");
    const filename = `${uuid()}.${ext}`;
    const { url } = await put(filename, buffer, {
      access: "public",
      contentType,
      token: blobToken,
    });
    return { url };
  }

  const filename = `${uuid()}.${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);
  return { url: `/uploads/${filename}` };
}