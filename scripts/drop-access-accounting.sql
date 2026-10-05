-- بازگردانی کامل ماژول حسابداری واردشده از SHIK Access.
--
-- این اسکریپت تمام جدول‌های حسابداری را حذف می‌کند. به هیچ جدول موجودی
-- (products، users، pre_invoices و ...) دست نمی‌زند، چون کلیدهای خارجی فقط
-- از جدول‌های حسابداری به سمت جدول‌های قدیمی هستند و نه برعکس.
--
-- اگر فقط می‌خواهید داده‌های واردشده پاک شود ولی جدول‌ها بمانند، به‌جای DROP
-- از این استفاده کنید:
--   TRUNCATE sales_invoice_lines, purchase_invoice_lines, ledger_entries,
--            cash_movements, stock_movements, product_prices,
--            sales_invoices, purchase_invoices, cheques, parties,
--            price_levels, warehouses, cash_boxes, bank_accounts;
--
-- هشدار: اجرای این اسکریپت برگشت‌پذیر نیست. قبل از اجرا بکاپ بگیرید:
--   pg_dump "$DATABASE_URL" -Fc -f /tmp/site-backup/pre-accounting-drop.dump

BEGIN;

DROP TABLE IF EXISTS "product_prices";
DROP TABLE IF EXISTS "stock_movements";
DROP TABLE IF EXISTS "sales_invoice_lines";
DROP TABLE IF EXISTS "purchase_invoice_lines";
DROP TABLE IF EXISTS "ledger_entries";
DROP TABLE IF EXISTS "cash_movements";
DROP TABLE IF EXISTS "cheques";
DROP TABLE IF EXISTS "sales_invoices";
DROP TABLE IF EXISTS "purchase_invoices";
DROP TABLE IF EXISTS "parties";
DROP TABLE IF EXISTS "price_levels";
DROP TABLE IF EXISTS "warehouses";
DROP TABLE IF EXISTS "cash_boxes";
DROP TABLE IF EXISTS "bank_accounts";

COMMIT;