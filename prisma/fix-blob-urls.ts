import "dotenv/config";
import prisma from "../src/lib/prisma";

(async () => {
  const storeId = (process.env.BLOB_STORE_ID || "").replace("store_", "").toLowerCase();
  const base = `https://${storeId}.public.blob.vercel-storage.com`;

  const before = await prisma.productImage.count({ where: { url: { startsWith: "/uploads/" } } });
  const result = await prisma.$executeRawUnsafe(
    `UPDATE product_images SET url = '${base}/' || substr(url, 10) WHERE url LIKE '/uploads/%'`
  );
  const after = await prisma.productImage.count({ where: { url: { startsWith: "/uploads/" } } });
  const https = await prisma.productImage.count({ where: { url: { startsWith: "https://" } } });

  console.log("base=" + base);
  console.log("before_uploads=" + before);
  console.log("updated_rows=" + result);
  console.log("after_uploads=" + after);
  console.log("total_https=" + https);

  const sample = await prisma.productImage.findFirst({
    where: { url: { startsWith: "https://" } },
    select: { url: true },
  });
  console.log("sample=" + (sample?.url ?? "(none)"));
})().catch((e) => {
  console.error("ERR " + e.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());