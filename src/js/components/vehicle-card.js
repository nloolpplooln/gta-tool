/* ===== Vehicle Card Renderer ===== */
window.GTA = window.GTA || {};

GTA.VehicleCard = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;

  function render(vehicle, isOwned) {
    var card = document.createElement('div');
    card.className = 'vehicle-card hover-lift glass-card';
    card.setAttribute('data-vehicle-id', vehicle.id);
    card.addEventListener('click', function () {
      GTA.Router.navigate('vehicle/' + vehicle.id);
    });

    var typeIcon = getTypeIcon(vehicle.type);
    var discontinuedBadge = Catalog.isDiscontinued(vehicle.name)
      ? '<span class="badge badge-discontinued">绝版</span>'
      : '';

    card.innerHTML =
      '<div class="card-image">' +
        '<div class="card-image-placeholder">' + typeIcon + '</div>' +
        (vehicle.thumbnail ? '<img src="' + vehicle.thumbnail + '" alt="" class="card-thumb-img" loading="lazy" onerror="this.style.display=\'none\'" onload="this.style.opacity=\'1\'">' : '') +
        discontinuedBadge +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name" title="' + Utils.escapeHtml(vehicle.name) + '">' + Utils.escapeHtml(vehicle.name) + '</div>' +
        '<div class="card-brand">' + Utils.escapeHtml(vehicle.brand) + ' · ' + Utils.escapeHtml(vehicle.type) + '</div>' +
        (vehicle.specs && vehicle.specs.drive ? '<div style="font-size:10px;color:var(--color-text-muted);margin-bottom:4px;">' + vehicle.specs.layout + ' · ' + vehicle.specs.drive + '</div>' : '') +
        '<div class="card-footer" style="display:flex;align-items:center;justify-content:space-between;">' +
          '<span class="card-price">' + Utils.formatCurrency(vehicle.price_buy) + '</span>' +
          '<span style="display:flex;align-items:center;gap:4px;">' +
            '<button class="compare-add-btn" data-id="' + vehicle.id + '" title="加入对比" onclick="event.stopPropagation();var added=GTA.CompareList&&GTA.CompareList.add(\'' + vehicle.id + '\');if(added){GTA.Toast.success(\'已加入对比 (\'+GTA.CompareList.get().length+\'/\'+GTA.CompareList.max+\')\');this.disabled=true;this.style.opacity=\'0.5\'}else{GTA.Toast.warning(\'对比已满或已存在\')}">对比</button>' +
            (isOwned ? '<span class="card-owned-badge">✅</span>' : '') +
          '</span>' +
        '</div>' +
      '</div>';

    return card;
  }

  function getTypeIcon(type) {
    var icons = {
      'Super': '🏎️',
      'Sports': '🏁',
      'Sports Classic': '🚗',
      'Muscle': '💪',
      'SUV': '🚙',
      'Sedan': '🚗',
      'Coupe': '🚘',
      'Motorcycle': '🏍️',
      'Off-Road': '🛻',
      'Utility': '🚛'
    };
    return icons[type] || '🚗';
  }

  return { render: render };
})();
