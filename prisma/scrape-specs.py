import urllib.request, urllib.parse, ssl, re, json, time, sqlite3, os, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ssl._create_default_https_context = ssl._create_unverified_context
DB = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/dev.db'
SCRAPED_FILES = [
    '/Users/aliarjmandi/Desktop/Projects/scraped_mechanical.json',
    '/Users/aliarjmandi/Desktop/Projects/scraped_electrical.json',
]
PROGRESS_FILE = '/Users/aliarjmandi/Desktop/Projects/spec_progress.json'

# Load all scraped products
scraped = []
for f in SCRAPED_FILES:
    with open(f) as fh:
        scraped.extend(json.load(fh))
print(f"Total scraped: {len(scraped)}", flush=True)

# Build name -> scraped product map (normalize name)
def norm(s):
    return re.sub(r'\s+', ' ', s).strip().lower()

scraped_by_name = {}
for p in scraped:
    n = norm(p['name'])
    if n and (n not in scraped_by_name or p['slug']):
        scraped_by_name[n] = p

conn = sqlite3.connect(DB, check_same_thread=False)
cur = conn.cursor()

# Load progress
progress = set()
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE) as fh:
        progress = set(json.load(fh))

# Get all products that need specs OR all products (to refresh specs with full data)
cur.execute("SELECT id, name FROM products")
all_products = cur.fetchall()
print(f"Total products in DB: {len(all_products)}", flush=True)

# Determine targets: products matching scraped data
targets = []  # (db_id, site_slug)
for db_id, name in all_products:
    if db_id in progress:
        continue
    n = norm(name)
    sp = scraped_by_name.get(n)
    if sp and sp['slug']:
        targets.append((db_id, sp['slug']))

print(f"Targets to fetch: {len(targets)}", flush=True)

def fetch_specs(slug):
    encoded = urllib.parse.quote(slug)
    url = f'https://shop.cncmarket.ir/products/{encoded}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=25) as r:
        html = r.read().decode('utf-8', errors='replace')
    specs = {}
    rows = re.findall(
        r'<tr[^>]*>\s*<td[^>]*class="key"[^>]*>.*?<label[^>]*>([^<]+)</label>.*?</td>\s*<td[^>]*>.*?'
        r'<span[^>]*class="hikashop_product_custom_value"[^>]*>\s*([^<]*?)\s*</span>',
        html, re.DOTALL)
    for key, value in rows:
        key = key.strip()
        value = value.strip()
        if key and value:
            specs[key] = value
    return specs

def process_one(db_id, slug):
    try:
        specs = fetch_specs(slug)
        if specs:
            cur.execute("UPDATE products SET specifications = ? WHERE id = ?",
                       (json.dumps(specs, ensure_ascii=False), db_id))
            return (db_id, True, len(specs))
        return (db_id, False, 0)
    except Exception as e:
        return (db_id, False, str(e))

# Process with concurrency
updated = 0
failed = 0
empty = 0
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(process_one, pid, slug): (pid, slug) for pid, slug in targets}
    done = 0
    for future in as_completed(futures):
        done += 1
        pid, ok, extra = future.result()
        if ok:
            updated += 1
        elif extra == 0:
            empty += 1
        else:
            failed += 1
        progress.add(pid)
        if done % 25 == 0:
            conn.commit()
            with open(PROGRESS_FILE, 'w') as fh:
                json.dump(list(progress), fh)
            print(f"  Progress: {done}/{len(targets)} (updated:{updated} empty:{empty} failed:{failed})",
                  flush=True)

conn.commit()
with open(PROGRESS_FILE, 'w') as fh:
    json.dump(list(progress), fh)
print(f"\nDONE. Updated: {updated}, Empty: {empty}, Failed: {failed}", flush=True)
