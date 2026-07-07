/* ===== Dexie Database Singleton ===== */
window.GTA = window.GTA || {};

GTA.db = (function () {
  var db = new Dexie('GTAVehicleTracker');

  // Schema version 1 (original)
  db.version(1).stores({
    ownedVehicles: '&vehicleId, addedAt',
    modifications: '++id, vehicleId, createdAt',
    garages: '++id, name, sortOrder, createdAt',
    garageVehicles: '++id, garageId, vehicleId, sortOrder',
    photos: '++id, vehicleId, uploadedAt, isCover',
    settings: '&key',
    customVehicles: '&id, brand, type, name'
  });

  // Schema version 2 — property slot system
  db.version(2).stores({
    ownedVehicles: '&vehicleId, addedAt',
    modifications: '++id, vehicleId, createdAt',
    garages: '++id, slotIndex, enabled, propertyName, propertyCategory, propertyType, slotCount, location, sortOrder, createdAt',
    garageVehicles: '++id, garageId, vehicleId, sortOrder',
    photos: '++id, vehicleId, uploadedAt, isCover',
    settings: '&key',
    customVehicles: '&id, brand, type, name'
  });

  // Schema version 3 — add floor field for multi-floor garages
  db.version(3).stores({
    ownedVehicles: '&vehicleId, addedAt',
    modifications: '++id, vehicleId, createdAt',
    garages: '++id, slotIndex, enabled, propertyName, propertyCategory, propertyType, slotCount, location, sortOrder, createdAt',
    garageVehicles: '++id, garageId, vehicleId, sortOrder',
    photos: '++id, vehicleId, uploadedAt, isCover',
    settings: '&key',
    customVehicles: '&id, brand, type, name'
  });

  // Cascade delete: remove photos and mods when vehicle is un-owned
  db.ownedVehicles.hook('deleting', function (primKey, obj, trans) {
    db.photos.where('vehicleId').equals(obj.vehicleId).delete();
    db.modifications.where('vehicleId').equals(obj.vehicleId).delete();
    db.garageVehicles.where('vehicleId').equals(obj.vehicleId).delete();
  });

  // Cascade delete: remove garageVehicles when garage is deleted
  db.garages.hook('deleting', function (primKey, obj, trans) {
    db.garageVehicles.where('garageId').equals(primKey).delete();
  });

  // Ensure db is open and ready
  var readyPromise = null;

  function ready() {
    if (!readyPromise) {
      readyPromise = db.open().then(function () {
        GTA.log('[DB] Database ready');
        GTA.EventBus.emit('db:ready');
        return db;
      }).catch(function (err) {
        console.error('[DB] Failed to open database:', err);
        throw err;
      });
    }
    return readyPromise;
  }

  return {
    get ownedVehicles() { return db.ownedVehicles; },
    get modifications() { return db.modifications; },
    get garages() { return db.garages; },
    get garageVehicles() { return db.garageVehicles; },
    get photos() { return db.photos; },
    get settings() { return db.settings; },
    get customVehicles() { return db.customVehicles; },
    ready: ready
  };
})();
