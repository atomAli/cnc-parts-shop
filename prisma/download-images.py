#!/usr/bin/env python3
import sys, os, json, time, hashlib, urllib.request

OUT_DIR = "/Users/aliarjmandi/Desktop/Projects/cncparts-db/data/images"
ORIG = os.path.join(OUT_DIR, "orig")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")
MAPFILE = os.path.join(OUT_DIR, "originals_map.json")

BASE = "https://shop.cncparts.ir"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

os.makedirs(ORIG, exist_ok=True)


def ext_of(path):
    low = path.lower()
    for e in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        if low.endswith(e):
            return e
    return ".jpg"


def fetch(url, tries=3):
    for n in range(1, tries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*,*/*"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if len(data) > 0:
                return data
        except Exception:
            pass
        time.sleep(1.5 * n)
    return None


def main():
    manifest = json.load(open(MANIFEST))
    mapping = {}
    if os.path.exists(MAPFILE):
        mapping = json.load(open(MAPFILE))

    total = len(manifest)
    done = ok = skip = fail = 0
    for i, (path, info) in enumerate(manifest.items()):
        fname = mapping.get(path)
        if fname and os.path.exists(os.path.join(ORIG, fname)):
            skip += 1
            done += 1
            continue
        url = BASE + info["url"]
        data = fetch(url)
        if data is None:
            fail += 1
            print("FAIL", info["url"], flush=True)
            done += 1
            mapping[path] = None
            json.dump(mapping, open(MAPFILE, "w"))
            continue
        fname = hashlib.sha1(info["url"].encode("utf-8")).hexdigest()[:12] + "_" + os.path.basename(info["url"])
        with open(os.path.join(ORIG, fname), "wb") as f:
            f.write(data)
        mapping[path] = fname
        ok += 1
        done += 1
        json.dump(mapping, open(MAPFILE, "w"))
        if ok % 25 == 0:
            print(f"... {done}/{total} ok={ok} skip={skip} fail={fail}", flush=True)
        time.sleep(0.25)

    json.dump(mapping, open(MAPFILE, "w"))
    print(f"DONE {done}/{total} ok={ok} skip={skip} fail={fail}")


if __name__ == "__main__":
    main()