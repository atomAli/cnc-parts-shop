import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
      email: "admin@cncparts.ir",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.name);

  // Create brands
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { slug: "delta" },
      update: {},
      create: {
        name: "Delta (دلتا)",
        slug: "delta",
        website: "www.delta.com.tw",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "hiwin" },
      update: {},
      create: {
        name: "Hiwin (هایوین)",
        slug: "hiwin",
        website: "www.hiwin.com",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "siemens" },
      update: {},
      create: {
        name: "Siemens (زیمنس)",
        slug: "siemens",
        website: "www.siemens.com",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "mitsubishi" },
      update: {},
      create: {
        name: "Mitsubishi (میتسوبیشی)",
        slug: "mitsubishi",
        website: "www.mitsubishielectric.com",
      },
    }),
    prisma.brand.upsert({
      where: { slug: "schneider" },
      update: {},
      create: {
        name: "Schneider (اشنایدر)",
        slug: "schneider",
        website: "www.se.com",
      },
    }),
  ]);
  console.log("✅ Brands created:", brands.length);

  // Create categories
  const electrical = await prisma.category.upsert({
    where: { slug: "electrical" },
    update: {},
    create: {
      name: "قطعات برقی",
      slug: "electrical",
      description: "انواع قطعات برقی و اتوماسیون صنعتی",
      order: 1,
    },
  });

  const mechanical = await prisma.category.upsert({
    where: { slug: "mechanical" },
    update: {},
    create: {
      name: "قطعات مکانیکی",
      slug: "mechanical",
      description: "انواع قطعات مکانیکی و حرکتی",
      order: 2,
    },
  });

  // Create subcategories for electrical
  const electricalSubs = await Promise.all([
    prisma.category.upsert({
      where: { slug: "plc" },
      update: {},
      create: {
        name: "PLC",
        slug: "plc",
        parentId: electrical.id,
        order: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "hmi" },
      update: {},
      create: {
        name: "HMI",
        slug: "hmi",
        parentId: electrical.id,
        order: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "servo-motor" },
      update: {},
      create: {
        name: "موتور سروو",
        slug: "servo-motor",
        parentId: electrical.id,
        order: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "step-motor" },
      update: {},
      create: {
        name: "استپ موتور",
        slug: "step-motor",
        parentId: electrical.id,
        order: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: "inverter" },
      update: {},
      create: {
        name: "اینورتر",
        slug: "inverter",
        parentId: electrical.id,
        order: 5,
      },
    }),
    prisma.category.upsert({
      where: { slug: "controller" },
      update: {},
      create: {
        name: "کنترلر",
        slug: "controller",
        parentId: electrical.id,
        order: 6,
      },
    }),
    prisma.category.upsert({
      where: { slug: "spindle-motor" },
      update: {},
      create: {
        name: "موتور اسپیندل",
        slug: "spindle-motor",
        parentId: electrical.id,
        order: 7,
      },
    }),
    prisma.category.upsert({
      where: { slug: "vacuum-pump" },
      update: {},
      create: {
        name: "پمپ وکیوم",
        slug: "vacuum-pump",
        parentId: electrical.id,
        order: 8,
      },
    }),
  ]);

  // Create subcategories for mechanical
  const mechanicalSubs = await Promise.all([
    prisma.category.upsert({
      where: { slug: "lm-guide" },
      update: {},
      create: {
        name: "ریل و واگن",
        slug: "lm-guide",
        parentId: mechanical.id,
        order: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "ballscrew" },
      update: {},
      create: {
        name: "بالسکرو",
        slug: "ballscrew",
        parentId: mechanical.id,
        order: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "gearbox" },
      update: {},
      create: {
        name: "گیربکس",
        slug: "gearbox",
        parentId: mechanical.id,
        order: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "coupling" },
      update: {},
      create: {
        name: "کوپلینگ",
        slug: "coupling",
        parentId: mechanical.id,
        order: 4,
      },
    }),
  ]);
  console.log("✅ Categories created");

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "plc-delta-dvp-sx2" },
      update: {},
      create: {
        name: "PLC دلتا DVP-SX2",
        slug: "plc-delta-dvp-sx2",
        description: "PLC دلتا مدل DVP-SX2 با حافظه 16K steps، ۱۲ ورودی و ۸ خروجی",
        price: 15000000,
        discountPrice: 13500000,
        stock: 10,
        sku: "DELTA-DVP-SX2",
        categoryId: electricalSubs[0].id,
        brandId: brands[0].id,
        featured: true,
        specifications: {
          "برند": "Delta (دلتا)",
          "مدل": "DVP-SX2",
          "حافظه": "16K steps",
          "ورودی دیجیتال": "۱۲ عدد",
          "خروجی": "۸ عدد",
          "ولتاژ تغذیه": "24V DC",
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: "hmi-delta-dop-107bv" },
      update: {},
      create: {
        name: "HMI دلتا DOP-107BV",
        slug: "hmi-delta-dop-107bv",
        description: "HMI دلتا مدل DOP-107BV با صفحه نمایش ۷ اینچ لمسی",
        price: 8500000,
        stock: 5,
        sku: "DELTA-DOP-107BV",
        categoryId: electricalSubs[1].id,
        brandId: brands[0].id,
        featured: true,
        specifications: {
          "برند": "Delta (دلتا)",
          "مدل": "DOP-107BV",
          "اندازه صفحه نمایش": "۷ اینچ",
          "نوع صفحه نمایش": "لمسی مقاومتی",
          "رزولوشن": "800×480",
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: "servo-motor-delta-1kw" },
      update: {},
      create: {
        name: "موتور سروو دلتا 1KW",
        slug: "servo-motor-delta-1kw",
        description: "موتور سروو دلتا با توان ۱ کیلووات و سرور درایو",
        price: 25000000,
        stock: 8,
        sku: "DELTA-SERVO-1KW",
        categoryId: electricalSubs[2].id,
        brandId: brands[0].id,
        featured: true,
        specifications: {
          "برند": "Delta (دلتا)",
          "توان": "1KW",
          "ولتاژ": "220V",
          "گشتاور": "3.18 N.m",
          "سرعت": "3000 RPM",
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: "inverter-delta-vfd-m" },
      update: {},
      create: {
        name: "اینورتر دلتا VFD-M",
        slug: "inverter-delta-vfd-m",
        description: "اینورتر دلتا مدل VFD-M مناسب موتورهای ۷۵۰ وات",
        price: 12000000,
        stock: 15,
        sku: "DELTA-VFD-M-750W",
        categoryId: electricalSubs[4].id,
        brandId: brands[0].id,
        featured: false,
        specifications: {
          "برند": "Delta (دلتا)",
          "مدل": "VFD-M",
          "توان": "750W",
          "ولتاژ ورودی": "تک فاز 220V",
          "فرکانس خروجی": "0-400 Hz",
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: "lm-guide-20mm" },
      update: {},
      create: {
        name: "ریل و واگن ۲۰ میلیمتر",
        slug: "lm-guide-20mm",
        description: "ریل خطی هایوین با واگن ۲۰ میلیمتر مناسب ماشین‌آلات CNC",
        price: 3500000,
        stock: 20,
        sku: "HIWIN-LM20",
        categoryId: mechanicalSubs[0].id,
        brandId: brands[1].id,
        featured: false,
        specifications: {
          "برند": "Hiwin (هایوین)",
          "اندازه": "20mm",
          "نوع": "四方",
          "طول": "1000mm",
          "بار مجاز": "15.4 N",
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: "ballscrew-1605" },
      update: {},
      create: {
        name: "بالسکرو ۱۶۰۵",
        slug: "ballscrew-1605",
        description: "بالسکرو هایوین مدل 1605 با گام ۵ میلیمتر",
        price: 2800000,
        stock: 12,
        sku: "HIWIN-BS1605",
        categoryId: mechanicalSubs[1].id,
        brandId: brands[1].id,
        featured: false,
        specifications: {
          "برند": "Hiwin (هایوین)",
          "قطر": "16mm",
          "گام": "5mm",
          "دقت": "C7",
          "طول": "1000mm",
        },
      },
    }),
  ]);
  console.log("✅ Products created:", products.length);

  // Create banners
  const banners = await Promise.all([
    prisma.banner.create({
      data: {
        title: "فروش ویژه موتورهای سروو",
        subtitle: "تا ۲۰٪ تخفیف",
        image: "/images/banners/servo-sale.jpg",
        link: "/products?category=servo-motor",
        order: 1,
      },
    }),
    prisma.banner.create({
      data: {
        title: "جدیدترین PLC های دلتا",
        subtitle: "موجود در انبار",
        image: "/images/banners/plc-new.jpg",
        link: "/products?category=plc",
        order: 2,
      },
    }),
    prisma.banner.create({
      data: {
        title: "مشاوره رایگان اتوماسیون",
        subtitle: "تماس بگیرید",
        image: "/images/banners/consultation.jpg",
        link: "/contact",
        order: 3,
      },
    }),
  ]);
  console.log("✅ Banners created:", banners.length);

  // Create settings
  const settings = await Promise.all([
    prisma.settings.upsert({
      where: { key: "site_name" },
      update: {},
      create: { key: "site_name", value: "فروشگاه قطعات CNC" },
    }),
    prisma.settings.upsert({
      where: { key: "site_phone" },
      update: {},
      create: { key: "site_phone", value: "021-33532602" },
    }),
    prisma.settings.upsert({
      where: { key: "site_email" },
      update: {},
      create: { key: "site_email", value: "info@cncparts.ir" },
    }),
    prisma.settings.upsert({
      where: { key: "site_address" },
      update: {},
      create: {
        key: "site_address",
        value: "تهران، خیابان سعدی جنوبی، کوچه ناظم الاطباء شمالی، پلاک ۱۶۷",
      },
    }),
  ]);
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
