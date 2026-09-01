import urllib.request, urllib.parse, ssl, re, json, time, sqlite3, os
from concurrent.futures import ThreadPoolExecutor, as_completed

ssl._create_default_https_context = ssl._create_unverified_context
DB = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/dev.db'
PROGRESS_FILE = '/Users/aliarjmandi/Desktop/Projects/spec_progress3.json'
URL_MAP_FILE = '/Users/aliarjmandi/Desktop/Projects/product_url_map.json'

# All category slugs (source slugs) to scrape
CATEGORY_SLUGS = [
    # mechanical
    'rail-wagon','LinearBallbearing','ball-screw-nut-support','ball-bearing','bearings',
    'aluminium-profiles','cable-carrier','cable-carrier-topline','shaft',
    'planetary-spiral-gearbox','liming-gearbox','snail-gearbox','snail-gearbox-liming',
    'belt-gearbox','sbl-gearbox','gear-rack-pinion','coupling','gearbox-accessories',
    # electrical
    'slip-ring-rotary-connector','radonix-controller','controller-data-cable','mach3-controller',
    'hqm-controller','hqm-step-motor-step-drive','leadshine-steppermotor','hqm-spindle-motor',
    'hqd-spindle-motor','hertz-spindle-motor','اسپیندل-موتور-hsd','اسپیندل-cc','spindle-deci',
    'servo-spindle','servo-motor','اینورتر-دلتا-آلفا-فوتک-invt','powerdc','linkan-electrical-jack',
    'laser','plc-delta','hmi-delta','oil-vacuum-pump','lubricating',
]

def norm(s):
    return re.sub(r'[^\w\u0600-\u06FF\s]', '', s).strip().lower()

def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')

# ---- STEP 1: Build name -> product url map by scraping each category ----
print("=== STEP 1: Building product URL map ===", flush=True)
url_map = {}
if os.path.exists(URL_MAP_FILE):
    url_map = json.load(open(URL_MAP_FILE))
    print(f"  Loaded existing URL map: {len(url_map)}", flush=True)

def scrape_category(slug):
    # only if we need to (re)build
    url = f'https://shop.cncmarket.ir/categories/category/{urllib.parse.quote(slug)}?limit=500'
    try:
        html = fetch(url)
    except Exception as e:
        print(f"  ERR fetch {slug}: {e}", flush=True)
        return 0
    # Each product: name link and image link both have /categories/{...}/category_pathway-{id}
    # Build pairs of (title, href) from <a> tags
    found = 0
    # image links have the title attr and the real URL
    for href, title in re.findall(r'<a[^>]*href="(/categories/[^"]+category_pathway-\d+)"[^>]*title="([^"]*)"[^>]*>', html):
        name = title.strip()
        if not name:
            continue
        n = norm(name)
        url_map[n] = href
        found += 1
    # fallback: name links
    for href, name in re.findall(r'<a[^>]*href="(/categories/[^"]+category_pathway-\d+)"[^>]*>\s*([^<]+?)\s*</a>', html, re.DOTALL):
        name = name.strip()
        if not name:
            continue
        n = norm(name)
        url_map[n] = href
        found += 1
    print(f"  {slug}: {found} urls captured", flush=True)
    return found

# Rebuild entire map fresh to ensure completeness
url_map = {}
for idx, slug in enumerate(CATEGORY_SLUGS):
    try:
        scrape_category(slug)
    except Exception as e:
        print(f"  ERR {slug}: {e}", flush=True)
    time.sleep(0.3)
    if (idx+1) % 5 == 0:
        json.dump(url_map, open(URL_MAP_FILE,'w'), ensure_ascii=False)
        print(f"  progress {idx+1}/{len(CATEGORY_SLUGS)}, map size {len(url_map)}", flush=True)

json.dump(url_map, open(URL_MAP_FILE,'w'), ensure_ascii=False)
print(f"URL map size: {len(url_map)}", flush=True)

# ---- STEP 2: Match DB products and fetch specs ----
print("=== STEP 2: Fetching specs ===", flush=True)
conn = sqlite3.connect(DB, check_same_thread=False)
cur = conn.cursor()
cur.execute('SELECT id, name, specifications FROM products')
all_products = cur.fetchall()

progress = set()
if os.path.exists(PROGRESS_FILE):
    progress = set(json.load(open(PROGRESS_FILE)))

# Targets: products matching a URL that still need specs
def needs_spec(spec):
    if not spec:
        return True
    try:
        return len(json.loads(spec)) <= 2
    except:
        return True

targets = []
for pid, name, spec in all_products:
    if pid in progress:
        continue
    if not needs_spec(spec):
        continue
    url = url_map.get(norm(name))
    if url:
        targets.append((pid, url))

print(f"Targets to fetch: {len(targets)}", flush=True)

def fetch_specs(url):
    full = 'https://shop.cncmarket.ir' + urllib.parse.quote(url, safe='/')
    html = fetch(full, timeout=20)
    specs = {}
    for k, v in re.findall(
        r'<tr[^>]*>\s*<td[^>]*class="key"[^>]*>.*?<label[^>]*>([^<]+)</label>.*?</td>\s*<td[^>]*>.*?'
        r'<span[^>]*class="hikashop_product_custom_value"[^>]*>\s*([^<]*?)\s*</span>',
        html, re.DOTALL):
        k, v = k.strip(), v.strip()
        if k and v:
            specs[k] = v
    return specs

def process_one(pid, url):
    try:
        specs = fetch_specs(url)
        if specs:
            cur.execute("UPDATE products SET specifications = ? WHERE id = ?",
                       (json.dumps(specs, ensure_ascii=False), pid))
            return True, len(specs)
        return False, 0
    except Exception:
        return False, -1

updated = failed = empty = 0
with ThreadPoolExecutor(max_workers=12) as ex:
    futs = {ex.submit(process_one, pid, url): pid for pid, url in targets}
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
            json.dump(list(progress), open(PROGRESS_FILE,'w'))
            print(f"  {done}/{len(targets)} updated:{updated} empty:{empty} failed:{failed}", flush=True)

conn.commit()
json.dump(list(progress), open(PROGRESS_FILE,'w'))
print(f"DONE updated:{updated} empty:{empty} failed:{failed}", flush=True)
