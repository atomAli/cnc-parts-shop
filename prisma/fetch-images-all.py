#!/usr/bin/env python3
import urllib.request, urllib.parse, json, re, ssl, time, uuid, sys, os, sqlite3
from collections import defaultdict, OrderedDict

ssl._create_default_https_context = ssl._create_unverified_context
BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
UPLOADS = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/public/uploads'
DB = '/Users/aliarjmandi/Desktop/Projects/cnc-parts-shop/dev.db'

MODEL_RE = re.compile(
    r'\b(?:HGR|HGH|HGW|MGN|MGC|MGW|MGCR|MGWR|MGNR|EGR|MGE|MSA|HSR|SHS|HMS|GSK|TR[SH])\s?(\d{2})(?:[A-Z0-9-]*)\b',
    re.IGNORECASE)
BS_RE = re.compile(r'\b(?:SFU|SFE|SFS|SFI|FSI|DFU|OFU|OF|BSG|SF)\s?(\d{2,3})[-\s]?(\d{1,2})[A-Z0-9]*\b', re.IGNORECASE)
BRG_RE = re.compile(r'\b(\d{4}(?:[-/][A-Z0-9]+)?)\b')
SPIN_RE = re.compile(r'\b(?:GDZ|GDF|GDL|GD|HGD|HFD|GDR)\s?(\d{2,3})[-\s]?(\d+)[A-Z0-9]*\b', re.IGNORECASE)
VFD_RE = re.compile(r'\b(VFD\d{2,3}[A-Z0-9]*)\b', re.IGNORECASE)
SERVO_RE = re.compile(r'\b(ECMA[A-Z0-9-]+|ASD[A-Z0-9-]+|ECM[A-Z0-9-]+)\b', re.IGNORECASE)
PLC_RE = re.compile(r'\b(DVP[A-Z0-9-]+|B2|A2|AH[A-Z0-9-]+)\b', re.IGNORECASE)
HMI_RE = re.compile(r'\b(DOP[A-Z0-9-]+|HMI[A-Z0-9-]*)\b', re.IGNORECASE)
STEP_RE = re.compile(r'\b(HS\d{3,6}|NEMA1[0-9]|17HS\d+)\b', re.IGNORECASE)
RATIO_RE = re.compile(r'(?:نسبت\s*)?(1)\s*(?:به|ب)\s*(\d{1,3})')

def clean(s):
    s = s.lower()
    for a,b in {'ي':'ی','ك':'ک','ة':'ه','أ':'ا','إ':'ا','آ':'ا','ؤ':'و','ئ':'ی','\u200c':''}.items():
        s = s.replace(a,b)
    return s

def brand_of(name):
    c = clean(name)
    mapping = {'hqm':'hqm','hiwin':'hiwin','skf':'skf','nsk':'nsk','ina':'ina','bsg':'bsg','dsg':'dsg',
               'samick':'samick','delta':'delta','leadshine':'leadshine','alpha':'alpha','invt':'invt',
               'farek':'farek','fotek':'fotek','hertz':'hertz','hqd':'hqd','hsd':'hsd','cc':'cc','deci':'deci',
               'asiantool':'asiantool','linkan':'linkan','radonix':'radonix','fatek':'fatek','econ':'econ'}
    for k,v in mapping.items():
        if k in c:
            return v
    return None

