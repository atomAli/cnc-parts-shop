#!/usr/bin/env python3
import sqlite3, re, json
from difflib import SequenceMatcher

RUN2 = '2026-09-01 10:38:58'

def clean(s):
    s = s.lower()
    repl = {'ي':'ی','ك':'ک','ة':'ه','أ':'ا','إ':'ا','آ':'ا','ؤ':'و','ئ':'ی','\u200c':''}
    for a,b in repl.items(): s = s.replace(a,b)
    s = re.sub(r'\s+', ' ', s)
    return re.sub(r'[^\w\u0600-\u06FF\s]', '', s)

conn = sqlite3.connect('dev.db')
cur = conn.cursor()

mech = ['gearbox','ball-screw','cable-carrier','bearing','coupling','gear-rack']

# gather gear-rack run2 vs original for counterpart check
cur.execute("SELECT p.id, p.name FROM products p JOIN categories c ON p.categoryId=c.id "
            "WHERE c.slug='gear-rack'")
rack = cur.fetchall()
rack_orig = [i for i in rack if i[1] not in ('',)]
# identify run2 by re-fetch with timestamp
cur.execute("SELECT p.id, p.name FROM products p JOIN categories c ON p.categoryId=c.id "
            "WHERE c.slug='gear-rack' AND p.createdAt=?", (RUN2,))
rack_run2 = set(i[0] for i in cur.fetchall())
rack_keep_orig = [i for i in rack if i[0] not in rack_run2]

def has_counterpart(name, others):
    cn = clean(name)
    for _, oname in others:
        if SequenceMatcher(None, cn, clean(oname)).ratio() >= 0.75:
            return True
    return False

delete_ids = []
keep_rack = 0
for cat in mech:
    if cat == 'gear-rack':
        cur.execute("SELECT p.id, p.name FROM products p JOIN categories c ON p.categoryId=c.id "
                    "WHERE c.slug='gear-rack' AND p.createdAt=?", (RUN2,))
        rows = cur.fetchall()
        for pid, name in rows:
            if has_counterpart(name, rack_keep_orig):
                delete_ids.append(pid)
            else:
                keep_rack += 1
    else:
        cur.execute("SELECT p.id FROM products p JOIN categories c ON p.categoryId=c.id "
                    "WHERE c.slug=? AND p.createdAt=?", (cat, RUN2))
        delete_ids += [r[0] for r in cur.fetchall()]

print('Total to delete:', len(delete_ids), '| genuine gear-rack kept:', keep_rack)
conn.close()
json.dump(delete_ids, open('/tmp/delete_ids.json','w'))