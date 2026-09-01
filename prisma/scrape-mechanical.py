import json, re, urllib.request, urllib.parse, ssl, time
from html.parser import HTMLParser

ssl._create_default_https_context = ssl._create_unverified_context

CATEGORIES = {
    "rail-wagon": {"slug": "linear-guide", "parent": "mechanical", "name": "ریل و واگن خطی"},
    "LinearBallbearing": {"slug": "bearing", "parent": "mechanical", "name": "بلبرینگ و یاتاقان"},
    "ball-screw-nut-support": {"slug": "ball-screw", "parent": "mechanical", "name": "بالسکرو و مهره و ساپورت"},
    "ball-bearing": {"slug": "bearing", "parent": "mechanical", "name": "بلبرینگ و یاتاقان"},
    "bearings": {"slug": "bearing", "parent": "mechanical", "name": "بلبرینگ و یاتاقان"},
    "aluminium-profiles": {"slug": "shaft", "parent": "mechanical", "name": "شفت و پروفیل آلومینیوم"},
    "cable-carrier": {"slug": "cable-carrier", "parent": "mechanical", "name": "محافظ کابل و انرژی چین"},
    "cable-carrier-topline": {"slug": "cable-carrier", "parent": "mechanical", "name": "محافظ کابل و انرژی چین"},
    "shaft": {"slug": "shaft", "parent": "mechanical", "name": "شفت و پروفیل آلومینیوم"},
    "planetary-spiral-gearbox": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و متعلقات"},
    "liming-gearbox": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و متعلقات"},
    "snail-gearbox": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و متعلقات"},
    "snail-gearbox-liming": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و متعلقات"},
    "belt-gearbox": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و م랫قات"},
    "sbl-gearbox": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و متعلقات"},
    "gear-rack-pinion": {"slug": "gear-rack", "parent": "mechanical", "name": "دنده شانه‌ای و دنده مقابل"},
    "coupling": {"slug": "coupling", "parent": "mechanical", "name": "کوپلینگ و اتصالات"},
    "gearbox-accessories": {"slug": "gearbox", "parent": "mechanical", "name": "گیربکس و متعلقات"},
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")

class ProductParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.products = []
        self.in_product = False
        self.in_name = False
        self.in_price = False
        self.current = {}
        self.depth = 0
        
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        cls = d.get("class", "")
        
        if tag == "a" and "product-box" in cls:
            self.in_product = True
            self.current = {"name": "", "price": 0, "image": ""}
            
        if self.in_product:
            if tag == "a" and "product-img" in cls:
                href = d.get("href", "")
                if href and not href.startswith("http"):
                    href = "https://shop.cncmarket.ir" + href
                self.current["image"] = href
                # get img src
            if tag == "img" and "product-img" in cls:
                src = d.get("src", "") or d.get("data-src", "")
                if src and not src.startswith("http"):
                    src = "https://shop.cncmarket.ir" + src
                self.current["image"] = src
            if tag == "h4":
                self.in_name = True
            if "product-price" in cls or "price" in cls:
                self.in_price = True
                
    def handle_endtag(self, tag):
        if tag == "h4" and self.in_name:
            self.in_name = False
        if self.in_price and tag in ("span", "div", "p"):
            self.in_price = False
            
    def handle_data(self, data):
        if self.in_name:
            self.current["name"] += data.strip()
        if self.in_price:
            price_text = data.strip().replace(",", "").replace("،", "")
            nums = re.findall(r"\d+", price_text)
            if nums:
                self.current["price"] = int(nums[0])
            
    def close(self):
        super().close()

def scrape_category(slug):
    """Scrape all products from a category, handling pagination."""
    all_products = []
    page = 1
    base_url = f"https://shop.cncmarket.ir/categories/category/{urllib.parse.quote(slug)}"
    
    while True:
        url = base_url if page == 1 else f"{base_url}?page={page}"
        print(f"  Fetching page {page}: {url}")
        try:
            html = fetch(url)
        except Exception as e:
            print(f"  Error: {e}")
            break
        
        # Parse products using regex since HTML parser is unreliable
        # Find product boxes
        product_pattern = r'<a[^>]*class="[^"]*product-box[^"]*"[^>]*href="([^"]*)"[^>]*>.*?</a>'
        
        # Better approach: find all product links and names
        # Pattern 1: product links with title
        pattern = r'<a[^>]*href="(/products/[^"]*)"[^>]*title="([^"]*)"[^>]*>'
        matches = re.findall(pattern, html, re.DOTALL)
        
        # Pattern 2: product images
        img_pattern = r'<img[^>]*class="[^"]*product-img[^"]*"[^>]*(?:src|data-src)="([^"]*)"'
        imgs = re.findall(img_pattern, html)
        
        # Pattern 3: prices
        price_pattern = r'<(?:span|div|p)[^>]*class="[^"]*(?:product-price|price)[^"]*"[^>]*>([^<]*)</(?:span|div|p)>'
        prices = re.findall(price_pattern, html)
        
        if not matches:
            # Try alternative pattern
            pattern2 = r'href="(/products/[^"]*)"'
            matches2 = re.findall(pattern2, html)
            # Get titles
            title_pattern = r'title="([^"]*)"'
            titles = re.findall(title_pattern, html)
            # Filter to product-like titles
            product_titles = [(m, t) for m, t in zip(matches2, titles) if "/products/" in m]
            matches = product_titles
        
        if not matches and page > 1:
            break
            
        for i, (path, title) in enumerate(matches):
            img = imgs[i] if i < len(imgs) else ""
            if img and not img.startswith("http"):
                img = "https://shop.cncmarket.ir" + img
            
            price = 0
            if i < len(prices):
                price_text = prices[i].replace(",", "").replace("،", "").strip()
                nums = re.findall(r"\d+", price_text)
                if nums:
                    price = int(nums[0])
            
            all_products.append({
                "name": title,
                "price": price,
                "image": img,
            })
        
        # Check for next page
        next_page_pattern = r'href="[^"]*\?page=' + str(page + 1) + r'"'
        if re.search(next_page_pattern, html):
            page += 1
            time.sleep(0.5)
        else:
            break
    
    return all_products

# Scrape all categories
print("=" * 60)
print("SCRAPING ALL MECHANICAL CATEGORIES")
print("=" * 60)

all_scraped = []
for slug, info in CATEGORIES.items():
    print(f"\n📁 {info['name']} ({slug})")
    products = scrape_category(slug)
    print(f"  Found {len(products)} products")
    for p in products:
        p["category_slug"] = info["slug"]
        p["parent_slug"] = info["parent"]
        p["source_slug"] = slug
    all_scraped.extend(products)
    time.sleep(0.3)

print(f"\n{'=' * 60}")
print(f"TOTAL SCRAPED: {len(all_scraped)} products")

# Save to file
with open("/Users/aliarjmandi/Desktop/Projects/scraped_mechanical.json", "w") as f:
    json.dump(all_scraped, f, ensure_ascii=False, indent=2)

print("Saved to scraped_mechanical.json")
