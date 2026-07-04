/* ===== Vehicle Catalog Loader ===== */
window.GTA = window.GTA || {};

GTA.VehicleCatalog = (function () {
  var catalogMap = new Map();   // Map<id, vehicle>
  var catalogArray = [];         // Array of all vehicles
  var brands = new Set();
  var types = new Set();
  var loaded = false;
  var discontinuedSet = new Set(); // Discontinued vehicle names from Xiaoheihe

  /**
   * Load vehicles from vehicles.json and merge with customVehicles from Dexie
   */
  async function load() {
    try {
      // Fetch built-in vehicles
      var response = await fetch('../../vehicles.json');
      if (!response.ok) {
        throw new Error('Failed to load vehicles.json: ' + response.status);
      }
      var builtIn = await response.json();

      // Load custom vehicles from IndexedDB
      await GTA.db.ready();
      var customVehicles = await GTA.db.customVehicles.toArray();

      // Merge into catalog
      var allVehicles = builtIn.concat(customVehicles);
      rebuildIndex(allVehicles);
      loaded = true;

      GTA.log('[Catalog] Loaded ' + allVehicles.length + ' vehicles (' + builtIn.length + ' built-in, ' + customVehicles.length + ' custom)');
      GTA.EventBus.emit('catalog:loaded', { count: allVehicles.length });

      // Load discontinued list in background (don't block catalog ready)
      loadDiscontinued();

      return allVehicles;
    } catch (err) {
      console.error('[Catalog] Load error:', err);
      throw err;
    }
  }

  function rebuildIndex(vehicles) {
    catalogMap.clear();
    catalogArray = [];
    brands.clear();
    types.clear();

    vehicles.forEach(function (v) {
      catalogMap.set(v.id, v);
      catalogArray.push(v);
      if (v.brand) brands.add(v.brand);
      if (v.type) types.add(v.type);
    });

    // Sort by brand then name (defensive against null/undefined)
    catalogArray.sort(function (a, b) {
      var brandA = a.brand || '';
      var brandB = b.brand || '';
      var nameA = a.name || '';
      var nameB = b.name || '';
      if (brandA !== brandB) return brandA.localeCompare(brandB);
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Reload catalog (e.g. after adding custom vehicles)
   */
  async function reload() {
    await GTA.db.ready();
    var customVehicles = await GTA.db.customVehicles.toArray();
    // Re-fetch built-in (or use existing)
    var response = await fetch('../../vehicles.json');
    var builtIn = await response.json();
    rebuildIndex(builtIn.concat(customVehicles));
    GTA.log('[Catalog] Reloaded: ' + catalogArray.length + ' vehicles');
  }

  function getById(id) {
    return catalogMap.get(id) || null;
  }

  function getAll() {
    return catalogArray;
  }

  function getByBrand(brand) {
    return catalogArray.filter(function (v) { return v.brand === brand; });
  }

  function getByType(type) {
    return catalogArray.filter(function (v) { return v.type === type; });
  }

  function getBrands() {
    return Array.from(brands).sort();
  }

  function getTypes() {
    return Array.from(types).sort();
  }

  function getCount() {
    return catalogArray.length;
  }

  function isLoaded() {
    return loaded;
  }

  /**
   * Search vehicles by name (case-insensitive partial match)
   */
  function search(query) {
    if (!query || !query.trim()) return catalogArray;
    var q = query.toLowerCase().trim();
    return catalogArray.filter(function (v) {
      return (v.name || '').toLowerCase().indexOf(q) !== -1 ||
             (v.brand || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  async function loadDiscontinued() {
    try {
      var resp = await fetch('/api/xiaoheihe/discontinued');
      if (resp.ok) {
        var data = await resp.json();
        if (data.discontinued) {
          discontinuedSet = new Set(data.discontinued);
          GTA.log('[Catalog] Discontinued list: ' + discontinuedSet.size + ' vehicles');
          GTA.EventBus.emit('catalog:discontinued', { count: discontinuedSet.size });
        }
      }
    } catch (e) {
      console.warn('[Catalog] Failed to load discontinued list:', e.message);
    }
  }

  function isDiscontinued(name) {
    if (discontinuedSet.size === 0) return false;
    return discontinuedSet.has(name);
  }

  return {
    load: load,
    reload: reload,
    getById: getById,
    getAll: getAll,
    getByBrand: getByBrand,
    getByType: getByType,
    getBrands: getBrands,
    getTypes: getTypes,
    getCount: getCount,
    isLoaded: isLoaded,
    search: search,
    isDiscontinued: isDiscontinued
  };
})();
