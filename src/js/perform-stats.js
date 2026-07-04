/* ===== Performance Statistics Calculator ===== */
window.GTA = window.GTA || {};

GTA.Stats = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;

  /**
   * Calculate total modification cost for owned vehicles
   */
  async function calcModsValue(ownedVehicleIds) {
    if (!ownedVehicleIds || ownedVehicleIds.length === 0) return 0;
    try {
      var modsTotal = 0;
      for (var i = 0; i < ownedVehicleIds.length; i++) {
        var vid = typeof ownedVehicleIds[i] === 'string' ? ownedVehicleIds[i] : ownedVehicleIds[i].vehicleId;
        var records = await GTA.db.modifications.where('vehicleId').equals(vid).toArray();
        records.forEach(function (r) {
          modsTotal += (r.data && r.data.cost) || 0;
        });
      }
      return modsTotal;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Calculate total value of owned vehicles
   */
  function calcTotalValue(ownedVehicleIds) {
    if (!ownedVehicleIds || ownedVehicleIds.length === 0) return 0;

    var total = 0;
    ownedVehicleIds.forEach(function (ownRec) {
      var vehicleId = typeof ownRec === 'string' ? ownRec : ownRec.vehicleId;
      var vehicle = Catalog.getById(vehicleId);
      if (vehicle) {
        total += vehicle.price_buy || 0;
      }
    });
    return total;
  }

  /**
   * Count owned vehicles that are discontinued
   */
  function countDiscontinued(ownedVehicleIds) {
    if (!ownedVehicleIds) return 0;
    var count = 0;
    ownedVehicleIds.forEach(function (ownRec) {
      var vehicleId = typeof ownRec === 'string' ? ownRec : ownRec.vehicleId;
      var vehicle = Catalog.getById(vehicleId);
      if (vehicle && Catalog.isDiscontinued(vehicle.name)) {
        count++;
      }
    });
    return count;
  }

  /**
   * Count vehicles added this month
   */
  function countNewThisMonth(ownedVehicles) {
    if (!ownedVehicles) return 0;

    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    var count = 0;
    ownedVehicles.forEach(function (r) {
      if (r.addedAt && r.addedAt >= monthStart) {
        count++;
      }
    });
    return count;
  }

  /**
   * Calculate star rating (1-5) based on collection completeness
   */
  function calcRating(ownedVehicleIds) {
    if (!ownedVehicleIds || ownedVehicleIds.length === 0) return 0;

    var total = Catalog.getCount();
    if (total === 0) return 0;

    var owned = ownedVehicleIds.length;
    var ratio = owned / total;

    var score = ratio * 5; // 0-5 scale
    return Math.round(Utils.clamp(score, 0, 5));
  }

  /**
   * Get recently added vehicles (newest N)
   */
  function getRecentAdditions(ownedVehicles, limit) {
    if (!limit) limit = 5;
    if (!ownedVehicles) return [];

    return ownedVehicles
      .slice()
      .sort(function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); })
      .slice(0, limit);
  }

  /**
   * Get all stats needed for dashboard
   */
  async function getDashboardStats() {
    await GTA.db.ready();

    var owned = await GTA.db.ownedVehicles.toArray();
    // Only count vehicles that exist in the catalog
    var validOwned = owned.filter(function (r) {
      return Catalog.getById(r.vehicleId) !== undefined;
    });
    var total = Catalog.getCount();

    var vehicleValue = calcTotalValue(validOwned);
    var modsValue = await calcModsValue(validOwned);

    return {
      ownedCount: validOwned.length,
      totalCount: total,
      totalValue: vehicleValue + modsValue,
      vehicleValue: vehicleValue,
      modsValue: modsValue,
      discontinuedCount: countDiscontinued(validOwned),
      newThisMonth: countNewThisMonth(validOwned),
      rating: calcRating(validOwned),
      recentAdditions: getRecentAdditions(validOwned, 5)
    };
  }

  return {
    calcTotalValue: calcTotalValue,
    calcModsValue: calcModsValue,
    countDiscontinued: countDiscontinued,
    countNewThisMonth: countNewThisMonth,
    calcRating: calcRating,
    getRecentAdditions: getRecentAdditions,
    getDashboardStats: getDashboardStats
  };
})();
