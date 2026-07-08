"""
Scrape Traffic Default Colors from gta.wiki for all vehicles in vehicles.json.
Fixed: large table chunk, dynamic table boundary, proper color parsing.
Incremental save, crash-resistant.
"""
import urllib.request, re, json, time, os, gc

HEADERS = {'User-Agent': 'Mozilla/5.0'}
BASE = 'https://gta.wiki'
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'traffic-default-colors.json')
TEMP = OUTPUT + '.tmp'
DELAY = 0.25

# ── Load color mapping ──
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, 'gta-colors.json'), 'r', encoding='utf-8') as f:
    cd = json.load(f)
cid_to_hex = {}
for c in cd.get('colors', []):
    if c.get('hex') and c['hex'].startswith('#'):
        cid_to_hex[c['id']] = c['hex']
print(f'Loaded {len(cid_to_hex)} color ID→hex mappings')

# ── Load vehicles.json ──
with open(os.path.join(ROOT, 'vehicles.json'), 'r', encoding='utf-8') as f:
    vehicles = json.load(f)
model_set = set()
for v in vehicles:
    mn = (v.get('model_name') or '').strip().lower()
    if mn:
        model_set.add(mn)
print(f'Loaded {len(model_set)} vehicle model_names')

# ── Load existing results ──
results = {}
if os.path.exists(OUTPUT):
    with open(OUTPUT, 'r', encoding='utf-8') as f:
        results = json.load(f)
    wc = sum(1 for v in results.values() if v.get('colors'))
    print(f'Resuming: {len(results)} already scraped, {wc} with colors')

# ── Get wiki links from index page ──
print('Fetching index page...')
req = urllib.request.Request(BASE + '/w/Vehicles_in_GTA_Online', headers=HEADERS)
html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='replace')

links = []
skip_words = ['Special:', 'File:', 'Category:', 'Template:', 'User:', 'Talk:',
              'Help:', 'Main_Page', 'index.php', 'Grand_Theft', 'GTA_Online:',
              'Vehicles_in_GTA', 'Vehicle_Customization']
for m in re.finditer(r'href="/w/([^":#]+)"', html):
    slug = m.group(1)
    if any(x in slug for x in skip_words):
        continue
    links.append((slug, BASE + '/w/' + slug))

# Match to vehicles.json model_names
todo = [(s, u) for s, u in links if s.lower() in model_set]
print(f'Wiki links: {len(links)}, matched to vehicles: {len(todo)}')

# ── Scrape ──
processed = 0
for page_name, url in todo:
    key = page_name.lower()
    if key in results:
        continue

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=10)
        page = resp.read().decode('utf-8', errors='replace')

        # Find Traffic Default Colors heading
        tc_idx = page.find('id="Traffic_Default_Colors"')
        if tc_idx < 0:
            results[key] = {'model_name': page_name, 'colors': []}
            processed += 1
            continue

        # Use large chunk (tables can be very long)
        chunk = page[tc_idx:tc_idx + 50000]

        # Find table start
        tbl_start = chunk.find('<table class="wikitable carcol')
        if tbl_start < 0:
            results[key] = {'model_name': page_name, 'colors': []}
            processed += 1
            continue

        after_tbl = chunk[tbl_start:]

        # Find table end (next h2 or h3 heading)
        next_heading = re.search(r'<(h[23]|/div>)', after_tbl[200:])
        if next_heading:
            tbl_html = after_tbl[:200 + next_heading.start()]
        else:
            tbl_html = after_tbl

        # Parse rows
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbl_html, re.DOTALL)
        colors = []
        labels = ['primary', 'secondary', 'pearlescent', 'wheel', 'trim', 'accent']

        for row in rows:
            if 'carcol-header' in row:
                continue
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
            if len(cells) < 4:
                continue

            row_colors = {}
            for ci, cell in enumerate(cells[:6]):
                b = re.search(r'<b>(\d+)</b>', cell)
                if b:
                    cid = int(b.group(1))
                    hx = cid_to_hex.get(cid, '')
                    if hx:
                        row_colors[labels[ci]] = {'id': cid, 'hex': hx}

            if 'primary' in row_colors and 'secondary' in row_colors:
                colors.append(row_colors)

        results[key] = {'model_name': page_name, 'colors': colors}
        processed += 1

    except Exception as e:
        results[key] = {'model_name': page_name, 'colors': [], 'error': str(e)[:80]}
        processed += 1

    # Save progress
    if processed % 30 == 0:
        with open(TEMP, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False)
        os.replace(TEMP, OUTPUT)
        wc = sum(1 for v in results.values() if v.get('colors'))
        print(f'  [{processed}] scraped, total {len(results)}, with colors: {wc}')

    time.sleep(DELAY)

# Final save
with open(TEMP, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False)
os.replace(TEMP, OUTPUT)
wc = sum(1 for v in results.values() if v.get('colors'))
total = len(results)
print(f'\nDone! Total: {total}, With colors: {wc}, Without: {total - wc}')
