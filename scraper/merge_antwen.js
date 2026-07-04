/**
 * Merge antwen_vehicles.json data into existing vehicles.json
 *
 * Matches by model_name (case-insensitive).
 * Adds new fields: armor, tags, liveries, mods, explosion resistance, etc.
 * Also adds new vehicles not present in existing data.
 */

const fs = require('fs');
const path = require('path');

const VEHICLES_FILE = path.join(__dirname, '..', 'vehicles.json');
const ANTWEN_FILE = path.join(__dirname, '..', 'antwen_vehicles.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'vehicles_merged.json');

// ── Load data ───────────────────────────────────────────────
console.log('Loading data...');
const existing = JSON.parse(fs.readFileSync(VEHICLES_FILE, 'utf-8'));
const antwen = JSON.parse(fs.readFileSync(ANTWEN_FILE, 'utf-8'));

console.log(`Existing vehicles: ${existing.length}`);
console.log(`Antwen vehicles:  ${antwen.length}`);

// ── Build lookup ────────────────────────────────────────────
const antwenByModel = new Map();
for (const av of antwen) {
  if (av.model_name) {
    const key = av.model_name.toLowerCase();
    antwenByModel.set(key, av);
  }
}

// ── Merge ───────────────────────────────────────────────────
let matched = 0;
let unmatched = 0;
let enrichedFields = 0;

const merged = existing.map(ev => {
  const key = (ev.model_name || '').toLowerCase();
  const av = antwenByModel.get(key);

  if (!av) {
    unmatched++;
    return ev; // Keep as-is
  }

  matched++;

  // Build enriched vehicle object
  const enriched = { ...ev };

  // ── Armor data ──
  if (av.armor_bh && !ev.armor) {
    enriched.armor = {
      id: av.armor_bh,
      name: av.armor_name || ''
    };
    enrichedFields++;
  }

  // ── Explosion resistance ──
  if (av.er1 !== null || av.er2 !== null || av.er3 !== null || av.er4 !== null || av.er5 !== null) {
    enriched.explosion_resistance = {
      er1: av.er1,
      er2: av.er2,
      er3: av.er3,
      er4: av.er4,
      er5: av.er5
    };
    enrichedFields++;
  }

  // ── Tags ──
  if (av.tags && Object.keys(av.tags).length > 0) {
    // Merge with existing imani_tech flag if applicable
    enriched.tags = av.tags;
    enrichedFields++;
  }

  // ── Liveries ──
  if (av.liveries && av.liveries.length > 1) {
    enriched.liveries = av.liveries.map(l => ({
      name: l.livery_name || '',
      index: l.livery_idx || 0,
      price: l.price || 0,
      image: l.link || ''
    }));
    enrichedFields++;
  }

  // ── Modifications ──
  if (av.mods && av.mods.length > 0) {
    // Group mods by category
    const modGroups = {};
    for (const mod of av.mods) {
      const cat = mod.category_sc || '其他';
      if (!modGroups[cat]) modGroups[cat] = [];
      modGroups[cat].push({
        name: mod.mod_name_sc || '',
        sub_category: mod.sub_category_sc || null,
        price: mod.price || 0,
        price_unlock: mod.price_unlock || 0,
        image: mod.r2_link || null
      });
    }
    enriched.modifications = modGroups;
    enrichedFields++;
  }

  // ── Description (prefer antwen if existing has none) ──
  if (!ev.description && av.descriptions && av.descriptions.length > 0) {
    enriched.description = av.descriptions[0].description || '';
    enrichedFields++;
  }

  // ── Real car reference ──
  if (av.based_on && !ev.based_on) {
    enriched.based_on = av.based_on.trim();
    if (av.based_on_sc) enriched.based_on_sc = av.based_on_sc;
    enrichedFields++;
  }

  // ── Screenshots ──
  if (av.screenshots && av.screenshots.length > 0 && !ev.screenshots) {
    enriched.screenshots = {
      front_quarter: av.front_quarter_view || null,
      front: av.front_view || null,
      side: av.side_view || null,
      rear: av.rear_view || null,
      rear_quarter: av.rear_quarter_view || null,
      top: av.top_view || null,
      engine: av.engine_bay || null,
      inside: av.inside_view || null,
      underside: av.underside_image || null
    };
    enrichedFields++;
  }

  // ── Related vehicles ──
  if (av.recommendations && av.recommendations.length > 0 && !ev.recommendations) {
    enriched.recommendations = av.recommendations.map(r => ({
      id: r.id,
      model_name: r.model_name,
      name_sc: r.name_sc,
      name_en: r.name_en,
      price: r.price,
      image_url: r.image_url
    }));
    enrichedFields++;
  }

  // ── Fix / supplement basic fields ──
  if (!ev.name && av.name_sc) enriched.name = av.name_sc;
  if (!ev._detail) enriched._detail = {};
  if (!ev._detail.name_eng && av.name_en) enriched._detail.name_eng = av.name_en;
  if (!ev._detail.name_zht && av.name_tc) enriched._detail.name_zht = av.name_tc;
  if (av.name_pinyin) enriched._detail.name_pinyin = av.name_pinyin;
  if (av.name_pinyin_abbr) enriched._detail.name_pinyin_abbr = av.name_pinyin_abbr;

  // Supplement manufacturer
  if ((!ev.brand || ev.brand === '未知') && av.manufacturer_name) {
    enriched.brand = av.manufacturer_name;
  }

  // Fix price if missing
  if (!ev.price_buy && av.price) {
    enriched.price_buy = typeof av.price === 'string' ? parseInt(av.price) : av.price;
  }

  // Performance data (prefer antwen if existing stat is 0 or missing)
  if (av.stat_speed && (!ev.performance || !ev.performance.speed)) {
    if (!enriched.performance) enriched.performance = {};
    enriched.performance.speed = parseFloat(av.stat_speed) || 0;
    enriched.performance.acceleration = parseFloat(av.stat_acceleration) || 0;
    enriched.performance.braking = parseFloat(av.stat_braking) || 0;
    enriched.performance.handling = parseFloat(av.stat_handling) || 0;
  }

  // Specs supplement
  if (!enriched.specs) enriched.specs = {};
  if (av.top_speed_tested && !enriched.specs.top_speed_raw) {
    enriched.specs.top_speed_raw = av.top_speed_tested + ' km/h';
  }
  if (av.top_speed_game && !enriched.specs.top_speed) {
    enriched.specs.top_speed = av.top_speed_game + ' km/h';
  }
  if (av.lap_time && !enriched.specs.lap_time) {
    enriched.specs.lap_time = av.lap_time.trim();
  }

  // Flags
  if (av.has_missile_protection && !enriched.missile_protection) {
    enriched.missile_protection = true;
  }
  if (av.has_drift_tune && !enriched.drift_tune) {
    enriched.drift_tune = true;
  }
  if (av.has_hao_upgrade && !enriched.hao_upgrade) {
    enriched.hao_upgrade = true;
  }

  return enriched;
});

// ── Add new vehicles not in existing data ──
const existingModels = new Set(existing.map(v => (v.model_name || '').toLowerCase()));
const newVehicles = [];

for (const av of antwen) {
  const key = (av.model_name || '').toLowerCase();
  if (!existingModels.has(key) && key) {
    const nv = {
      id: (av.name_sc || av.name_en || '').replace(/\s+/g, '_').toLowerCase(),
      name: av.name_sc || av.name_en || '',
      model_name: av.model_name,
      brand: av.manufacturer_name || '',
      type: av.class_name || '',
      rarity: 'Common',
      price_buy: av.price ? (typeof av.price === 'string' ? parseInt(av.price) : av.price) : 0,
      seats: parseInt(av.seats) || 0,
      dlc: av.dlc_name || '',
      performance: {
        speed: parseFloat(av.stat_speed) || 0,
        acceleration: parseFloat(av.stat_acceleration) || 0,
        handling: parseFloat(av.stat_handling) || 0,
        braking: parseFloat(av.stat_braking) || 0
      },
      specs: {
        weight: av.weight || 0,
        drive: av.drivetrain_name || '',
        top_speed: av.top_speed_game || '',
        top_speed_raw: av.top_speed_tested || '',
        lap_time: (av.lap_time || '').trim()
      },
      armor: av.armor_bh ? { id: av.armor_bh, name: av.armor_name } : null,
      tags: av.tags || {},
      liveries: (av.liveries || []).filter(l => l.livery_name !== '无').map(l => ({
        name: l.livery_name,
        index: l.livery_idx,
        price: l.price,
        image: l.link
      })),
      modifications: av.mods && av.mods.length > 0 ? groupMods(av.mods) : null,
      description: av.descriptions && av.descriptions.length > 0 ? av.descriptions[0].description : '',
      based_on: av.based_on ? av.based_on.trim() : '',
      _detail: {
        name_eng: av.name_en || '',
        name_zht: av.name_tc || '',
        name_pinyin: av.name_pinyin || ''
      },
      _source: 'antwen.cn'
    };

    // Clean up null/empty fields
    for (const [key, val] of Object.entries(nv)) {
      if (val === null || val === '' || val === undefined) {
        delete nv[key];
      }
    }

    newVehicles.push(nv);
  }
}

function groupMods(mods) {
  const groups = {};
  for (const mod of mods) {
    const cat = mod.category_sc || '其他';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({
      name: mod.mod_name_sc || '',
      sub_category: mod.sub_category_sc || null,
      price: mod.price || 0,
      price_unlock: mod.price_unlock || 0,
      image: mod.r2_link || null
    });
  }
  return groups;
}

console.log(`New vehicles from antwen: ${newVehicles.length}`);
const final = merged.concat(newVehicles);

// ── Save ────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(final, null, 2), 'utf-8');

// ── Stats ───────────────────────────────────────────────────
const withArmor = final.filter(v => v.armor).length;
const withTags = final.filter(v => v.tags && Object.keys(v.tags).length > 0).length;
const withLiveries = final.filter(v => v.liveries && v.liveries.length > 0).length;
const withMods = final.filter(v => v.modifications && Object.keys(v.modifications).length > 0).length;
const withER = final.filter(v => v.explosion_resistance).length;
const withBasedOn = final.filter(v => v.based_on).length;

console.log('');
console.log('═══ Merge Summary ═══');
console.log(`  Existing vehicles:     ${existing.length}`);
console.log(`  Matched & enriched:    ${matched}`);
console.log(`  Not matched:           ${unmatched}`);
console.log(`  New vehicles added:    ${newVehicles.length}`);
console.log(`  Total after merge:     ${final.length}`);
console.log(`  Fields enriched:       ${enrichedFields}`);
console.log('');
console.log('  With armor data:       ' + withArmor);
console.log('  With tags:             ' + withTags);
console.log('  With liveries:         ' + withLiveries);
console.log('  With modifications:    ' + withMods);
console.log('  With explosion res:    ' + withER);
console.log('  With real car ref:     ' + withBasedOn);
console.log('');
console.log(`Written to: ${OUTPUT_FILE}`);