def query_for(cat, name, specs):
    c = clean(name)
    if cat == 'linear-guide':
        kind = 'linear guide block'
        if 'ریل' in c:
            kind = 'linear guide rail'
        m = MODEL_RE.search(name)
        if m:
            model = f"{m.group(1)}{m.group(2)}" if cat=='linear-guide' and False else name[m.start():m.end()].upper().replace(' ','')
            return f"{m.group(0).upper().replace(' ','')} {kind}"
        if 'مینیاتوری' in c:
            return f'miniature linear guide {kind}'
        return f'hiwin linear guide {kind}'
    if cat == 'ball-screw':
        m = BS_RE.search(name)
        model = m.group(0).upper().replace(' ','') if m else None
        if 'مهره' in c:
            return (f'ball screw nut {model}' if model else 'ball screw nut')
        if 'ساپورت' in c or 'صافی' in c:
            return 'ball screw nut support BK'
        return (f'ball screw {model}' if model else 'ball screw')
    if cat == 'bearing':
        m = BRG_RE.search(name)
        model = m.group(0).upper() if m else None
        if 'مهره' in c or 'واحد' in c:
            return f'bearing {model} nut' if model else 'bearing nut'
        if 'اسکیت' in c:
            return 'linear bearing unit'
        return (f'ball bearing {model}' if model else 'ball bearing')
    if cat == 'gearbox':
        m = RATIO_RE.search(name)
        ratio = f'1 {m.group(0)}' if m else ''
        if 'خورشیدی' in c or 'پلنتاری' in c or 'سیاره' in c:
            return f'planetary gearbox ratio {ratio}'.strip()
        if 'حلزونی' in c:
            return f'worm gearbox ratio {ratio}'.strip()
        return f'gearbox reducer {ratio}'.strip()
    if cat == 'coupling':
        if 'انعطاف' in c:
            return 'flexible coupling jaw'
        if 'رزوه' in c:
            return 'thread coupling'
        return 'flexible coupling'
    if cat == 'cable-carrier':
        w = re.search(r'(\d+)\s*(?:میلیمتر|mm)', c)
        q = 'cable carrier drag chain'
        if w:
            q += f' {w.group(1)}mm width'
        return q
    if cat == 'shaft':
        return 'linear shaft hard chrome'
    if cat == 'gear-rack':
        mod = re.search(r'مدول\s*([\d.]+|۱|۲|۳)', c)
        return f'gear rack pinion' + (f' module {mod.group(1)}' if mod else '')
    if cat == 'spindle-motor':
        m = SPIN_RE.search(c)
        er = re.search(r'[Ee][Rr]\s?(\d{2})', name)
        kw = re.search(r'([\d.]+)\s*(?:کیلووات|kw)', c)
        parts = ['air cooled cnc spindle motor']
        if kw: parts.append(f"{kw.group(1)}kw")
        if er: parts.append(f"er{er.group(1)}")
        return ' '.join(parts)
    if cat == 'servo-motor':
        m = SERVO_RE.search(name)
        b = brand_of(name)
        q = ['servo motor']
        if b: q.append(b)
        if m: q.append(m.group(1))
        return ' '.join(q)
    if cat == 'inverter':
        m = VFD_RE.search(name)
        b = brand_of(name)
        q = ['inverter', 'vfd']
        if m: q.append(m.group(1))
        if b: q.append(b)
        return ' '.join(q)
    if cat == 'controller':
        m = PLC_RE.search(name)
        b = brand_of(name)
        if b == 'delta':
            if m: return f'delta plc {m.group(1)}'
            return 'delta plc'
        if HMI_RE.search(name):
            if m: return f'delta hmi {m.group(1)}'
            return 'plc hmi touch screen'
        return 'plc controller'
    if cat == 'step-motor':
        m = STEP_RE.search(name)
        if m: return f'stepper motor {m.group(1)}'
        return 'stepper motor nema'
    if cat == 'vacuum-pump':
        capacity = re.search(r'(\d+)\s*مترمکعب', c)
        cap = capacity.group(1) if capacity else None
        if 'رینگ مایع' in c or 'آب در گردش' in c:
            return ('water ring vacuum pump' + (f' {cap} m3 h' if cap else ''))
        if 'روغنی' in c:
            return ('oil rotary vane vacuum pump' + (f' {cap} m3 h' if cap else ''))
        return 'rotary vane vacuum pump'
    if cat == 'slip-ring':
        m = re.search(r'مدل\s*([A-Za-z0-9-]+)', name)
        q = 'slip ring rotary connector'
        if m: q += ' ' + m.group(1)
        return q
    if cat == 'power-supply':
        v = re.search(r'(\d+)\s*ولت', c)
        return 'switching power supply 24V' if not v else f'switching power supply {v.group(1)}v'
    if cat == 'laser':
        return 'fiber laser cutting machine'
    if cat == 'electric-jack':
        return 'electric linear actuator jack'
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

