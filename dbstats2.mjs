import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
config({ path: ".env" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });
try {
  console.log('products:', await p.product.count());
} catch (e) { console.log('products err:', e.code || e.message); }
try {
  console.log('categories:', await p.category.count());
} catch (e) { console.log('categories err:', e.code || e.message); }
await p.$disconnect();
