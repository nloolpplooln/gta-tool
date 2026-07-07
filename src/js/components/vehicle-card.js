/* ===== Vehicle Card Renderer ===== */
window.GTA = window.GTA || {};

GTA.VehicleCard = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var streetCarModels = null; // Set of uppercase model names

  async function loadStreetCarModels() {
    if (streetCarModels) return;
    try {
      var resp = await fetch('../../street-car-models.json');
      var data = await resp.json();
      streetCarModels = new Set(data.map(function (m) { return m.toUpperCase(); }));
    } catch (e) {
      streetCarModels = new Set();
    }
  }

  function isStreetCar(vehicle) {
    if (!streetCarModels) return false;
    return streetCarModels.has((vehicle.model_name || '').toUpperCase());
  }

  function render(vehicle, isOwned) {
    var card = document.createElement('div');
    card.className = 'vehicle-card';
    card.setAttribute('data-vehicle-id', vehicle.id);
    card.addEventListener('click', function () {
      GTA.Router.navigate('vehicle/' + vehicle.id);
    });

    var typeIcon = getTypeIcon(vehicle.type);
    var discontinuedBadge = Catalog.isDiscontinued(vehicle.name)
      ? '<span class="badge badge-discontinued">绝版</span>'
      : '';
    var streetBadge = isStreetCar(vehicle)
      ? '<span class="badge badge-street-car">街车</span>'
      : '';

    card.innerHTML =
      '<div class="card-image">' +
        '<div class="card-image-placeholder">' + typeIcon + '</div>' +
        (vehicle.thumbnail ? '<img src="' + vehicle.thumbnail + '" alt="" class="card-thumb-img" loading="lazy" onerror="this.style.display=\'none\'" onload="this.style.opacity=\'1\'">' : '') +
        '<div class="badge-container" style="display:flex;gap:4px;">' + discontinuedBadge + streetBadge + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-name" title="' + Utils.escapeHtml(vehicle.name) + '">' + Utils.escapeHtml(vehicle.name) + '</div>' +
        '<div class="card-brand">' + Utils.escapeHtml(vehicle.brand) + ' · ' + Utils.escapeHtml(vehicle.type) + '</div>' +
        '<div class="card-footer">' +
          '<span class="card-price">' + Utils.formatCurrency(vehicle.price_buy) + '</span>' +
          (isOwned ? '<span class="card-owned-badge">✓</span>' : '') +
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

  return { render: render, isStreetCar: isStreetCar, loadStreetCarModels: loadStreetCarModels };
})();