def sniff(data):
    if data.startswith(b'\xff\xd8\xff'): return 'jpg'
    if data.startswith(b'\x89PNG'): return 'png'
    if data.startswith(b'GIF8'): return 'gif'
    if data.startswith(b'RIFF') and b'WEBP' in data[:16]: return 'webp'
    if data.startswith(b'BM'): return 'bmp'
    return None

def download(url, dest):
    url = url.replace('http://', 'https://')
    req = urllib.request.Request(url, headers={'User-Agent': BROWSER, 'Referer': 'https://duckduckgo.com/',
                                               'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read(4*1024*1024+64)
    ext = sniff(data)
    if not ext:
        raise ValueError('not an image')
    with open(dest, 'wb') as f:
        f.write(data)
    return ext

def main(cat):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT p.id, p.name, p.specifications FROM products p JOIN categories c ON p.categoryId=c.id WHERE c.slug=?", (cat,))
    rows = cur.fetchall()

    # bucket
    buckets = defaultdict(list)
    for pid, name, specs in rows:
        q = query_for(cat, name, specs)
        if not q:
            buckets[('NOQUERY', name[:40])].append(pid)  # will fail
            continue
        # a normalized search key: lowercase, collapse spaces
        buckets[(cat, q.lower())].append((pid, name))

    print(f'Category {cat}: {len(rows)} products -> {len(buckets)} unique image buckets')

    query_cache = {}   # query -> local url (reuse across products)
    inserted = []
    failed = []
    order = sorted(buckets.items(), key=lambda kv: -len(kv[1]) if kv[0][0]==cat else 0)
    for (keycat, qkey), members in order:
        if keycat == 'NOQUERY':
            for pid in members:
                failed.append((pid, 'no-query'))
            continue
        if qkey in query_cache:
            url = query_cache[qkey]
            for pid, name in members:
                img_id = uuid.uuid4().hex
                cur.execute("INSERT INTO product_images (id, url, alt, isPrimary, productId, \"order\") VALUES (?,?,?,1,?,0)",
                            (img_id, url, name, pid))
                inserted.append((name, url))
            continue
        try:
            urls = ddg_images(qkey)
            if not urls:
                failed.append((members[0][1], 'no-results'))
                continue
            found = None
            for j, u in enumerate(urls):
                try:
                    tag = hashlib_md5(qkey)[:8]
                    dest = os.path.join(UPLOADS, f'{cat}_{tag}.png')
                    ext = download(u, dest)
                    final = f'{cat}_{tag}.{ext}'
                    os.rename(dest, os.path.join(UPLOADS, final))
                    found = '/uploads/' + final
                    break
                except Exception:
                    continue
            if not found:
                failed.append((members[0][1], 'download-failed'))
                continue
            query_cache[qkey] = found
            for pid, name in members:
                if qkey not in locals(): pass
                img_id = uuid.uuid4().hex
                cur.execute("INSERT INTO product_images (id, url, alt, isPrimary, productId, \"order\") VALUES (?,?,?,1,?,0)",
                            (img_id, found, name, pid))
                inserted.append((name, found))
        except Exception as e:
            failed.append((members[0][1], str(e)[:40]))
        time.sleep(0.3)

    conn.commit()
    conn.close()
    print(f'\n{cat}: inserted rows via {len(query_cache)} unique images | failed={len(failed)}')
    for name, url in inserted[-8:]:
        print(f'  + {name[:50]} -> {url}')
    if failed:
        print('FAILED:')
        for name, why in failed:
            print(f'  - {str(name)[:50]} ({why})')

def hashlib_md5(s):
    import hashlib
    return hashlib.md5(s.encode()).hexdigest()

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'linear-guide')