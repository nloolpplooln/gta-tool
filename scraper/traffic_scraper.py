"""Scrape Traffic Default Colors from gta.wiki — sequential, reliable"""
import urllib.request, re, json, time, os, socket

socket.setdefaulttimeout(12)

HEADERS = {'User-Agent': 'Mozilla/5.0'}
BASE = 'https://gta.wiki'
OUTPUT = 'traffic-default-colors.json'
TEMP = OUTPUT + '.tmp'

with open('gta-colors.json', 'r', encoding='utf-8') as f:
    cd = json.load(f)
cid_to_hex = {}
for c in cd.get('colors', []):
    if c.get('hex') and c['hex'].startswith('#'):
        cid_to_hex[c['id']] = c['hex']
print(f'Colors: {len(cid_to_hex)}')

with open('vehicles.json', 'r', encoding='utf-8') as f:
    vehicles = json.load(f)
model_set = set()
for v in vehicles:
    mn = (v.get('model_name') or '').strip().lower()
    if mn: model_set.add(mn)
print(f'Vehicles: {len(model_set)}')

results = {}
if os.path.exists(OUTPUT):
    with open(OUTPUT, 'r', encoding='utf-8') as f:
        results = json.load(f)
    wc = sum(1 for v in results.values() if v.get('colors'))
    print(f'Resuming: {len(results)} done, {wc} with colors')

print('Fetching index...')
for retry in range(5):
    try:
        req = urllib.request.Request(BASE + '/w/Vehicles_in_GTA_Online', headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=30)
        html = resp.read().decode('utf-8', errors='replace')
        break
    except Exception as e:
        print(f'Retry {retry+1}: {e}')
        time.sleep(5)
else:
    raise SystemExit('Failed to fetch index')

links = []
skip = ['Special:', 'File:', 'Category:', 'Template:', 'User:', 'Talk:',
        'Help:', 'Main_Page', 'index.php', 'Grand_Theft', 'GTA_Online:',
        'Vehicles_in_GTA', 'Vehicle_Customization']
for m in re.finditer(r'href="/w/([^":#]+)"', html):
    slug = m.group(1)
    if not any(x in slug for x in skip):
        links.append((slug, BASE + '/w/' + slug))

total_matched = len([1 for s,u in links if s.lower() in model_set])
todo = [(s, u) for s, u in links if s.lower() in model_set and s.lower() not in results]
print(f'Links: {len(links)}, Matched: {total_matched}, To scrape: {len(todo)}')

labels = ['primary', 'secondary', 'pearlescent', 'wheel', 'trim', 'accent']
start = time.time()
scraped_in_session = 0

for page_name, url in todo:
    key = page_name.lower()
    try:
        for retry in range(2):
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                resp = urllib.request.urlopen(req, timeout=10)
                page = resp.read().decode('utf-8', errors='replace')
                break
            except:
                if retry == 0:
                    time.sleep(2)
                else:
                    raise

        tc_idx = page.find('id="Traffic_Default_Colors"')
        if tc_idx < 0:
            results[key] = {'model_name': page_name, 'colors': []}
            scraped_in_session += 1
            continue

        chunk = page[tc_idx:tc_idx + 50000]
        tbl_start = chunk.find('<table class="wikitable carcol')
        if tbl_start < 0:
            results[key] = {'model_name': page_name, 'colors': []}
            scraped_in_session += 1
            continue

        after_tbl = chunk[tbl_start:]
        nh = re.search(r'<(h[23]|/div>)', after_tbl[200:])
        tbl_html = after_tbl[:200 + nh.start()] if nh else after_tbl

        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbl_html, re.DOTALL)
        colors = []

        for row in rows:
            if 'carcol-header' in row:
                continue
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
            if len(cells) < 4:
                continue
            rc = {}
            for ci, cell in enumerate(cells[:6]):
                b = re.search(r'<b>(\d+)</b>', cell)
                if b:
                    cid = int(b.group(1))
                    hx = cid_to_hex.get(cid, '')
                    if hx:
                        rc[labels[ci]] = {'id': cid, 'hex': hx}
            if 'primary' in rc and 'secondary' in rc:
                colors.append(rc)

        results[key] = {'model_name': page_name, 'colors': colors}
        scraped_in_session += 1

    except Exception as e:
        results[key] = {'model_name': page_name, 'colors': [],
                        'error': str(e)[:80]}
        scraped_in_session += 1

    if scraped_in_session % 50 == 0:
        wc = sum(1 for v in results.values() if v.get('colors'))
        elapsed = time.time() - start
        rate = scraped_in_session / elapsed if elapsed > 0 else 0
        with open(TEMP, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False)
        os.replace(TEMP, OUTPUT)
        print(f'[{len(results)} total] {scraped_in_session}/{len(todo)} this run, {wc} w/ colors, {rate:.1f}/s')

    time.sleep(0.2)

wc = sum(1 for v in results.values() if v.get('colors'))
with open(TEMP, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False)
os.replace(TEMP, OUTPUT)
elapsed = time.time() - start
print(f'\nDONE: {len(results)} total, {wc} with colors, in {elapsed:.0f}s ({scraped_in_session/elapsed:.1f}/s)')
