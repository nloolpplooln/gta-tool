/* ===== My Garage Page ===== */
window.GTA = window.GTA || {};

GTA.Garage = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var currentGarageId = null;
  var garages = [];
  var highlightVehicleId = null;

  // Drag state flags (browsers hide custom MIME types during dragover)
  var dragState = {
    type: null,        // 'tab' | 'vehicle' | null
    sourceGarageId: null,
    vehicleId: null,
    recordId: null
  };

  // Click vs drag tracking
  var clickTrack = { startX: 0, startY: 0, moved: false };

  function init(params) {
    GTA.log('[Garage] Init');
    loadGarages().then(function () {
      if (params && params.id) {
        var gid = parseInt(params.id);
        var found = garages.find(function (g) { return g.id === gid; });
        if (found) currentGarageId = gid;
      }
      if (!currentGarageId && garages.length > 0) {
        currentGarageId = garages[0].id;
      }
      renderSidebar();
      renderGarageContent();
    });

    document.getElementById('btn-add-garage').addEventListener('click', showAddGarageModal);

    // Global search
    var searchInput = document.getElementById('garage-search-input');
    if (searchInput) {
      var debouncedSearch = Utils.debounce(function () {
        var term = searchInput.value.trim();
        if (term) {
          performGlobalSearch(term);
        } else {
          hideSearchResults();
        }
      }, 200);

      searchInput.addEventListener('input', debouncedSearch);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          this.value = '';
          hideSearchResults();
        }
      });
      searchInput.addEventListener('focus', function () {
        if (this.value.trim()) {
          performGlobalSearch(this.value.trim());
        }
      });
    }

    // Click outside to close search panel
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#garage-global-search')) {
        hideSearchResults();
      }
    });
  }

  function destroy() {}

  async function loadGarages() {
    await GTA.db.ready();
    garages = await GTA.db.garages.orderBy('sortOrder').toArray();
    if (garages.length === 0) {
      var id = await GTA.db.garages.add({
        name: '默认车库',
        sortOrder: 0,
        createdAt: Date.now()
      });
      garages = [{ id: id, name: '默认车库', sortOrder: 0, createdAt: Date.now() }];
    }
  }

  // ==================== SIDEBAR RENDERING ====================

  function renderSidebar() {
    var listContainer = document.getElementById('garage-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    garages.forEach(function (g) {
      var item = document.createElement('div');
      item.className = 'garage-sidebar-item' + (g.id === currentGarageId ? ' active' : '');
      item.setAttribute('draggable', 'true');
      item.setAttribute('data-garage-id', g.id);
      item.title = '拖拽排序 · 也可拖入车辆';

      item.innerHTML = '<span class="sidebar-drag-handle">⋮⋮</span>' +
        '<span class="sidebar-item-name">' + Utils.escapeHtml(g.name) + '</span>' +
        '<span class="sidebar-item-count">0</span>';

      // Click to switch garage
      item.addEventListener('click', function (e) {
        if (item.classList.contains('sidebar-just-dropped')) {
          item.classList.remove('sidebar-just-dropped');
          return;
        }
        if (e.target.closest('.sidebar-drag-handle')) return;
        currentGarageId = g.id;
        clearSearchInput();
        renderSidebar();
        renderGarageContent();
        GTA.Router.navigate('garage/' + g.id);
      });

      // --- Sidebar item drag: start ---
      item.addEventListener('dragstart', function (e) {
        if (dragState.type === 'vehicle') return;
        dragState.type = 'tab';
        e.dataTransfer.setData('text/plain', g.id.toString());
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(function () { item.classList.add('sidebar-dragging'); }, 0);
      });

      // --- Sidebar item drag: end ---
      item.addEventListener('dragend', function (e) {
        item.classList.remove('sidebar-dragging');
        clearSidebarHighlights();
        dragState.type = null;
      });

      // --- Sidebar item: dragover ---
      item.addEventListener('dragover', function (e) {
        e.preventDefault();

        if (dragState.type === 'tab') {
          if (item.classList.contains('sidebar-dragging')) return;
          e.dataTransfer.dropEffect = 'move';
          clearSidebarHighlights();
          var rect = item.getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            item.classList.add('sidebar-drag-above');
          } else {
            item.classList.add('sidebar-drag-below');
          }
        } else if (dragState.type === 'vehicle') {
          e.dataTransfer.dropEffect = 'move';
          if (g.id !== dragState.sourceGarageId) {
            item.classList.add('sidebar-drop-target');
          }
        }
      });

      // --- Sidebar item: drag leave ---
      item.addEventListener('dragleave', function (e) {
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove('sidebar-drag-above', 'sidebar-drag-below', 'sidebar-drop-target');
        }
      });

      // --- Sidebar item: drop ---
      item.addEventListener('drop', async function (e) {
        e.preventDefault();
        item.classList.add('sidebar-just-dropped');
        clearSidebarHighlights();

        if (dragState.type === 'vehicle') {
          var targetGarageId = g.id;
          if (targetGarageId !== dragState.sourceGarageId) {
            try {
              await moveVehicleToGarage(dragState.recordId, dragState.vehicleId, dragState.sourceGarageId, targetGarageId);
              GTA.Toast.success('已移动到「' + getGarageName(targetGarageId) + '」');
            } catch (err) {
              console.error('[Garage] Cross-garage move error:', err);
              GTA.Toast.error('移动失败');
            }
          }
          dragState.type = null;
          return;
        }

        if (dragState.type === 'tab') {
          var draggedId = parseInt(e.dataTransfer.getData('text/plain'));
          if (!draggedId || draggedId === g.id) { dragState.type = null; return; }

          var rect = item.getBoundingClientRect();
          var insertBefore = e.clientY < rect.top + rect.height / 2;
          await reorderGarages(draggedId, g.id, insertBefore);
          dragState.type = null;
        }
      });

      listContainer.appendChild(item);
    });

    updateSidebarCounts();
  }

  function clearSidebarHighlights() {
    document.querySelectorAll('.garage-sidebar-item').forEach(function (item) {
      item.classList.remove('sidebar-drag-above', 'sidebar-drag-below', 'sidebar-drop-target', 'sidebar-potential-target');
    });
  }

  function getGarageName(gid) {
    var g = garages.find(function (x) { return x.id === gid; });
    return g ? g.name : null;
  }

  async function reorderGarages(draggedId, targetId, insertBefore) {
    var ordered = garages.map(function (g) { return g.id; });
    var dragIdx = ordered.indexOf(draggedId);
    if (dragIdx === -1) return;
    ordered.splice(dragIdx, 1);
    var targetIdx = ordered.indexOf(targetId);
    if (targetIdx === -1) return;
    if (!insertBefore) targetIdx++;
    ordered.splice(targetIdx, 0, draggedId);

    for (var i = 0; i < ordered.length; i++) {
      await GTA.db.garages.update(ordered[i], { sortOrder: i });
    }
    await loadGarages();
    renderSidebar();
    renderGarageContent();
    GTA.EventBus.emit('garage:changed', {});
  }

  async function moveVehicleToGarage(recordId, vehicleId, fromGarageId, toGarageId) {
    var targetVehicles = await GTA.db.garageVehicles.where('garageId').equals(toGarageId).toArray();
    var maxSort = targetVehicles.length > 0
      ? Math.max.apply(null, targetVehicles.map(function (r) { return r.sortOrder || 0; }))
      : -1;
    await GTA.db.garageVehicles.update(recordId, {
      garageId: toGarageId,
      sortOrder: maxSort + 1
    });
    renderGarageContent();
    GTA.EventBus.emit('garage:changed', { garageId: fromGarageId });
    GTA.EventBus.emit('garage:changed', { garageId: toGarageId });
  }

  // ==================== SIDEBAR COUNTS ====================

  async function updateSidebarCounts() {
    var items = document.querySelectorAll('.garage-sidebar-item');
    for (var i = 0; i < items.length; i++) {
      if (garages[i]) {
        var count = await GTA.db.garageVehicles.where('garageId').equals(garages[i].id).count();
        var countSpan = items[i].querySelector('.sidebar-item-count');
        if (countSpan) countSpan.textContent = count;
      }
    }
  }

  // ==================== GARAGE CONTENT ====================

  async function renderGarageContent() {
    var content = document.getElementById('garage-content');
    if (!content) return;

    var garage = garages.find(function (g) { return g.id === currentGarageId; });
    if (!garage) {
      content.innerHTML = '<div class="garage-empty"><p>请先创建车库</p></div>';
      return;
    }

    var gvRecords = await GTA.db.garageVehicles
      .where('garageId')
      .equals(currentGarageId)
      .sortBy('sortOrder');

    var vehiclesInGarage = [];
    gvRecords.forEach(function (rec) {
      var vehicle = Catalog.getById(rec.vehicleId);
      if (vehicle) {
        vehiclesInGarage.push({ record: rec, vehicle: vehicle });
      }
    });

    var totalInGarage = vehiclesInGarage.length;

    content.innerHTML =
      '<div class="garage-content-header">' +
        '<div>' +
          '<span class="garage-name-display">' + Utils.escapeHtml(garage.name) + '</span>' +
          '<span class="garage-count-display">' + totalInGarage + ' 辆</span>' +
        '</div>' +
        '<div class="garage-actions">' +
          '<button class="btn btn-secondary btn-sm" id="btn-rename-garage">重命名</button>' +
          '<button class="btn btn-secondary btn-sm" id="btn-add-to-garage">+ 添加载具</button>' +
          (garages.length > 1 ? '<button class="btn btn-danger btn-sm" id="btn-delete-garage">删除车库</button>' : '') +
        '</div>' +
      '</div>';

    if (vehiclesInGarage.length === 0) {
      content.innerHTML +=
        '<div class="garage-empty">' +
          '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 45l45-35 45 35v55a10 10 0 01-10 10H25a10 10 0 01-10-10z"/><polyline points="45 110 45 60 75 60 75 110"/></svg>' +
          '<p>此车库为空</p><p class="text-sm text-muted">拖拽其他车库的车辆到此 · 或点击上方按钮添加</p>' +
        '</div>';
    } else {
      var gridHtml = '<div class="garage-grid" id="garage-grid">';
      vehiclesInGarage.forEach(function (item) {
        var rec = item.record;
        var customImage = rec.customImage || '';
        var customColor = rec.customColor || '';
        var note = rec.note || '';
        var hasCustom = customColor || note || customImage;

        var cardStyle = customColor ? 'style="border-left:3px solid ' + Utils.escapeHtml(customColor) + '"' : '';

        // Build card via DOM to reliably inject custom image
        var card = GTA.VehicleCard.render(item.vehicle, true);
        card.classList.remove('hover-lift');
        card.classList.add('glass-card');

        if (customImage) {
          var imageDiv = card.querySelector('.card-image');
          if (imageDiv) {
            imageDiv.classList.add('has-custom-img');
            var img = document.createElement('img');
            img.src = customImage;
            img.className = 'card-custom-img';
            img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;';
            imageDiv.appendChild(img);
          }
        }

        var cardHtml = card.outerHTML;

        gridHtml +=
          '<div class="garage-vehicle' + (hasCustom ? ' has-custom' : '') + '" draggable="true" data-vehicle-id="' + item.vehicle.id + '" data-record-id="' + rec.id + '" ' + cardStyle + '>' +
            '<div class="drag-handle" data-record-id="' + rec.id + '">⋮⋮</div>' +
            '<div class="edit-card-btn" data-record-id="' + rec.id + '" title="自定义卡片">✎</div>' +
            '<div class="remove-btn" data-record-id="' + rec.id + '">×</div>' +
            cardHtml +
            (note ? '<div class="card-note-indicator" title="' + Utils.escapeHtml(note) + '">📝</div>' : '') +
          '</div>';
      });
      gridHtml += '</div>';
      content.innerHTML += gridHtml;

      setupVehicleDragAndDrop();
      bindCardButtons();

      // Highlight vehicle from search result
      if (highlightVehicleId) {
        var targetEl = document.querySelector('.garage-vehicle[data-vehicle-id="' + highlightVehicleId + '"]');
        if (targetEl) {
          targetEl.classList.add('search-highlight');
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () {
            targetEl.classList.remove('search-highlight');
          }, 2000);
        }
        highlightVehicleId = null;
      }
    }

    // Bind header buttons
    var renameBtn = document.getElementById('btn-rename-garage');
    var addBtn = document.getElementById('btn-add-to-garage');
    var deleteBtn = document.getElementById('btn-delete-garage');

    if (renameBtn) renameBtn.addEventListener('click', showRenameModal);
    if (addBtn) addBtn.addEventListener('click', showAddVehicleModal);
    if (deleteBtn) deleteBtn.addEventListener('click', showDeleteGarageModal);
  }

  // ==================== VEHICLE DRAG & DROP ====================

  function setupVehicleDragAndDrop() {
    var grid = document.getElementById('garage-grid');
    if (!grid) return;

    // --- mousedown: track position for click vs drag detection ---
    grid.addEventListener('mousedown', function (e) {
      clickTrack.startX = e.clientX;
      clickTrack.startY = e.clientY;
      clickTrack.moved = false;
    });

    // --- mousemove: detect if user is actually dragging ---
    grid.addEventListener('mousemove', function (e) {
      if (Math.abs(e.clientX - clickTrack.startX) > 4 || Math.abs(e.clientY - clickTrack.startY) > 4) {
        clickTrack.moved = true;
      }
    });

    // --- click: navigate to vehicle detail if not a drag ---
    grid.addEventListener('click', function (e) {
      if (clickTrack.moved) return;
      // Ignore clicks on buttons/drag-handle
      if (e.target.closest('.remove-btn') || e.target.closest('.edit-card-btn') || e.target.closest('.drag-handle')) return;
      var card = e.target.closest('.garage-vehicle');
      if (!card) return;
      var vehicleId = card.getAttribute('data-vehicle-id');
      if (vehicleId) {
        GTA.Router.navigate('vehicle/' + vehicleId);
      }
    });

    // --- dragstart ---
    grid.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.garage-vehicle');
      if (!card) return;

      dragState.type = 'vehicle';
      dragState.sourceGarageId = currentGarageId;
      dragState.vehicleId = card.getAttribute('data-vehicle-id');
      dragState.recordId = parseInt(card.getAttribute('data-record-id'));

      e.dataTransfer.setData('text/plain', dragState.vehicleId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');

      // Highlight other garage sidebar items as drop targets
      highlightOtherSidebarItems();
    });

    // --- dragend ---
    grid.addEventListener('dragend', function (e) {
      var card = e.target.closest('.garage-vehicle');
      if (card) card.classList.remove('dragging');

      // Clean up
      document.querySelectorAll('.garage-drop-indicator').forEach(function (el) { el.remove(); });
      clearSidebarHighlights();
      dragState.type = null;
      dragState.sourceGarageId = null;
    });

    // --- dragover ---
    grid.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var afterEl = getDragAfterElement(grid, e.clientY);

      grid.querySelectorAll('.garage-drop-indicator').forEach(function (el) { el.remove(); });

      var indicator = document.createElement('div');
      indicator.className = 'garage-drop-indicator';
      if (afterEl) {
        grid.insertBefore(indicator, afterEl);
      } else {
        grid.appendChild(indicator);
      }
    });

    // --- drop (within same garage reorder) ---
    grid.addEventListener('drop', async function (e) {
      e.preventDefault();
      var vehicleId = e.dataTransfer.getData('text/plain');
      if (!vehicleId || dragState.type !== 'vehicle') return;
      if (dragState.sourceGarageId !== currentGarageId) return; // cross-garage handled by tab drop

      var afterEl = getDragAfterElement(grid, e.clientY);

      try {
        var vehicles = await GTA.db.garageVehicles
          .where('garageId').equals(currentGarageId)
          .sortBy('sortOrder');

        var dragged = vehicles.find(function (v) { return v.vehicleId === vehicleId; });
        if (!dragged) return;

        var newOrder = [];
        var afterVehicleId = afterEl ? afterEl.getAttribute('data-vehicle-id') : null;
        var otherVehicles = vehicles.filter(function (v) { return v.vehicleId !== vehicleId; });

        if (!afterVehicleId) {
          otherVehicles.forEach(function (v, i) { newOrder.push({ id: v.id, sortOrder: i }); });
          newOrder.push({ id: dragged.id, sortOrder: otherVehicles.length });
        } else {
          var idx = 0, inserted = false;
          otherVehicles.forEach(function (v) {
            if (!inserted && v.vehicleId === afterVehicleId) {
              newOrder.push({ id: dragged.id, sortOrder: idx++ });
              inserted = true;
            }
            newOrder.push({ id: v.id, sortOrder: idx++ });
          });
          if (!inserted) newOrder.push({ id: dragged.id, sortOrder: idx });
        }

        for (var i = 0; i < newOrder.length; i++) {
          await GTA.db.garageVehicles.update(newOrder[i].id, { sortOrder: newOrder[i].sortOrder });
        }

        await renderGarageContent();
        GTA.EventBus.emit('garage:changed', { garageId: currentGarageId });
      } catch (er) {
        console.error('[Garage] DnD error:', er);
      }
    });
  }

  function highlightOtherSidebarItems() {
    document.querySelectorAll('.garage-sidebar-item').forEach(function (item) {
      if (parseInt(item.getAttribute('data-garage-id')) !== currentGarageId) {
        item.classList.add('sidebar-potential-target');
      }
    });
  }

  function getDragAfterElement(container, y) {
    var elements = [...container.querySelectorAll('.garage-vehicle:not(.dragging)')];
    return elements.reduce(function (closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ==================== REMOVE VEHICLE ====================

  function bindCardButtons() {
    // Remove buttons
    var removeBtns = document.querySelectorAll('#garage-grid .remove-btn');
    removeBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var recordId = parseInt(this.getAttribute('data-record-id'));
        removeFromGarage(recordId);
      });
    });

    // Edit buttons
    var editBtns = document.querySelectorAll('#garage-grid .edit-card-btn');
    editBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var recordId = parseInt(this.getAttribute('data-record-id'));
        showEditVehicleCardModal(recordId);
      });
    });
  }

  async function removeFromGarage(recordId) {
    try {
      await GTA.db.garageVehicles.delete(recordId);
      GTA.Toast.info('已从车库移除');
      renderGarageContent();
      GTA.EventBus.emit('garage:changed', { garageId: currentGarageId });
    } catch (e) {
      console.error('[Garage] Remove error:', e);
    }
  }

  // ==================== MODALS ====================

  function showAddGarageModal() {
    GTA.Modal.show({
      title: '新建车库',
      body: '<div class="form-group"><label class="form-label">车库名称</label><input type="text" class="form-input" id="new-garage-name" placeholder="例如：办公室车库" maxlength="30"></div>',
      confirmText: '创建',
      cancelText: '取消',
      onConfirm: async function () {
        var nameInput = document.getElementById('new-garage-name');
        var name = (nameInput ? nameInput.value.trim() : '') || '新车库';

        var existing = garages.find(function (g) {
          return g.name.toLowerCase() === name.toLowerCase();
        });
        if (existing) {
          currentGarageId = existing.id;
            renderSidebar();
          renderGarageContent();
          GTA.Toast.info('已切换到现有车库「' + existing.name + '」');
          return;
        }

        try {
          var maxSort = garages.length > 0 ? Math.max.apply(null, garages.map(function (g) { return g.sortOrder || 0; })) : -1;
          var id = await GTA.db.garages.add({
            name: name,
            sortOrder: maxSort + 1,
            createdAt: Date.now()
          });
          currentGarageId = id;
            await loadGarages();
          renderSidebar();
          renderGarageContent();
          GTA.Toast.success('车库已创建');
        } catch (e) {
          console.error('[Garage] Create error:', e);
          GTA.Toast.error('创建失败');
        }
      }
    });
  }

  function showRenameModal() {
    var garage = garages.find(function (g) { return g.id === currentGarageId; });
    if (!garage) return;

    GTA.Modal.show({
      title: '重命名车库',
      body: '<div class="form-group"><label class="form-label">新名称</label><input type="text" class="form-input" id="rename-garage-name" value="' + Utils.escapeHtml(garage.name) + '" maxlength="30"></div>',
      confirmText: '保存',
      cancelText: '取消',
      onConfirm: async function () {
        var nameInput = document.getElementById('rename-garage-name');
        var name = (nameInput ? nameInput.value.trim() : '') || garage.name;

        if (name.toLowerCase() !== garage.name.toLowerCase()) {
          var target = garages.find(function (g) {
            return g.id !== currentGarageId && g.name.toLowerCase() === name.toLowerCase();
          });
          if (target) {
            await mergeGarage(currentGarageId, target.id);
            GTA.Toast.info('已合并到「' + target.name + '」');
            return;
          }
        }

        try {
          await GTA.db.garages.update(currentGarageId, { name: name });
          await loadGarages();
          renderSidebar();
          renderGarageContent();
          GTA.Toast.success('已重命名');
        } catch (e) {
          GTA.Toast.error('重命名失败');
        }
      }
    });
  }

  async function mergeGarage(sourceId, targetId) {
    try {
      var sourceVehicles = await GTA.db.garageVehicles.where('garageId').equals(sourceId).toArray();
      var targetVehicles = await GTA.db.garageVehicles.where('garageId').equals(targetId).toArray();
      var maxSort = targetVehicles.length > 0
        ? Math.max.apply(null, targetVehicles.map(function (r) { return r.sortOrder || 0; }))
        : -1;

      for (var i = 0; i < sourceVehicles.length; i++) {
        await GTA.db.garageVehicles.update(sourceVehicles[i].id, {
          garageId: targetId,
          sortOrder: maxSort + 1 + i
        });
      }

      await GTA.db.garages.delete(sourceId);
      await loadGarages();
      currentGarageId = targetId;
      renderSidebar();
      renderGarageContent();
      GTA.EventBus.emit('garage:changed', { garageId: targetId });
    } catch (e) {
      console.error('[Garage] Merge error:', e);
      GTA.Toast.error('合并失败');
    }
  }

  function showDeleteGarageModal() {
    var garage = garages.find(function (g) { return g.id === currentGarageId; });
    if (!garage) return;

    GTA.Modal.show({
      title: '删除车库',
      body: '<p>确定要删除 <strong>' + Utils.escapeHtml(garage.name) + '</strong> 吗？</p><p class="text-sm text-muted">车库中的车辆不会被删除，仅移除车库布局。</p>',
      confirmText: '确认删除',
      cancelText: '取消',
      onConfirm: async function () {
        try {
          await GTA.db.garages.delete(currentGarageId);
          await loadGarages();
          currentGarageId = garages.length > 0 ? garages[0].id : null;
            renderSidebar();
          renderGarageContent();
          GTA.Toast.info('车库已删除');
        } catch (e) {
          GTA.Toast.error('删除失败');
        }
      }
    });
  }

  async function showAddVehicleModal() {
    var allVehicles = Catalog.getAll();
    var owned = await GTA.db.ownedVehicles.toArray();
    var ownedIds = new Set(owned.map(function (r) { return r.vehicleId; }));

    var available = allVehicles.filter(function (v) {
      return ownedIds.has(v.id);
    });

    if (available.length === 0) {
      GTA.Toast.info('没有已收藏的车辆，请先从百科添加');
      return;
    }

    var optionsHtml = '<div class="add-vehicle-list" style="max-height:350px;overflow-y:auto;">';
    available.forEach(function (v) {
      optionsHtml +=
        '<div class="add-vehicle-item" data-vehicle-id="' + v.id + '">' +
          (Catalog.isDiscontinued(v.name) ? '<span class="badge badge-discontinued">绝版</span>' : '') +
          '<span>' + Utils.escapeHtml(v.name) + '</span>' +
          '<span style="margin-left:auto;color:var(--color-gold);font-size:var(--font-size-xs)">' + Utils.formatCurrency(v.price_buy) + '</span>' +
        '</div>';
    });
    optionsHtml += '</div>';

    GTA.Modal.show({
      title: '添加载具到车库',
      body: optionsHtml,
      confirmText: '关闭',
      showCancel: false
    });

    setTimeout(function () {
      document.querySelectorAll('.add-vehicle-item').forEach(function (item) {
        item.addEventListener('click', async function () {
          var vehicleId = this.getAttribute('data-vehicle-id');
          try {
            var maxSort = 0;
            var records = await GTA.db.garageVehicles.where('garageId').equals(currentGarageId).toArray();
            if (records.length > 0) {
              maxSort = Math.max.apply(null, records.map(function (r) { return r.sortOrder || 0; })) + 1;
            }
            await GTA.db.garageVehicles.add({
              garageId: currentGarageId,
              vehicleId: vehicleId,
              sortOrder: maxSort
            });
            GTA.Toast.success('已添加');
            renderGarageContent();
            GTA.EventBus.emit('garage:changed', { garageId: currentGarageId });
          } catch (e) {
            GTA.Toast.error('添加失败');
          }
        });
      });
    }, 100);
  }

  // ==================== CUSTOM VEHICLE CARD EDIT ====================

  function showEditVehicleCardModal(recordId) {
    GTA.db.garageVehicles.get(recordId).then(async function (rec) {
      if (!rec) { GTA.Toast.error('记录不存在'); return; }
      var vehicle = Catalog.getById(rec.vehicleId);
      var vehicleName = vehicle ? vehicle.name : '(未知车辆)';
      var vehicleId = rec.vehicleId;

      // Load album photos
      var albumPhotos = [];
      try {
        albumPhotos = await GTA.ImageStore.getPhotos(vehicleId);
      } catch (e) {}

      // Build album photo grid
      var albumHtml = '';
      if (albumPhotos.length > 0) {
        albumHtml = '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">📸 从相册选择</label>' +
          '<div class="album-photo-picker" id="album-photo-picker" style="display:flex;gap:6px;flex-wrap:wrap;max-height:120px;overflow-y:auto;">';
        albumPhotos.forEach(function (photo) {
          var url = GTA.ImageStore.getPhotoUrl(photo, true);
          if (url) {
            albumHtml +=
              '<div class="album-thumb' + (rec.customImagePhotoId === photo.id ? ' selected' : '') + '" data-photo-id="' + photo.id + '" style="width:60px;height:45px;border-radius:4px;overflow:hidden;cursor:pointer;border:2px solid ' + (rec.customImagePhotoId === photo.id ? 'var(--color-gold)' : 'transparent') + ';flex-shrink:0;">' +
                '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;" alt="">' +
              '</div>';
          }
        });
        albumHtml += '</div></div>';
      }

      var bodyHtml =
        '<p class="text-sm text-muted" style="margin-bottom:16px;">自定义「<strong>' + Utils.escapeHtml(vehicleName) + '</strong>」的卡片显示</p>' +

        // Album photo picker
        albumHtml +

        // Upload new
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">🖼️ ' + (albumPhotos.length > 0 ? '或上传新图片' : '上传自定义图片') + '</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="file" id="card-custom-image" accept="image/png,image/jpeg,image/webp" style="flex:1;font-size:12px;">' +
            (rec.customImage ? '<button class="btn btn-secondary btn-sm" id="btn-remove-custom-img" style="white-space:nowrap;">移除</button>' : '') +
          '</div>' +
          (rec.customImage ? '<div style="margin-top:8px;" id="card-img-preview"><img src="' + rec.customImage + '" style="width:120px;height:68px;object-fit:cover;border-radius:4px;border:1px solid var(--color-glass-border);"></div>' : '<div style="margin-top:8px;display:none;" id="card-img-preview"><img src="" style="width:120px;height:68px;object-fit:cover;border-radius:4px;border:1px solid var(--color-glass-border);"></div>') +
          '<p class="text-xs text-muted" style="margin-top:4px;">上传新图片会同时保存到车辆相册</p>' +
        '</div>' +

        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">左边框颜色</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="color" class="form-input" id="card-custom-color" value="' + (rec.customColor || '#d4a843') + '" style="width:48px;height:32px;padding:2px;">' +
            '<span class="text-xs text-muted">选择颜色或留默认金色</span>' +
          '</div>' +
        '</div>' +

        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">备注</label>' +
          '<textarea class="form-input" id="card-note" rows="2" placeholder="例如：满改、Benny\'s、F1胎..." maxlength="120" style="resize:vertical;">' + Utils.escapeHtml(rec.note || '') + '</textarea>' +
        '</div>';

      // Track selected album photo
      var selectedPhotoId = rec.customImagePhotoId || null;
      var selectedPhotoDataUrl = rec.customImage || '';

      GTA.Modal.show({
        title: '自定义卡片',
        body: bodyHtml,
        confirmText: '保存',
        cancelText: '取消',
        onConfirm: async function () {
          var customColor = (document.getElementById('card-custom-color') || {}).value || '';
          var note = (document.getElementById('card-note') || {}).value || '';
          var imageFile = (document.getElementById('card-custom-image') || {}).files || [];
          var customImage = selectedPhotoDataUrl;

          try {
            if (imageFile.length > 0 && imageFile[0].size < 5 * 1024 * 1024) {
              customImage = await fileToDataUrl(imageFile[0]);
              // Also save to vehicle album
              try {
                await GTA.ImageStore.savePhoto(vehicleId, imageFile[0], false);
              } catch (e) { /* album save is best-effort */ }
            }
            await GTA.db.garageVehicles.update(recordId, {
              customColor: customColor,
              note: note.trim(),
              customImage: customImage,
              customImagePhotoId: selectedPhotoId || 0
            });
            GTA.Toast.success('已保存');
            renderGarageContent();
          } catch (e) {
            GTA.Toast.error('保存失败');
          }
        },
        onShow: function () {
          // Album photo click handler
          var picker = document.getElementById('album-photo-picker');
          if (picker) {
            picker.querySelectorAll('.album-thumb').forEach(function (thumb) {
              thumb.addEventListener('click', async function () {
                var photoId = parseInt(this.getAttribute('data-photo-id'));
                var photo = albumPhotos.find(function (p) { return p.id === photoId; });
                if (!photo) return;

                // Convert blob to data URL
                var blobUrl = GTA.ImageStore.getPhotoUrl(photo, false);
                if (blobUrl) {
                  selectedPhotoDataUrl = await blobToDataUrl(blobUrl);
                  selectedPhotoId = photoId;
                  // Update preview
                  var preview = document.querySelector('#card-img-preview img');
                  var previewDiv = document.getElementById('card-img-preview');
                  if (preview && previewDiv) {
                    preview.src = selectedPhotoDataUrl;
                    previewDiv.style.display = 'block';
                  }
                  // Update selection highlight
                  picker.querySelectorAll('.album-thumb').forEach(function (t) { t.style.borderColor = 'transparent'; });
                  this.style.borderColor = 'var(--color-gold)';
                }
              });
            });
          }

          // Remove button
          var removeBtn = document.getElementById('btn-remove-custom-img');
          if (removeBtn) {
            removeBtn.addEventListener('click', async function () {
              selectedPhotoDataUrl = '';
              selectedPhotoId = null;
              await GTA.db.garageVehicles.update(recordId, { customImage: '', customImagePhotoId: 0 });
              GTA.Toast.info('图片已移除');
              GTA.Modal.hide();
              renderGarageContent();
            });
          }
        }
      });
    }).catch(function (e) {
      GTA.Toast.error('读取记录失败');
    });
  }

  function blobToDataUrl(blobUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(blobUrl);
        var canvas = document.createElement('canvas');
        var maxW = 400;
        var scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(blobUrl); reject(new Error('blob convert failed')); };
      img.src = blobUrl;
    });
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsDataURL(file);
    });
  }

  // Listen for changes from other pages
  // ==================== GLOBAL SEARCH ====================

  async function performGlobalSearch(term) {
    var q = term.toLowerCase();
    var results = { garages: [], vehicles: [] };

    // Search garages by name
    garages.forEach(function (g) {
      if (g.name.toLowerCase().indexOf(q) !== -1) {
        results.garages.push({ id: g.id, name: g.name });
      }
    });

    // Search vehicles across all garages
    try {
      var allRecords = await GTA.db.garageVehicles.toArray();
      // Build a map of garageId -> garage name for quick lookup
      var garageMap = {};
      garages.forEach(function (g) { garageMap[g.id] = g.name; });

      // Deduplicate vehicle+garage pairs (same vehicle shouldn't show twice from same garage)
      var seen = new Set();
      for (var i = 0; i < allRecords.length; i++) {
        var rec = allRecords[i];
        var vehicle = Catalog.getById(rec.vehicleId);
        if (!vehicle) continue;
        var matches = (vehicle.name || '').toLowerCase().indexOf(q) !== -1 ||
                       (vehicle.brand || '').toLowerCase().indexOf(q) !== -1;
        if (!matches) continue;
        var key = rec.vehicleId + '|' + rec.garageId;
        if (seen.has(key)) continue;
        seen.add(key);
        results.vehicles.push({
          recordId: rec.id,
          vehicleId: rec.vehicleId,
          vehicleName: vehicle.name,
          vehicleBrand: vehicle.brand,
          garageId: rec.garageId,
          garageName: garageMap[rec.garageId] || '(已删除)'
        });
      }
    } catch (e) {
      console.error('[Garage] Global search error:', e);
    }

    showSearchResults(results, q);
  }

  function showSearchResults(results, rawTerm) {
    var panel = document.getElementById('search-results-panel');
    if (!panel) return;

    var total = results.garages.length + results.vehicles.length;
    var maxShow = 15;

    if (total === 0) {
      panel.innerHTML = '<div class="search-result-empty">未找到匹配 "<strong>' + Utils.escapeHtml(rawTerm) + '</strong>" 的结果</div>';
      panel.style.display = 'block';
      return;
    }

    var html = '';

    // Garage results
    if (results.garages.length > 0) {
      html += '<div class="search-result-group">车库</div>';
      var showGarages = results.garages.slice(0, maxShow);
      showGarages.forEach(function (g) {
        html += '<div class="search-result-item search-result-garage" data-garage-id="' + g.id + '">' +
          '<span class="search-result-icon">📁</span>' +
          '<span class="search-result-name">' + Utils.escapeHtml(g.name) + '</span>' +
        '</div>';
      });
    }

    // Vehicle results
    if (results.vehicles.length > 0) {
      html += '<div class="search-result-group">载具</div>';
      var remaining = maxShow - Math.min(results.garages.length, maxShow);
      if (remaining <= 0 && results.vehicles.length > 0) {
        html += '<div class="search-result-more">还有 ' + results.vehicles.length + ' 个匹配...</div>';
      } else {
        var showVehicles = results.vehicles.slice(0, Math.max(remaining, 3));
        showVehicles.forEach(function (v) {
          html += '<div class="search-result-item search-result-vehicle" data-garage-id="' + v.garageId + '" data-vehicle-id="' + v.vehicleId + '">' +
            '<span class="search-result-icon">🚗</span>' +
            '<span class="search-result-name">' + Utils.escapeHtml(v.vehicleName) + '</span>' +
            '<span class="search-result-sub"> 在「' + Utils.escapeHtml(v.garageName) + '」</span>' +
          '</div>';
        });
        if (results.vehicles.length > showVehicles.length) {
          html += '<div class="search-result-more">还有 ' + (results.vehicles.length - showVehicles.length) + ' 个匹配...</div>';
        }
      }
    }

    panel.innerHTML = html;
    panel.style.display = 'block';

    // Bind click events
    panel.querySelectorAll('.search-result-garage').forEach(function (el) {
      el.addEventListener('click', function () {
        var gid = parseInt(this.getAttribute('data-garage-id'));
        currentGarageId = gid;
        highlightVehicleId = null;
        hideSearchResults();
        document.getElementById('garage-search-input').value = '';
        renderSidebar();
        renderGarageContent();
        GTA.Router.navigate('garage/' + gid);
      });
    });

    panel.querySelectorAll('.search-result-vehicle').forEach(function (el) {
      el.addEventListener('click', function () {
        var gid = parseInt(this.getAttribute('data-garage-id'));
        var vid = this.getAttribute('data-vehicle-id');
        currentGarageId = gid;
        highlightVehicleId = vid;
        hideSearchResults();
        document.getElementById('garage-search-input').value = '';
        renderSidebar();
        renderGarageContent();
        GTA.Router.navigate('garage/' + gid);
      });
    });
  }

  function hideSearchResults() {
    var panel = document.getElementById('search-results-panel');
    if (panel) panel.style.display = 'none';
  }

  function clearSearchInput() {
    var input = document.getElementById('garage-search-input');
    if (input) input.value = '';
    hideSearchResults();
  }

  GTA.EventBus.on('garage:changed', function () {
    loadGarages().then(function () { renderSidebar(); });
  });

  return { init: init, destroy: destroy };
})();
