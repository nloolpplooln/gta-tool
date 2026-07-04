/* ===== Encyclopedia Page ===== */
window.GTA = window.GTA || {};

GTA.Encyclopedia = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var ownedSet = new Set();

  function init() {
    GTA.log('[Encyclopedia] Init');
    GTA.FilterBar.init(onFilterChange);
    loadOwnedSet().then(function () {
      renderCards();
    });
  }

  function destroy() {
    // Cleanup
  }

  async function loadOwnedSet() {
    try {
      await GTA.db.ready();
      var owned = await GTA.db.ownedVehicles.toArray();
      ownedSet.clear();
      owned.forEach(function (r) {
        if (Catalog.getById(r.vehicleId)) {
          ownedSet.add(r.vehicleId);
        }
      });
    } catch (e) {
      console.error('[Encyclopedia] Error loading owned:', e);
    }
  }

  function onFilterChange(filters) {
    renderCards(filters);
  }

  async function renderCards(filters) {
    // Ensure ownedSet is loaded before filtering
    await loadOwnedSet();

    var vehicles = Catalog.getAll();
    if (!filters) filters = GTA.FilterBar.getFilters();

    // Apply filters
    if (filters.search) {
      vehicles = vehicles.filter(function (v) {
        return (v.name || '').toLowerCase().indexOf(filters.search) !== -1 ||
               (v.brand || '').toLowerCase().indexOf(filters.search) !== -1;
      });
    }
    if (filters.brand) {
      vehicles = vehicles.filter(function (v) { return v.brand === filters.brand; });
    }
    if (filters.type) {
      vehicles = vehicles.filter(function (v) { return v.type === filters.type; });
    }
    if (filters.discontinued) {
      vehicles = vehicles.filter(function (v) { return Catalog.isDiscontinued(v.name); });
    }
    if (filters.owned === 'yes') {
      vehicles = vehicles.filter(function (v) { return ownedSet.has(v.id); });
    } else if (filters.owned === 'no') {
      vehicles = vehicles.filter(function (v) { return !ownedSet.has(v.id); });
    }

    // Update results count
    var countEl = document.getElementById('results-count');
    if (countEl) {
      countEl.textContent = '显示 ' + vehicles.length + ' / ' + Catalog.getCount() + ' 辆';
    }

    // Render grid
    var grid = document.getElementById('vehicle-grid');
    if (!grid) return;

    if (vehicles.length === 0) {
      grid.innerHTML = '<div class="no-results">没有找到匹配的载具</div>';
      return;
    }

    grid.innerHTML = '';
    vehicles.forEach(function (vehicle) {
      var isOwned = ownedSet.has(vehicle.id);
      var card = GTA.VehicleCard.render(vehicle, isOwned);
      grid.appendChild(card);
    });
  }

  // Listen for vehicle changes
  GTA.EventBus.on('vehicle:added', function () { renderCards(); });
  GTA.EventBus.on('vehicle:removed', function () { renderCards(); });
  GTA.EventBus.on('catalog:loaded', function () {
    GTA.FilterBar.refresh();
    renderCards();
  });
  GTA.EventBus.on('catalog:discontinued', function () {
    renderCards(); // Re-render to show discontinued badges
  });

  return { init: init, destroy: destroy };
})();
