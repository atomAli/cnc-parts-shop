import urllib.request, urllib.parse, ssl, re, json, time, sqlite3, os
from concurrent.futures import ThreadPoolExecutor, as_completed

ssl._create_default_https_context = ssl._create_unverified_context
DB = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/dev.db'
SCRAPED_FILES = [
    '/Users/aliarjmandi/Desktop/Projects/scraped_mechanical.json',
    '/Users/aliarjmandi/Desktop/Projects/scraped_electrical.json',
]
PROGRESS_FILE = '/Users/aliarjmandi/Desktop/Projects/spec_progress2.json'

def norm(s):
    return re.sub(r'[^\w\u0600-\u06FF\s]', '', s).strip().lower()

# Load scraped with names -> slugs (list, handling duplicates)
from collections import defaultdict
scraped = []
for f in SCRAPED_FILES:
    scraped.extend(json.load(open(f)))
by_name = defaultdict(list)
for p in scraped:
    by_name[norm(p['name'])].append(p['slug'])

conn = sqlite3.connect(DB, check_same_thread=False)
cur = conn.cursor()

progress = set()
if os.path.exists(PROGRESS_FILE):
    progress = set(json.load(open(PROGRESS_FILE)))

# Only process products with NO/FEW specs
cur.execute("SELECT id, name, specifications FROM products")
all_products = cur.fetchall()

def needs_spec(spec):
    if not spec:
        return True
    try:
        d = json.loads(spec)
        # Requires specs (present already in data.ts) only if very minimal? We'll refresh all that have real site data.
        return len(d) <= 2  # refresh if spec has 2 or fewer fields (like brand+model only)
    except:
        return True

targets = []
for db_id, name, spec in all_products:
    if db_id in progress:
        continue
    if not needs_spec(spec):
        continue
    slugs = by_name.get(norm(name))
    if not slugs:
        continue
    # pick first slug that is non-empty
    slug = next((s for s in slugs if s), '')
    if slug:
        targets.append((db_id, slug))

print(f"Targets to fetch: {len(targets)}", flush=True)

def fetch_specs(slug):
    encoded = urllib.parse.quote(slug)
    url = f'https://shop.cncmarket.ir/products/{encoded}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
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
            return True, len(specs)
        return False, 0
    except Exception:
        return False, -1

updated = failed = empty = 0
with ThreadPoolExecutor(max_workers=12) as ex:
    futs = {ex.submit(process_one, pid, slug): pid for pid, slug in targets}
    done = 0
    for fut in as_completed(futs):
        pid = futs[fut]
        ok, extra = fut.result()
        done += 1
        if ok:
            updated += 1
        elif extra == 0:
            empty += 1
        else:
            failed += 1
        progress.add(pid)
        if done % 20 == 0:
            conn.commit()
            json.dump(list(progress), open(PROGRESS_FILE, 'w'))
            print(f"  {done}/{len(targets)} updated:{updated} empty:{empty} failed:{failed}", flush=True)

conn.commit()
json.dump(list(progress), open(PROGRESS_FILE, 'w'))
print(f"DONE updated:{updated} empty:{empty} failed:{failed}", flush=True)
