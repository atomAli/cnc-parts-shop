#!/usr/bin/env python3
import urllib.request, urllib.parse, json, re, ssl, time, uuid, sys, os, sqlite3
from collections import OrderedDict

ssl._create_default_https_context = ssl._create_unverified_context
BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

UPLOADS = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/public/uploads'
DB = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/dev.db'

def build_query(name):
    low = name
    capacity = re.search(r'(\d+)\s*مترمکعب', low)
    cap = capacity.group(1) if capacity else None
    litres = re.search(r'([\d.]+)\s*لیتری', low)
    lit = litres.group(1) if litres else None
    if 'رینگ مایع' in low or 'آب در گردش' in low:
        q = 'water ring vacuum pump'
        if cap:
            q += f' {cap} m3 h'
        return q
    if 'پمپ وکیوم' in low and 'روغنی' in low:
        if cap:
            return f'oil rotary vane vacuum pump {cap} m3 h'
        return 'oil lubricated rotary vane vacuum pump'
    if 'پمپ وکیوم' in low:
        return 'rotary vane vacuum pump'
    if 'تقسیم روغن کاری' in low:
        outlets = re.search(r'(\d+)\s*خروجی', low)
        q = 'lubrication oil distributor'
        if outlets:
            q = f'lubrication oil distributor {outlets.group(1)} outlet'
        if 'سوپاپ دار' in low:
            q += ' with valve'
        return q
    if 'پمپ روغن کاری' in low:
        if 'اتوماتیک' in low:
            if lit:
                return f'automatic lubrication pump {lit} litre'
            return 'automatic lubrication pump'
        if 'دستی' in low or 'semi' in low:
            if lit:
                return f'semi automatic lubrication pump {lit} litre'
            return 'semi automatic lubrication pump'
        return 'lubrication oil pump'
    return None

def ddg_images(query, n=6):
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

MAGIC = {
    b'\xff\xd8\xff': 'jpg',
    b'\x89PNG': 'png',
    b'GIF8': 'gif',
    b'RIFF': 'webp',   # webp starts with RIFF....WEBP
    b'BM': 'bmp',
}

def sniff(data):
    for magic, ext in MAGIC.items():
        if data.startswith(magic):
            if ext == 'webp' and b'WEBP' not in data[:16]:
                continue
            return ext
    return None

def download(url, dest):
    url = url.replace('http://', 'https://')
    req = urllib.request.Request(url, headers={
        'User-Agent': BROWSER,
        'Referer': 'https://duckduckgo.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    })
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read(4 * 1024 * 1024 + 64)
    ext = sniff(data)
    if not ext:
        raise ValueError('not an image')
    with open(dest, 'wb') as f:
        f.write(data)
    return ext

def main(category_slug):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT p.id, p.name FROM products p JOIN categories c ON p.categoryId=c.id WHERE c.slug=?", (category_slug,))
    rows = cur.fetchall()

    ok = []
    fail = []
    for i, (pid, name) in enumerate(rows):
        q = build_query(name)
        if not q:
            fail.append((name, 'no-query'))
            continue
        try:
            urls = ddg_images(q)
            if not urls:
                fail.append((name, 'no-results'))
                continue
            chosen = None
            for j, u in enumerate(urls):
                try:
                    fname = f"pump_{pid[:10]}_{i}_j{j}.png"
                    dest = os.path.join(UPLOADS, fname)
                    ext = download(u, dest)
                    final = f"pump_{pid[:10]}_{i}_j{j}.{ext}"
                    os.rename(dest, os.path.join(UPLOADS, final))
                    chosen = ('/uploads/' + final, u)
                    break
                except Exception as e:
                    continue
            if not chosen:
                fail.append((name, 'download-failed'))
                continue
            url, src = chosen
            img_id = uuid.uuid4().hex
            cur.execute(
                "INSERT INTO product_images (id, url, alt, isPrimary, productId, \"order\") VALUES (?,?,?,1,?,0)",
                (img_id, url, name, pid))
            ok.append((name, q, url, src))
        except Exception as e:
            fail.append((name, str(e)[:50]))
        time.sleep(0.4)
    conn.commit()
    conn.close()

    print(f'\n===== {category_slug}: {len(ok)} OK, {len(fail)} FAILED =====\n')
    for name, q, url, src in ok:
        print(f'OK   | query: {q}')
        print(f'     | product: {name[:60]}')
        print(f'     | saved: {url}  <- {src[:70]}')
    print()
    for name, why in fail:
        print(f'FAIL | {name[:50]}  ({why})')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'vacuum-pump')