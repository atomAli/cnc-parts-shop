#!/usr/bin/env python3
import sys, os, json, glob
import numpy as np
import cv2

OUT_DIR = "/Users/aliarjmandi/Desktop/Projects/cncparts-db/data/images"
ORIG = os.path.join(OUT_DIR, "orig")
CLEAN = os.path.join(OUT_DIR, "clean")
MASKS = os.path.join(OUT_DIR, "masks")
CLASSES_JSON = os.path.join(OUT_DIR, "classes.json")

STABLE_TOL = 10      # max pixel spread across samples to count as fixed overlay
CONTENT = 245        # not-near-white threshold for overlay content
MAX_COVERAGE = 0.02  # if stable area fraction bigger than this -> shared artwork, skip
MIN_AREA_PX = 60     # keep only connected stable components of at least this area
PAD = 5              # padding around logo box when inpainting


def stable_masks_for_class(imgs: list, H, W):
    """returns pixel-level stable mask (fixed overlay) for a set of same-size images."""
    n = min(len(imgs), 16)
    stack = np.stack(imgs[:n])
    mx = stack.max(axis=0)
    mn = stack.min(axis=0)
    med = np.median(stack, axis=0)
    cand = ((mx - mn) <= STABLE_TOL) & (med < CONTENT)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(cand.astype(np.uint8), 8)
    keep = np.zeros_like(cand)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= MIN_AREA_PX:
            keep |= lab == i
    return keep, n - 1


def load_family_map():
    manifest = json.load(open(os.path.join(OUT_DIR, "manifest.json")))
    targets = json.load(open(os.path.join(OUT_DIR, "images_targets.json")))
    leaf_of_slug = {t["slug"]: t["leaf"] for t in targets}
    mapfile = json.load(open(os.path.join(OUT_DIR, "originals_map.json")))
    fam_of_file = {}
    for orig, info in manifest.items():
        fname = mapfile.get(orig)
        if not fname:
            continue
        leaves = [leaf_of_slug[s] for s in info["mainFor"] if s in leaf_of_slug]
        if not leaves:
            leaves = [leaf_of_slug[s] for s in info["products"] if s in leaf_of_slug]
        fam_of_file[fname] = leaves[0] if leaves else "?"
    return fam_of_file


def list_images():
    return [
        os.path.join(ORIG, f)
        for f in sorted(os.listdir(ORIG))
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]


def analyze(limit=16):
    fam_of_file = load_family_map()

    files = list_images()
    by = {}
    for f in files:
        g = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
        if g is None:
            continue
        key = (g.shape[:2], fam_of_file.get(os.path.basename(f), "?"))
        by.setdefault(key, []).append(g)
    os.makedirs(MASKS, exist_ok=True)
    classes = {}
    for (key, fam), imgs in sorted(by.items(), key=lambda kv: -len(kv[1])):
        H, W = key
        cfam = "__".join(fam.split("/"))
        if len(imgs) < 4:
            classes[f"{W}x{H}::{cfam}"] = {"n": len(imgs), "status": "skip-few-samples"}
            continue
        keep, comps = stable_masks_for_class(imgs, H, W)
        coverage = keep.sum() / (H * W) if keep.any() else 0.0
        if not keep.any():
            classes[f"{W}x{H}::{cfam}"] = {"n": len(imgs), "status": "clean", "components": comps}
            continue
        ys, xs = np.where(keep)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        box = [x0, y0, x1, y1]
        if coverage > MAX_COVERAGE:
            classes[f"{W}x{H}::{cfam}"] = {
                "n": len(imgs), "status": "skip-shared-artwork",
                "coverage": round(float(coverage), 5), "components": comps, "box": box,
            }
            continue
        cv2.imwrite(os.path.join(MASKS, f"{W}x{H}_{cfam}.png"), keep.astype(np.uint8) * 255)
        classes[f"{W}x{H}::{cfam}"] = {
            "n": len(imgs), "status": "logo",
            "coverage": round(float(coverage), 5), "components": comps, "box": box,
        }
    json.dump(classes, open(CLASSES_JSON, "w"), indent=1)
    from collections import Counter
    print("status counts:", dict(Counter(v["status"] for v in classes.values())))
    for k, v in sorted(classes.items()):
        print(k, v)


def bottom_text_band(gs, W, H):
    """Find watermark text row near bottom-left. Returns mask (HxW uint8) or None."""
    rx1 = int(W * 0.38)
    y0 = int(H * 0.89)
    gray = np.asarray(gs, dtype=np.uint8)
    det = gray < 210   # conservative detection (real text is clearly dark)
    rect = det[y0:H, 0:rx1]
    frac = rect.mean(axis=1)
    row_hits = np.where(frac > 0.035)[0]
    if len(row_hits) == 0:
        return None
    bands = []
    start = prev = row_hits[0]
    for r in row_hits[1:]:
        if r == prev + 1:
            prev = r
        else:
            bands.append((start, prev))
            start = prev = r
    bands.append((start, prev))
    best = None
    for b_top, b_bot in bands:
        hpx = b_bot - b_top + 1
        dense = frac[b_top:b_bot + 1].max()
        if 3 <= hpx <= min(280, int(H * 0.09)) and b_top + y0 >= int(H * 0.90) and dense >= 0.10:
            if best is None or hpx > best[0]:
                best = (hpx, b_top, b_bot)
    if best is None:
        return None
    _, b_top, b_bot = best
    dark = gray < 230  # generous mask within the verified band (antialiased fringe)
    m = np.zeros((H, W), np.uint8)
    m[b_top + y0:b_bot + y0 + 1, 0:rx1] = np.where(dark[b_top + y0:b_bot + y0 + 1, 0:rx1], 255, 0).astype(np.uint8)
    return m


def list_images():
    return [
        os.path.join(ORIG, f)
        for f in sorted(os.listdir(ORIG))
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]


def clean_all():
    files = list_images()
    os.makedirs(CLEAN, exist_ok=True)
    stats = {"with_watermark": 0, "no_watermark": 0, "fail": 0}
    for f in files:
        img = cv2.imread(f)
        if img is None:
            stats["fail"] += 1
            continue
        H, W = img.shape[:2]
        gs = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mask = bottom_text_band(gs, W, H)
        if mask is None:
            cv2.imwrite(os.path.join(CLEAN, os.path.basename(f)), img)
            stats["no_watermark"] += 1
            continue
        # pad mask a bit
        k = np.ones((int(max(3, H * 0.004)), int(max(3, H * 0.004))), np.uint8)
        mask = cv2.dilate(mask, k, iterations=1)
        cleaned = cv2.inpaint(img, mask, 6, cv2.INPAINT_TELEA)
        cv2.imwrite(os.path.join(CLEAN, os.path.basename(f)), cleaned)
        stats["with_watermark"] += 1
    json.dump({"stats": stats}, open(os.path.join(OUT_DIR, "clean_report.json"), "w"), indent=1)
    print(json.dumps(stats))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "analyze"
    if cmd == "analyze":
        analyze()
    elif cmd == "clean":
        clean_all()