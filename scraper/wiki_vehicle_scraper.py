"""
Scrape vehicle pages from gta.wiki.
Lightweight regex-based, incremental saves, crash-resistant.
Restart to resume from saved progress.
"""
import urllib.request, re, json, time, os, sys, gc

BASE = 'https://gta.wiki'
INDEX_PAGE = BASE + '/w/Vehicles_in_GTA_Online'
HEADERS = {'User-Agent': 'Mozilla/5.0'}
OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'wiki_vehicles_scraped.json')
TEMP_OUTPUT = OUTPUT + '.tmp'
DELAY = 0.3

def get_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    resp = urllib.request.urlopen(req, timeout=12)
    return resp.read().decode('utf-8', errors='replace')

def get_links():
    print('Getting links...')
    html = get_html(INDEX_PAGE)
    links = set()
    for m in re.finditer(r'href=\"/w/([^\":]+)\"', html):
        slug = m.group(1)
        if any(x in slug for x in ['Special:', 'File:', 'Category:', 'Template:',
            'User:', 'Talk:', 'Help:', 'Main_Page', 'index.php', 'Grand_Theft',
            'GTA_Online:', 'Vehicles_in_GTA', 'Vehicle_Customization']):
            continue
        links.add(BASE + '/w/' + slug)
    return sorted(links)

def scrape_page(url):
    try:
        html = get_html(url)
        data = {'url': url, 'page_name': url.split('/')[-1]}

        # Description
        paras = re.findall(r'<p>(.*?)</p>', html, re.DOTALL)
        desc = []
        for p in paras:
            text = re.sub(r'<[^>]+>', '', p).strip()
            text = text.replace('&#160;', ' ').replace('&amp;', '&')
            if len(text) > 80:
                desc.append(text)
                if len(desc) >= 2:
                    break
        if desc:
            data['description'] = ' '.join(desc)

        # Infobox
        ib = re.search(r'<aside[^>]*>(.*?)</aside>', html, re.DOTALL)
        if not ib:
            ib = re.search(r'<table[^>]*class=\"[^\"]*infobox[^\"]*\"(.*?)</table>', html, re.DOTALL)
        if ib:
            for row in re.finditer(r'<tr>(.*?)</tr>', ib.group(1), re.DOTALL):
                th = re.search(r'<th[^>]*>(.*?)</th>', row.group(1), re.DOTALL)
                td = re.search(r'<td[^>]*>(.*?)</td>', row.group(1), re.DOTALL)
                if th and td:
                    key = re.sub(r'<[^>]+>', '', th.group(1)).strip().lower().replace(' ', '_')[:40]
                    val = re.sub(r'<[^>]+>', '', td.group(1)).strip()[:300]
                    if key and val:
                        data[key] = val

        # Specs tables
        for st in re.finditer(r'<table[^>]*vehicle-specifications[^>]*>(.*?)</table>', html, re.DOTALL):
            for row in re.finditer(r'<tr>(.*?)</tr>', st.group(1), re.DOTALL):
                cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row.group(1), re.DOTALL)
                if len(cells) >= 2:
                    key = re.sub(r'<[^>]+>', '', cells[0]).strip().lower().replace(' ', '_')[:40]
                    val = re.sub(r'<[^>]+>', '', cells[1]).strip()[:200]
                    if key and val:
                        data[key] = val

        # Images (limit to 5 to save memory)
        imgs = re.findall(r'src=\"(/images/[^\"]+)\"', html)
        imgs = [BASE + i for i in imgs if 'Carcol' not in i and 'Icon' not in i and 'Flag' not in i]
        data['images'] = list(set(imgs))[:5]

        # Traffic Colors
        tc = re.search(r'id=\"Traffic_Default_Colors\".*?<table[^>]*wikitable[^>]*>(.*?)</table>', html, re.DOTALL)
        if tc:
            colors = re.findall(r'<td[^>]*>(.*?)</td>', tc.group(1), re.DOTALL)
            colors = [re.sub(r'<[^>]+>', '', c).strip() for c in colors if c.strip()][:30]
            if colors:
                data['traffic_colors'] = colors

        return data
    except Exception as e:
        return {'url': url, 'error': str(e)[:100]}

def load_existing():
    if os.path.exists(OUTPUT):
        try:
            with open(OUTPUT, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            print('WARNING: JSON corrupt, trying temp file...')
            if os.path.exists(TEMP_OUTPUT):
                with open(TEMP_OUTPUT, 'r', encoding='utf-8') as f:
                    return json.load(f)
    return []

def save_results(results):
    with open(TEMP_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    os.replace(TEMP_OUTPUT, OUTPUT)

def main():
    links = get_links()
    print(f'Found {len(links)} links')

    results = load_existing()
    done_urls = {r['url'] for r in results if 'error' not in r}
    remaining = [l for l in links if l not in done_urls]
    print(f'Done: {len(done_urls)}, remaining: {len(remaining)}')

    for i, url in enumerate(remaining):
        data = scrape_page(url)
        if 'error' not in data:
            results.append(data)

        if (i + 1) % 20 == 0:
            save_results(results)
            gc.collect()
            print(f'Progress: {len(done_urls) + i + 1}/{len(links)}')

        time.sleep(DELAY)

    save_results(results)
    print(f'Done! {len(results)} vehicles')

if __name__ == '__main__':
    main()
