/* ===== Supabase Data Sync Service ===== */
window.GTA = window.GTA || {};

GTA.SupabaseService = (function () {
  var sb = null;
  var uid = null;

  function init(userId) {
    sb = GTA.SupabaseConfig.init();
    uid = userId;
  }

  // ==================== VEHICLE SYNC ====================

  async function syncVehiclesToCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var owned = await GTA.db.ownedVehicles.toArray();
    if (owned.length === 0) return;

    var rows = owned.map(function (rec) {
      return {
        user_id: uid,
        vehicle_id: rec.vehicleId,
        added_at: rec.addedAt || Date.now(),
        synced_at: Date.now()
      };
    });

    var batchSize = 200;
    for (var i = 0; i < rows.length; i += batchSize) {
      var batch = rows.slice(i, i + batchSize);
      var result = await sb.from('owned_vehicles').upsert(batch, { onConflict: 'user_id,vehicle_id' });
      if (result.error) throw result.error;
    }

    GTA.log('[Supabase] Synced ' + owned.length + ' vehicles to cloud');
  }

  async function pullVehiclesFromCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var result = await sb.from('owned_vehicles').select('*').eq('user_id', uid);
    if (result.error) throw result.error;

    var cloudRecords = result.data || [];
    var localOwned = await GTA.db.ownedVehicles.toArray();
    var localMap = {};
    localOwned.forEach(function (r) { localMap[r.vehicleId] = r; });

    var merged = 0;
    for (var i = 0; i < cloudRecords.length; i++) {
      var cr = cloudRecords[i];
      var local = localMap[cr.vehicle_id];
      if (!local) {
        await GTA.db.ownedVehicles.put({ vehicleId: cr.vehicle_id, addedAt: cr.added_at || Date.now() });
        merged++;
      } else if (cr.synced_at && (!local.syncedAt || cr.synced_at > local.syncedAt)) {
        await GTA.db.ownedVehicles.put({ vehicleId: cr.vehicle_id, addedAt: cr.added_at || local.addedAt, syncedAt: cr.synced_at });
      }
    }

    GTA.log('[Supabase] Pulled ' + cloudRecords.length + ' vehicles, merged ' + merged + ' new');
  }

  // ==================== GARAGE SYNC ====================

  async function syncGaragesToCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var garages = await GTA.db.garages.toArray();
    if (garages.length === 0) return;

    // Remove cloud garages not in local
    var localIds = garages.map(function (g) { return g.id; });
    await sb.from('garages').delete().eq('user_id', uid).not('garage_id', 'in', '(' + localIds.join(',') + ')');

    var garageRows = garages.map(function (g) {
      return {
        user_id: uid,
        garage_id: g.id,
        name: g.name,
        sort_order: g.sortOrder || 0,
        created_at: g.createdAt || Date.now(),
        synced_at: Date.now()
      };
    });

    var batchSize = 100;
    for (var i = 0; i < garageRows.length; i += batchSize) {
      var batch = garageRows.slice(i, i + batchSize);
      var result = await sb.from('garages').upsert(batch, { onConflict: 'user_id,garage_id' });
      if (result.error) throw result.error;
    }

    // Sync vehicles in each garage
    for (var j = 0; j < garages.length; j++) {
      var g = garages[j];
      var gvRecords = await GTA.db.garageVehicles.where('garageId').equals(g.id).toArray();
      if (gvRecords.length === 0) continue;

      // Remove cloud garage vehicles not in local
      var localGvIds = gvRecords.map(function (r) { return r.id; });
      await sb.from('garage_vehicles').delete()
        .eq('user_id', uid).eq('garage_id', g.id)
        .not('id', 'in', '(' + localGvIds.join(',') + ')');

      var gvRows = gvRecords.map(function (gv) {
        return {
          user_id: uid,
          id: gv.id,
          garage_id: gv.garageId,
          vehicle_id: gv.vehicleId,
          sort_order: gv.sortOrder || 0,
          synced_at: Date.now()
        };
      });

      for (var k = 0; k < gvRows.length; k += batchSize) {
        var gvBatch = gvRows.slice(k, k + batchSize);
        var gvResult = await sb.from('garage_vehicles').upsert(gvBatch, { onConflict: 'id' });
        if (gvResult.error) throw gvResult.error;
      }
    }

    GTA.log('[Supabase] Synced ' + garages.length + ' garages to cloud');
  }

  async function pullGaragesFromCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var result = await sb.from('garages').select('*').eq('user_id', uid);
    if (result.error) throw result.error;

    var cloudGarages = result.data || [];
    for (var i = 0; i < cloudGarages.length; i++) {
      var cg = cloudGarages[i];
      var cid = cg.garage_id;
      if (!cid) continue;

      var existing = await GTA.db.garages.get(cid);
      if (existing) {
        if (cg.synced_at && (!existing.syncedAt || cg.synced_at > existing.syncedAt)) {
          await GTA.db.garages.update(cid, { name: cg.name, sortOrder: cg.sort_order || 0 });
        }
      } else {
        await GTA.db.garages.put({
          id: cid, name: cg.name, sortOrder: cg.sort_order || 0,
          createdAt: cg.created_at || Date.now()
        });
      }

      // Pull garage vehicles
      var gvResult = await sb.from('garage_vehicles').select('*').eq('user_id', uid).eq('garage_id', cid);
      if (gvResult.error) continue;

      var cloudGv = gvResult.data || [];
      var localGv = await GTA.db.garageVehicles.where('garageId').equals(cid).toArray();
      var localGvVids = new Set(localGv.map(function (r) { return r.vehicleId; }));

      for (var gvIdx = 0; gvIdx < cloudGv.length; gvIdx++) {
        var gvData = cloudGv[gvIdx];
        if (!localGvVids.has(gvData.vehicle_id)) {
          var exists = await GTA.db.garageVehicles.get(gvData.id);
          if (!exists) {
            await GTA.db.garageVehicles.put({
              id: gvData.id, garageId: cid, vehicleId: gvData.vehicle_id, sortOrder: gvData.sort_order || 0
            });
          }
        }
      }
    }

    GTA.log('[Supabase] Pulled ' + cloudGarages.length + ' garages from cloud');
  }

  // ==================== MODIFICATIONS SYNC ====================

  async function syncModificationsToCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var mods = await GTA.db.modifications.toArray();
    if (mods.length === 0) return;

    var rows = mods.map(function (mod) {
      return {
        user_id: uid,
        id: mod.id,
        vehicle_id: mod.vehicleId,
        parts: mod.parts || {},
        extra_cost: mod.extraCost || 0,
        total_cost: mod.totalCost || 0,
        created_at: mod.createdAt || Date.now(),
        synced_at: Date.now()
      };
    });

    var batchSize = 100;
    for (var i = 0; i < rows.length; i += batchSize) {
      var batch = rows.slice(i, i + batchSize);
      var result = await sb.from('modifications').upsert(batch, { onConflict: 'id' });
      if (result.error) throw result.error;
    }

    GTA.log('[Supabase] Synced ' + mods.length + ' modifications to cloud');
  }

  async function pullModificationsFromCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var result = await sb.from('modifications').select('*').eq('user_id', uid);
    if (result.error) throw result.error;

    var cloudMods = result.data || [];
    for (var i = 0; i < cloudMods.length; i++) {
      var cm = cloudMods[i];
      var existing = await GTA.db.modifications.get(cm.id);
      if (!existing) {
        await GTA.db.modifications.put({
          id: cm.id,
          vehicleId: cm.vehicle_id,
          parts: cm.parts || {},
          extraCost: cm.extra_cost || 0,
          totalCost: cm.total_cost || 0,
          createdAt: cm.created_at || Date.now()
        });
      } else if (cm.synced_at && (!existing.syncedAt || cm.synced_at > existing.syncedAt)) {
        await GTA.db.modifications.update(cm.id, {
          parts: cm.parts || {},
          extraCost: cm.extra_cost || 0,
          totalCost: cm.total_cost || 0
        });
      }
    }

    GTA.log('[Supabase] Pulled ' + cloudMods.length + ' modifications from cloud');
  }

  // ==================== CUSTOM VEHICLES SYNC ====================

  async function syncCustomVehiclesToCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var customVehicles = await GTA.db.customVehicles.toArray();
    if (customVehicles.length === 0) return;

    var rows = customVehicles.map(function (cv) {
      return {
        user_id: uid,
        id: cv.id,
        brand: cv.brand || '',
        type: cv.type || '',
        name: cv.name || '',
        price_buy: cv.price_buy || 0,
        seat: cv.seat || 0,
        image: cv.image || '',
        synced_at: Date.now()
      };
    });

    var batchSize = 100;
    for (var i = 0; i < rows.length; i += batchSize) {
      var batch = rows.slice(i, i + batchSize);
      var result = await sb.from('custom_vehicles').upsert(batch, { onConflict: 'id' });
      if (result.error) throw result.error;
    }

    GTA.log('[Supabase] Synced ' + customVehicles.length + ' custom vehicles to cloud');
  }

  async function pullCustomVehiclesFromCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var result = await sb.from('custom_vehicles').select('*').eq('user_id', uid);
    if (result.error) throw result.error;

    var cloudCVs = result.data || [];
    for (var i = 0; i < cloudCVs.length; i++) {
      var ccv = cloudCVs[i];
      var existing = await GTA.db.customVehicles.get(ccv.id);
      if (!existing) {
        await GTA.db.customVehicles.put({
          id: ccv.id,
          brand: ccv.brand || '',
          type: ccv.type || '',
          name: ccv.name || '',
          price_buy: ccv.price_buy || 0,
          seat: ccv.seat || 0,
          image: ccv.image || ''
        });
      }
    }

    GTA.log('[Supabase] Pulled ' + cloudCVs.length + ' custom vehicles from cloud');
  }

  // ==================== PROFILE SYNC ====================

  async function syncProfileToCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var fields = ['steamDisplayName', 'steamAvatar', 'rstarAvatar', 'rstarNickname', 'playerName'];
    var rows = [];
    for (var i = 0; i < fields.length; i++) {
      var rec = await GTA.db.settings.get(fields[i]);
      if (rec && rec.value) {
        rows.push({
          user_id: uid,
          key: fields[i],
          value: rec.value,
          updated_at: Date.now()
        });
      }
    }
    if (rows.length === 0) return;

    var result = await sb.from('profiles').upsert(rows, { onConflict: 'user_id,key' });
    if (result.error) throw result.error;

    GTA.log('[Supabase] Synced profile to cloud');
  }

  async function pullProfileFromCloud() {
    if (!uid || !sb) return;
    await GTA.db.ready();

    var result = await sb.from('profiles').select('*').eq('user_id', uid);
    if (result.error) throw result.error;

    var data = result.data || [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row.key && row.value) {
        var existing = await GTA.db.settings.get(row.key);
        if (!existing) {
          await GTA.db.settings.put({ key: row.key, value: row.value });
        }
      }
    }

    // Notify UI to refresh
    var profileData = {};
    data.forEach(function (d) { profileData[d.key] = d.value; });
    GTA.EventBus.emit('profile:pulled', profileData);
    GTA.log('[Supabase] Pulled profile from cloud');
  }

  // ==================== EVENT LISTENERS ====================

  GTA.EventBus.on('auth:changed', function (user) {
    if (user) {
      init(user.uid);
      GTA.EventBus.emit('sync:ready');
    } else {
      uid = null;
      sb = null;
    }
  });

  // ==================== PUBLIC API ====================

  async function upload() {
    if (!uid) { GTA.Toast.error('请先登录'); return; }
    try {
      GTA.EventBus.emit('sync:loading', { action: 'upload', status: 'started' });
      await Promise.all([
        syncVehiclesToCloud(),
        syncGaragesToCloud(),
        syncProfileToCloud(),
        syncModificationsToCloud(),
        syncCustomVehiclesToCloud()
      ]);
      GTA.EventBus.emit('sync:loading', { action: 'upload', status: 'done' });
      GTA.Toast.success('已上传到云端');
      GTA.EventBus.emit('sync:upload:done');
    } catch (e) {
      GTA.EventBus.emit('sync:loading', { action: 'upload', status: 'error' });
      GTA.Toast.error('上传失败：' + (e.message || '未知错误'));
    }
  }

  async function download() {
    if (!uid) { GTA.Toast.error('请先登录'); return; }
    try {
      GTA.EventBus.emit('sync:loading', { action: 'download', status: 'started' });
      await Promise.all([
        pullVehiclesFromCloud(),
        pullGaragesFromCloud(),
        pullProfileFromCloud(),
        pullModificationsFromCloud(),
        pullCustomVehiclesFromCloud()
      ]);
      GTA.EventBus.emit('sync:loading', { action: 'download', status: 'done' });
      GTA.Toast.success('已从云端下载并合并');
      GTA.EventBus.emit('sync:download:done');
      GTA.EventBus.emit('vehicle:changed');
      GTA.EventBus.emit('garage:changed', {});
    } catch (e) {
      GTA.EventBus.emit('sync:loading', { action: 'download', status: 'error' });
      GTA.Toast.error('下载失败：' + (e.message || '未知错误'));
    }
  }

  return {
    init: init,
    upload: upload,
    download: download,
    isLoggedIn: function () { return !!uid; }
  };
})();
