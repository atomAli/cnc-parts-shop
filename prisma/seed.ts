import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { products, subcategories, categories, brands } from "../src/lib/data";

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { phone: "09120000000" },
    update: {},
    create: {
      name: "مدیر سیستم",
      phone: "09120000000",
      email: "admin@cncmarket.ir",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.name);

  // Create parent categories
  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        order: parseInt(cat.id),
      },
    });
    categoryMap[cat.id] = created.id;
  }
  console.log("✅ Parent categories created:", categories.length);

  // Create subcategories
  const subcategoryMap: Record<string, string> = {};
  for (const sub of subcategories) {
    const parentId = categoryMap[sub.categoryId] || categoryMap["1"];
    const created = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {},
      create: {
        name: sub.name,
        slug: sub.slug,
        parentId: parentId,
        order: parseInt(sub.id),
      },
    });
    subcategoryMap[sub.slug] = created.id;
  }
  console.log("✅ Subcategories created:", subcategories.length);

  // Create brands
  const brandMap: Record<string, string> = {};
  for (const brand of brands) {
    const slug = brand.name.toLowerCase().replace(/\s+/g, "-");
    const created = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: {
        name: brand.name,
        slug,
      },
    });
    brandMap[brand.name] = created.id;
  }
  console.log("✅ Brands created:", brands.length);

  // Create products in batches
  let createdCount = 0;
  let skippedCount = 0;
  const batchSize = 50;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    for (const product of batch) {
      try {
        // Find or create brand
        let brandId = brandMap[product.brand];
        if (!brandId) {
          const slug = product.brand.toLowerCase().replace(/\s+/g, "-");
          const existing = await prisma.brand.findUnique({ where: { slug } });
          if (existing) {
            brandId = existing.id;
          } else {
            const created = await prisma.brand.create({
              data: { name: product.brand, slug },
            });
            brandId = created.id;
          }
          brandMap[product.brand] = brandId;
        }

        // Find category
        const categoryId = subcategoryMap[product.subcategory] || categoryMap["1"];

        // Skip if product already exists
        const existing = await prisma.product.findUnique({
          where: { slug: product.slug },
        });
        if (existing) {
          skippedCount++;
          continue;
        }

        // Create product
        await prisma.product.create({
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price || 0,
            stock: 0,
            categoryId,
            brandId,
            specifications: JSON.stringify(product.specs),
            active: true,
          },
        });
        createdCount++;
      } catch (e) {
        skippedCount++;
      }
    }

    if ((i / batchSize) % 10 === 0) {
      console.log(`   Progress: ${Math.min(i + batchSize, products.length)}/${products.length} products`);
    }
  }
  console.log(`✅ Products created: ${createdCount}, skipped: ${skippedCount}`);

  // Create banners
  const existingBanners = await prisma.banner.count();
  if (existingBanners === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: "فروش ویژه موتورهای سروو",
          subtitle: "تا ۲۰٪ تخفیف",
          image: "/images/banners/servo-sale.jpg",
          link: "/products?category=servo-motor",
          order: 1,
        },
        {
          title: "جدیدترین PLC های دلتا",
          subtitle: "موجود در انبار",
          image: "/images/banners/plc-new.jpg",
          link: "/products?category=plc",
          order: 2,
        },
        {
          title: "مشاوره رایگان اتوماسیون",
          subtitle: "تماس بگیرید",
          image: "/images/banners/consultation.jpg",
          link: "/contact",
          order: 3,
        },
      ],
    });
    console.log("✅ Banners created");
  }

  // Create settings
  const settingsData = [
    { key: "site_name", value: "فروشگاه قطعات CNC" },
    { key: "site_phone", value: "021-33532602" },
    { key: "site_email", value: "info@cncmarket.ir" },
    { key: "site_address", value: "تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی، پلاک ۱۶۷" },
  ];
  for (const setting of settingsData) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("✅ Settings created");

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

