#!/usr/bin/env python3
import urllib.request, urllib.parse, json, re, ssl, time, uuid, sys, os, sqlite3, hashlib

ssl._create_default_https_context = ssl._create_unverified_context
BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
UPLOADS = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/public/uploads'
DB = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/dev.db'

def override_query(name):
    c = name.lower()
    if 'فرکانس بالا' in c or 'فرکانس-بالا' in c:
        m = re.search(r'(\d+(?:\.\d+)?)\s*کیلووات', name)
        return f'variable frequency drive inverter {m.group(1) if m else "7.5"}kw'
    if 'اسپیندل' in c:
        kw = re.search(r'([\d.]+)\s*وات', name)
        return 'air cooled cnc spindle motor er20' if not kw else f'cnc spindle motor {kw.group(1)}w'
    if 'سروو' in c:
        kw = re.search(r'(\d+)w', name)
        return f'delta servo motor {kw.group(1) if kw else ""}w'.strip()
    return None

def ddg_images(query, n=8):
    page_url = 'https://duckduckgo.com/?q=' + urllib.parse.quote(query) + '&iax=images&ia=images'
    req = urllib.request.Request(page_url, headers={'User-Agent': BROWSER})
    html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', errors='replace')
    m = re.search(r"vqd=['\"](\d+-\d+(?:-\d+)?)['\"]", html) or re.search(r'vqd=([\d-]+)', html)
    if not m:
        return None
    vqd = m.group(1)
    api = 'https://duckduckgo.com/i.js?l=us-en&o=json&q=' + urllib.parse.quote(query) + '&vqd=' + urllib.parse.quote(vqd)
    req2 = urllib.request.Request(api, headers={'User-Agent': BROWSER, 'Referer': page_url})
    data = json.loads(urllib.request.urlopen(req2, timeout=30).read().decode('utf-8'))
    return [x['image'] for x in data.get('results', [])[:n]]

def sniff(d):
    if d.startswith(b'\xff\xd8\xff'): return 'jpg'
    if d.startswith(b'\x89PNG'): return 'png'
    if d.startswith(b'GIF8'): return 'gif'
    if d.startswith(b'RIFF') and b'WEBP' in d[:16]: return 'webp'
    return None

def download(url, dest):
    url = url.replace('http://', 'https://')
    req = urllib.request.Request(url, headers={'User-Agent': BROWSER, 'Referer': 'https://duckduckgo.com/',
                                               'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'})
    with urllib.request.urlopen(req, timeout=40) as r:
        d = r.read(4*1024*1024+64)
    ext = sniff(d)
    if not ext: raise ValueError('not image')
    open(dest,'wb').write(d)
    return ext

conn = sqlite3.connect(DB); cur = conn.cursor()
cur.execute("SELECT p.id, p.name FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.productId=p.id)")
rows = cur.fetchall()
print('missing:', len(rows))

ok = 0
for pid, name in rows:
    q = override_query(name)
    try:
        urls = ddg_images(q)
        found = None
        for j, u in enumerate(urls or []):
            try:
                tag = hashlib.md5(q.encode()).hexdigest()[:8]
                dest = os.path.join(UPLOADS, f'retry_{tag}.png')
                ext = download(u, dest)
                final = f'retry_{tag}_{pid[:6]}.{ext}'
                os.rename(dest, os.path.join(UPLOADS, final))
                found = '/uploads/' + final
                break
            except Exception:
                continue
        if found:
            cur.execute("INSERT INTO product_images (id,url,alt,isPrimary,productId,\"order\") VALUES (?,?,?,1,?,0)",
                        (uuid.uuid4().hex, found, name, pid))
            conn.commit()
            ok += 1
            print(f'OK {name[:55]} -> {found}')
        else:
            print(f'FAIL {name[:55]} (no download)')
    except Exception as e:
        print(f'FAIL {name[:55]} ({str(e)[:30]})')
    time.sleep(0.4)
conn.close()
print('done, ok =', ok)