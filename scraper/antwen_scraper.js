/**
 * antwen.cn GTA Vehicle Data Scraper
 *
 * Scrapes all 894 vehicles from antwen.cn's Next.js SSR pages.
 * Data is extracted from __NEXT_DATA__ JSON embedded in each page.
 *
 * Usage: node scraper/antwen_scraper.js [--resume] [--detail-only]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────
const BASE = 'www.antwen.cn';
const LIST_PAGE = '/vehicles?page=';
const DETAIL_PAGE = '/vehicles/';
const CONCURRENCY = 5;
const REQUEST_DELAY_MS = 500;
const SAVE_INTERVAL = 10; // save progress every N detail pages
const MAX_RETRIES = 3;
const TOTAL_PAGES = 56;

const OUTPUT_FILE = path.join(__dirname, '..', 'antwen_vehicles.json');
const PROGRESS_FILE = path.join(__dirname, '..', 'antwen_progress.json');
const LIST_CACHE_FILE = path.join(__dirname, '..', 'antwen_list_cache.json');

// ── HTTP Helper ─────────────────────────────────────────────
function fetchPage(urlPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE,
      path: urlPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 20000
    };

    const req = https.get(opts, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location;
        const nextPath = loc.startsWith('http') ? new URL(loc).pathname + (new URL(loc).search || '') : loc;
        fetchPage(nextPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${urlPath}`));
        return;
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${urlPath}`)); });
  });
}

async function fetchWithRetry(urlPath, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchPage(urlPath);
    } catch (e) {
      if (i === retries - 1) throw e;
      const wait = Math.pow(2, i) * 1000;
      console.log(`  Retry ${i + 1}/${retries} after ${wait}ms: ${urlPath}`);
      await sleep(wait);
    }
  }
}

function extractJSON(html) {
  const match = html.match(/__NEXT_DATA__[^>]*>(.*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Stage 1: Scrape list pages ──────────────────────────────
async function scrapeListPages() {
  // Use cache if available
  if (fs.existsSync(LIST_CACHE_FILE)) {
    console.log('[Stage 1] Loading cached vehicle list...');
    const cached = JSON.parse(fs.readFileSync(LIST_CACHE_FILE, 'utf-8'));
    console.log(`[Stage 1] Loaded ${cached.vehicles.length} vehicles from cache`);
    console.log(`[Stage 1] Total pages: ${cached.totalPages}, Total count: ${cached.totalCount}`);
    return cached;
  }

  console.log('[Stage 1] Scraping vehicle list pages...');
  const allVehicles = [];
  let totalPages = TOTAL_PAGES;
  let totalCount = 0;

  // Fetch first page to get metadata
  const firstHtml = await fetchWithRetry(LIST_PAGE + '1');
  const firstData = extractJSON(firstHtml);
  if (!firstData || !firstData.props.pageProps.vehicles) {
    throw new Error('Failed to parse first list page');
  }

  const pageProps = firstData.props.pageProps;
  totalPages = pageProps.totalPages || TOTAL_PAGES;
  totalCount = pageProps.totalCount || 0;
  allVehicles.push(...pageProps.vehicles);

  console.log(`[Stage 1] Page 1/${totalPages}: ${pageProps.vehicles.length} vehicles (total: ${totalCount})`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    await sleep(REQUEST_DELAY_MS);
    try {
      const html = await fetchWithRetry(LIST_PAGE + page);
      const data = extractJSON(html);
      if (data && data.props.pageProps.vehicles) {
        const vehicles = data.props.pageProps.vehicles;
        allVehicles.push(...vehicles);
        console.log(`[Stage 1] Page ${page}/${totalPages}: ${vehicles.length} vehicles`);
      }
    } catch (e) {
      console.error(`[Stage 1] Failed to fetch page ${page}: ${e.message}`);
    }
  }

  // Deduplicate by id
  const seen = new Set();
  const unique = allVehicles.filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });

  const result = {
    vehicles: unique,
    totalPages,
    totalCount
  };

  // Cache the list
  fs.writeFileSync(LIST_CACHE_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`[Stage 1] Done: ${unique.length} unique vehicles cached`);

  return result;
}

// ── Stage 2: Scrape detail pages ────────────────────────────
async function scrapeDetailPages(vehicleIds, resumeFrom = 0) {
  console.log(`[Stage 2] Scraping ${vehicleIds.length} detail pages (starting from index ${resumeFrom})...`);

  // Load existing progress if any
  let results = [];
  if (fs.existsSync(PROGRESS_FILE)) {
    results = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`[Stage 2] Loaded ${results.length} existing results from progress file`);
  }

  const doneIds = new Set(results.map(r => r.id));
  const remaining = vehicleIds.filter(v => !doneIds.has(v.id));

  console.log(`[Stage 2] ${results.length} done, ${remaining.length} remaining`);

  // Process in batches with concurrency
  let completed = results.length;
  const startIndex = Math.max(resumeFrom, results.length);

  // Limit to remaining
  const toProcess = vehicleIds.slice(startIndex);
  const batchSize = CONCURRENCY;

  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (vehicle) => {
        try {
          const html = await fetchWithRetry(DETAIL_PAGE + vehicle.id);
          const data = extractJSON(html);
          if (data && data.props.pageProps) {
            const pp = data.props.pageProps;
            return {
              id: vehicle.id,
              model_name: vehicle.model_name,
              vehicle: pp.vehicle || null,
              vehicleTags: pp.vehicleTags || null,
              liveries: pp.liveries || [],
              mods: pp.mods || [],
              descriptions: pp.descriptions || [],
              screenshots: pp.screenshots || [],
              recommendations: pp.recommendations || [],
              relatedVehicles: pp.relatedVehicles || [],
              realVehicleRefs: pp.realVehicleRefs || []
            };
          }
          return { id: vehicle.id, model_name: vehicle.model_name, error: 'No data found' };
        } catch (e) {
          return { id: vehicle.id, model_name: vehicle.model_name, error: e.message };
        }
      })
    );

    // Collect results
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
        completed++;
      } else {
        console.error(`  Batch error: ${r.reason}`);
      }
    }

    // Progress report
    const pct = ((completed / vehicleIds.length) * 100).toFixed(1);
    console.log(`[Stage 2] ${completed}/${vehicleIds.length} (${pct}%)`);

    // Save progress periodically
    if (completed % SAVE_INTERVAL === 0 || completed === vehicleIds.length) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2), 'utf-8');
    }

    // Rate limiting
    if (i + batchSize < toProcess.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Final save
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[Stage 2] Done: ${results.length} detail pages scraped`);

  return results;
}

// ── Finalize ────────────────────────────────────────────────
function finalize(detailResults) {
  // Flatten into clean vehicle objects
  const vehicles = detailResults.map(r => {
    const v = r.vehicle || {};
    const tags = r.vehicleTags || {};

    // Extract only true tags
    const activeTags = {};
    if (tags && typeof tags === 'object') {
      for (const [key, val] of Object.entries(tags)) {
        if (val === true || val === 1) activeTags[key] = true;
      }
    }

    return {
      // Basic identity
      id: r.id,
      model_name: v.model_name || r.model_name,
      name_sc: v.name_sc || '',
      name_tc: v.name_tc || '',
      name_en: v.name_en || '',
      name_pinyin: v.name_pinyin || '',
      name_pinyin_abbr: v.name_pinyin_abbr || '',

      // Classification
      manufacturer_name: v.manufacturer_name || '',
      manufacturer_en: v.manufacturer_en || '',
      class_name: v.class_name || '',
      dlc_name: v.dlc_name || '',
      dealer_name: v.dealer_name || '',
      drivetrain_name: v.drivetrain_name || '',

      // Pricing
      price: v.price || null,
      trade_price: v.trade_price || null,
      sell_price: v.sell_price || null,
      sell_price_modded: v.sell_price_modded || null,

      // Performance
      stat_speed: v.stat_speed || null,
      stat_acceleration: v.stat_acceleration || null,
      stat_braking: v.stat_braking || null,
      stat_handling: v.stat_handling || null,
      top_speed_tested: v.top_speed_tested || null,
      top_speed_game: v.top_speed_game || null,
      top_speed_hsw: v.top_speed_hsw || null,
      lap_time: v.lap_time || null,
      lap_time_hsw: v.lap_time_hsw || null,

      // Specs
      weight: v.weight || null,
      seats: v.seats || null,
      gears: v.gears || null,
      based_on: v.based_on || null,
      based_on_sc: v.based_on_sc || null,

      // Armor & protection
      armor_bh: v.armor_bh || null,
      armor_name: v.armor_name || null,
      er1: v.er1 || null,
      er2: v.er2 || null,
      er3: v.er3 || null,
      er4: v.er4 || null,
      er5: v.er5 || null,
      has_missile_protection: v.has_missile_protection || 0,

      // Upgrades
      has_drift_tune: v.has_drift_tune || 0,
      has_hao_upgrade: v.has_hao_upgrade || 0,
      has_imani_upgrade: v.has_imani_upgrade || 0,

      // Status
      is_removed: v.is_removed || 0,
      is_active: v.is_active || 0,
      release_date: v.release_date || null,

      // Tags (active boolean flags)
      tags: activeTags,

      // Rich content
      liveries: r.liveries || [],
      mods: r.mods || [],
      descriptions: r.descriptions || [],
      screenshots: r.screenshots || [],
      influence_text: v.influence_text_zh || '',

      // Media
      image_url: v.image_url || null,
      front_quarter_view: v.front_quarter_view || null,
      front_view: v.front_view || null,
      side_view: v.side_view || null,
      rear_view: v.rear_view || null,
      rear_quarter_view: v.rear_quarter_view || null,
      top_view: v.top_view || null,
      engine_bay: v.engine_bay || null,
      inside_view: v.inside_view || null,
      underside_image: v.underside_image || null,

      // Related
      recommendations: r.recommendations || [],
      related_vehicles: r.relatedVehicles || [],
      real_vehicle_refs: r.realVehicleRefs || []
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vehicles, null, 2), 'utf-8');
  console.log(`[Finalize] Written ${vehicles.length} vehicles to antwen_vehicles.json`);

  // Cleanup progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  return vehicles;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const detailOnly = args.includes('--detail-only');
  const doResume = args.includes('--resume');

  console.log('═══ antwen.cn Vehicle Scraper ═══');
  console.log('');

  try {
    let vehicleIds;

    if (detailOnly && fs.existsSync(LIST_CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(LIST_CACHE_FILE, 'utf-8'));
      vehicleIds = cached.vehicles;
    } else if (!detailOnly) {
      const listData = await scrapeListPages();
      vehicleIds = listData.vehicles;
    } else {
      console.error('--detail-only requires list cache. Run without --detail-only first.');
      process.exit(1);
    }

    console.log(`Total vehicles to scrape: ${vehicleIds.length}`);

    let resumeFrom = 0;
    if (doResume && fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      resumeFrom = progress.length;
    }

    const detailResults = await scrapeDetailPages(vehicleIds, resumeFrom);
    const vehicles = finalize(detailResults);

    // Stats
    const withArmor = vehicles.filter(v => v.armor_bh && v.armor_bh !== 20).length;
    const withLiveries = vehicles.filter(v => v.liveries.length > 1).length;
    const withMods = vehicles.filter(v => v.mods.length > 0).length;
    const withER = vehicles.filter(v => v.er1 !== null).length;
    const withTags = vehicles.filter(v => Object.keys(v.tags).length > 2).length;

    console.log('');
    console.log('═══ Summary ═══');
    console.log(`  Total vehicles:        ${vehicles.length}`);
    console.log(`  With armor data:       ${withArmor}`);
    console.log(`  With liveries:         ${withLiveries}`);
    console.log(`  With mods:             ${withMods}`);
    console.log(`  With explosion res:    ${withER}`);
    console.log(`  With active tags:      ${withTags}`);

  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

main();
