import "dotenv/config";
import Database from "better-sqlite3";
import prisma from "../src/lib/prisma";

const SRC_DB = process.env.SRC_DB || "dev.db";

interface Row {
  [key: string]: unknown;
}

function d(v: unknown): Date {
  if (!v) return new Date();
  const t = new Date(v as string);
  return Number.isNaN(t.getTime()) ? new Date() : t;
}
const b = (v: unknown): boolean => v === 1 || v === true;
const s = (v: unknown): string | undefined =>
  v === null || v === undefined || v === "" ? undefined : String(v);
const n = (v: unknown): number | undefined =>
  v === null || v === undefined || v === "" ? undefined : Number(v);

async function main() {
  const sqlite = new Database(SRC_DB, { readonly: true });

  const count = <T>(t: string): number =>
    (sqlite.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c;

  console.log("clearing existing data in PostgreSQL...");
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.user.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.settings.deleteMany(),
  ]);

  const all = <T>(t: string): T[] => sqlite.prepare(`SELECT * FROM ${t}`).all() as T[];

  // --- users ---
  const users = all<Row>("users").map((r) => ({
    id: s(r.id) as string,
    name: s(r.name),
    phone: s(r.phone),
    email: s(r.email),
    password: String(r.password),
    role: (r.role as string) as "USER" | "ADMIN",
    image: s(r.image),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.user.createMany({ data: users });
  console.log("users:", users.length);

  // --- categories ---
  const categories = all<Row>("categories").map((r) => ({
    id: s(r.id) as string,
    name: String(r.name),
    slug: String(r.slug),
    description: s(r.description),
    image: s(r.image),
    parentId: n(r.parentId) ? s(r.parentId) : null,
    order: Number(r.order ?? 0),
    active: b(r.active),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.category.createMany({ data: categories });
  console.log("categories:", categories.length);

  // --- brands ---
  const brands = all<Row>("brands").map((r) => ({
    id: s(r.id) as string,
    name: String(r.name),
    slug: String(r.slug),
    logo: s(r.logo),
    website: s(r.website),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.brand.createMany({ data: brands });
  console.log("brands:", brands.length);

  // --- products ---
  const products = all<Row>("products").map((r) => ({
    id: s(r.id) as string,
    name: String(r.name),
    slug: String(r.slug),
    description: s(r.description),
    price: Number(r.price),
    discountPrice: n(r.discountPrice),
    stock: Number(r.stock ?? 0),
    sku: s(r.sku),
    featured: b(r.featured),
    active: b(r.active),
    categoryId: s(r.categoryId) as string,
    brandId: s(r.brandId) ?? null,
    specifications: s(r.specifications),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  for (let i = 0; i < products.length; i += 500) {
    await prisma.product.createMany({ data: products.slice(i, i + 500) });
  }
  console.log("products:", products.length);

  // --- product_images ---
  const images = all<Row>("product_images").map((r) => ({
    id: s(r.id) as string,
    url: String(r.url),
    alt: s(r.alt),
    isPrimary: b(r.isPrimary),
    productId: s(r.productId) as string,
    order: Number(r.order ?? 0),
  }));
  for (let i = 0; i < images.length; i += 500) {
    await prisma.productImage.createMany({ data: images.slice(i, i + 500) });
  }
  console.log("product_images:", images.length);

  // --- orders / order_items / cart_items ---
  const orders = all<Row>("orders").map((r) => ({
    id: s(r.id) as string,
    userId: s(r.userId) as string,
    status: (r.status as string) as
      | "PENDING"
      | "CONFIRMED"
      | "SHIPPED"
      | "DELIVERED"
      | "CANCELLED",
    totalPrice: Number(r.totalPrice),
    shippingAddress: s(r.shippingAddress),
    phone: String(r.phone),
    notes: s(r.notes),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.order.createMany({ data: orders });
  console.log("orders:", orders.length);

  const orderItems = all<Row>("order_items").map((r) => ({
    id: s(r.id) as string,
    orderId: s(r.orderId) as string,
    productId: s(r.productId) as string,
    quantity: Number(r.quantity),
    price: Number(r.price),
  }));
  await prisma.orderItem.createMany({ data: orderItems });
  console.log("order_items:", orderItems.length);

  const cartItems = all<Row>("cart_items").map((r) => ({
    id: s(r.id) as string,
    userId: s(r.userId) as string,
    productId: s(r.productId) as string,
    quantity: Number(r.quantity ?? 1),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.cartItem.createMany({ data: cartItems });
  console.log("cart_items:", cartItems.length);

  // --- banners / settings ---
  const banners = all<Row>("banners").map((r) => ({
    id: s(r.id) as string,
    title: String(r.title),
    subtitle: s(r.subtitle),
    image: String(r.image),
    link: s(r.link),
    active: b(r.active),
    order: Number(r.order ?? 0),
    createdAt: d(r.createdAt),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.banner.createMany({ data: banners });
  console.log("banners:", banners.length);

  const settings = all<Row>("settings").map((r) => ({
    id: s(r.id) as string,
    key: String(r.key),
    value: String(r.value),
    updatedAt: d(r.updatedAt),
  }));
  await prisma.settings.createMany({ data: settings });
  console.log("settings:", settings.length);

  sqlite.close();
  console.log("MIGRATION DONE.");
}

main()
  .catch((e) => {
    console.error("MIGRATION FAILED:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());