/* ===== GTA Color Cards Page ===== */
window.GTA = window.GTA || {};

GTA.Colors = (function () {
  var Utils = GTA.Utils;
  var allColors = [];
  var rareColorIds = new Set();
  var activeFilter = 'all';
  var searchQuery = '';
  var targetColorId = null;
  var lightboxIndex = -1;
  var lightboxItems = [];

  var CATEGORY_CN = {
    'Metallic': '金属质感',
    'Matte': '哑光',
    'Util': '工业',
    'Worn': '磨损',
    'Metal': '金属',
    'Chrome': '铬合金',
    'Chameleon': '变色龙'
  };

  async function init(params) {
    var container = document.getElementById('colors-content');
    if (!container) return;

    // Parse URL search param: #/colors?search=xxx or #/colors/xxx
    if (params && params.search) {
      searchQuery = decodeURIComponent(params.search);
    } else {
      // Try parsing hash manually
      var hash = window.location.hash;
      var qm = hash.indexOf('?search=');
      if (qm > 0) {
        searchQuery = decodeURIComponent(hash.substring(qm + 8));
      }
    }

    // Handle id param for direct color navigation
    if (params && params.id) {
      targetColorId = parseInt(params.id, 10);
      activeFilter = 'all';
      searchQuery = '';
    }

    if (allColors.length === 0) {
      try {
        var resp = await fetch('../../gta-colors.json');
        var data = await resp.json();
        allColors = data.colors || data;
      } catch (e) {
        container.innerHTML = '<div class="colors-page"><p style="padding:var(--space-lg);color:var(--color-danger)">加载颜色数据失败</p></div>';
        return;
      }
    }

    if (rareColorIds.size === 0) {
      try {
        var resp = await fetch('../../rare-color-ids.json');
        var ids = await resp.json();
        rareColorIds = new Set(ids);
      } catch (e) {}
    }

    render(container);
    ensureCarLightbox();

    // Scroll to target color after render (only once, with guard)
    if (targetColorId !== null) {
      var scrollTarget = targetColorId;
      targetColorId = null; // Clear immediately to prevent re-trigger
      setTimeout(function () {
        var targetCard = document.querySelector('.color-card[data-color-id="' + scrollTarget + '"]');
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.classList.add('color-card-highlight');
          setTimeout(function () {
            targetCard.classList.remove('color-card-highlight');
          }, 2000);
        }
      }, 300); // Increased delay for DOM stability
    }
  }

  function getCategories() {
    var categories = ['all'];
    var seen = {};
    allColors.forEach(function (c) {
      if (c.category && !seen[c.category]) {
        seen[c.category] = true;
        categories.push(c.category);
      }
    });
    return categories;
  }

  function filterColors() {
    return allColors.filter(function (c) {
      if (activeFilter !== 'all' && c.category !== activeFilter) return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        var nameCn = (c.name_cn || '').toLowerCase();
        var nameEn = (c.name_en || '').toLowerCase();
        var idStr = String(c.id);
        if (nameCn.indexOf(q) === -1 && nameEn.indexOf(q) === -1 && idStr !== q) return false;
      }
      return true;
    });
  }

  function render(container) {
    var categories = getCategories();
    var filtered = filterColors();

    var html = '<div class="colors-page">';

    html += '<p style="color:var(--color-text-muted);font-size:var(--font-size-caption);margin-bottom:var(--space-md)">共 ' + allColors.length + ' 种颜色 · 编号 0 - 222 · 点击卡片查看上车效果</p>';

    html += '<div class="color-search">' +
      '<input type="text" class="form-input" id="color-search-input" placeholder="搜索颜色名称（中文或英文）..." maxlength="60">' +
    '</div>';

    html += '<div class="color-filter-chips" id="color-filter-chips">';
    categories.forEach(function (cat) {
      var label = cat === 'all' ? '全部' : (CATEGORY_CN[cat] || cat);
      var activeClass = activeFilter === cat ? ' active' : '';
      html += '<span class="color-filter-chip' + activeClass + '" data-category="' + cat + '">' + label + '</span>';
    });
    html += '</div>';

    html += '<div id="color-results-area">';
    html += '<div class="color-results-count">显示 ' + filtered.length + ' / ' + allColors.length + ' 种颜色</div>';
    if (filtered.length === 0) {
      html += '<div class="color-no-results">没有找到匹配的颜色</div>';
    } else {
      html += '<div class="color-card-grid">';
      filtered.forEach(function (c, idx) {
        html += renderColorCard(c, idx);
      });
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Bind search — update only results area, don't recreate input
    var searchInput = document.getElementById('color-search-input');
    if (searchInput) {
      if (searchQuery) searchInput.value = searchQuery;
      searchInput.addEventListener('input', Utils.debounce(function () {
        searchQuery = this.value;
        refreshResults(container);
      }, 200));
    }

    // Bind filter chips
    var chips = container.querySelectorAll('.color-filter-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeFilter = this.getAttribute('data-category');
        searchQuery = ''; var si = document.getElementById('color-search-input');
        if (si) si.value = '';
        refreshResults(container);
      });
    });

    // Bind card clicks for car lightbox
    rebindCards(filtered);
  }

  function refreshResults(container) {
    var filtered = filterColors();
    var area = document.getElementById('color-results-area');
    if (!area) return;
    var html = '<div class="color-results-count">显示 ' + filtered.length + ' / ' + allColors.length + ' 种颜色</div>';
    if (filtered.length === 0) {
      html += '<div class="color-no-results">没有找到匹配的颜色</div>';
    } else {
      html += '<div class="color-card-grid">';
      filtered.forEach(function (c, idx) { html += renderColorCard(c, idx); });
      html += '</div>';
    }
    area.innerHTML = html;
    rebindCards(filtered);
  }

  function rebindCards(filtered) {
    document.querySelectorAll('.color-card').forEach(function (card, idx) {
      card.addEventListener('click', function (e) {
        openCarLightbox(filtered, idx);
      });
    });
  }

  function renderColorCard(c, idx) {
    var hex = c.hex || '';
    if (hex && hex.indexOf('#') !== 0) hex = '#' + hex;

    var r = c.rgb ? c.rgb.r : 0;
    var g = c.rgb ? c.rgb.g : 0;
    var b = c.rgb ? c.rgb.b : 0;

    var brightness = (r * 299 + g * 587 + b * 114) / 1000;
    var idTextColor = brightness > 140 ? '#1a1a2e' : '#fff';
    var idBgColor = brightness > 140 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';

    var isChameleon = c.category === 'Chameleon' || c.id >= 161;
    var swatchStyle = c.gradient
      ? 'background:' + c.gradient + ';'
      : ('background-color:' + (hex || '#333') + ';');
    var swatchClass = isChameleon ? 'color-swatch chameleon-swatch' : 'color-swatch';

    var hasWheel = c.purchase && c.purchase.wheel;
    var hasBody = c.purchase && c.purchase.body;
    var hasPearl = c.purchase && c.purchase.pearlescent;
    var hasCarImg = !!c.car_image;

    var isRare = rareColorIds.has(c.id);
    return '<div class="color-card' + (isRare ? ' color-card-rare' : '') + '" data-color-id="' + c.id + '" data-idx="' + idx + '"' + (hasCarImg ? ' title="点击查看上车效果"' : '') + '>' +
      '<div class="' + swatchClass + '" style="' + swatchStyle + '">' +
        '<span class="color-id" style="color:' + (isChameleon ? '#fff' : idTextColor) + ';background:' + (isChameleon ? 'rgba(0,0,0,0.45)' : idBgColor) + ';">' + c.id + '</span>' +
        (isRare ? '<span class="rare-badge">稀有</span>' : '') +
        (hasCarImg ? '<span class="car-img-hint">🔍</span>' : '') +
      '</div>' +
      '<div class="color-info">' +
        '<div class="color-name">' +
          '<span class="color-name-cn">' + Utils.escapeHtml(c.name_cn || '') + '</span>' +
          '<span class="color-name-en">' + Utils.escapeHtml(c.name_en || '') + '</span>' +
        '</div>' +
        '<span class="color-category-badge ' + (c.category || '') + '">' + Utils.escapeHtml(CATEGORY_CN[c.category] || c.category || '未知') + '</span>' +
        (c.available === false ? ' <span class="badge badge-hidden">隐藏</span>' : '') +
        (isChameleon
          ? '<div class="color-values"><span class="color-hex">变色龙涂装</span><span>无固定色值</span></div>'
          : '<div class="color-values"><span class="color-hex">' + hex + '</span><span>RGB(' + r + ', ' + g + ', ' + b + ')</span></div>'
        ) +
        (c.price ? '<div class="color-price-unlock">' +
          '<span class="color-price">$' + c.price.toLocaleString() + '</span>' +
          '<span class="color-unlock">' + Utils.escapeHtml(c.unlock || '') + '</span>' +
        '</div>' : '') +
        '<div class="color-purchase">' +
          '<span class="color-purchase-item ' + (hasWheel ? 'available' : 'unavailable') + '">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>轮毂' +
          '</span>' +
          '<span class="color-purchase-item ' + (hasBody ? 'available' : 'unavailable') + '">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/></svg>车身' +
          '</span>' +
          '<span class="color-purchase-item ' + (hasPearl ? 'available' : 'unavailable') + '">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg>珠光' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Image Preloader ──
  var preloadCache = {};
  function preloadImg(url) {
    if (!url || preloadCache[url]) return;
    preloadCache[url] = true;
    var img = new Image();
    img.src = url;
  }

  function preloadAdjacent(idx) {
    var total = lightboxItems.length;
    if (total <= 1) return;
    var next = (idx + 1) % total;
    var prev = (idx - 1 + total) % total;
    preloadImg(lightboxItems[next].car_image);
    preloadImg(lightboxItems[prev].car_image);
  }

  // ── Car Lightbox ──

  function ensureCarLightbox() {
    if (document.getElementById('car-lightbox')) return;
    var lb = document.createElement('div');
    lb.id = 'car-lightbox';
    lb.className = 'car-lightbox';
    lb.style.display = 'none';
    lb.innerHTML =
      '<span class="car-lightbox-close">&times;</span>' +
      '<span class="car-lightbox-prev" id="car-lb-prev">&lsaquo;</span>' +
      '<span class="car-lightbox-next" id="car-lb-next">&rsaquo;</span>' +
      '<img class="car-lightbox-img" id="car-lightbox-img" src="">' +
      '<div class="car-lightbox-info" id="car-lightbox-info"></div>';
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('car-lightbox-close')) {
        lb.style.display = 'none';
      }
    });
    document.body.appendChild(lb);

    document.getElementById('car-lb-prev').addEventListener('click', function (e) {
      e.stopPropagation();
      navigateCarLightbox(-1);
    });
    document.getElementById('car-lb-next').addEventListener('click', function (e) {
      e.stopPropagation();
      navigateCarLightbox(1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      var lbEl = document.getElementById('car-lightbox');
      if (!lbEl || lbEl.style.display === 'none') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateCarLightbox(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateCarLightbox(1); }
      if (e.key === 'Escape') { e.preventDefault(); lbEl.style.display = 'none'; }
    });
  }

  function openCarLightbox(items, index) {
    // Only show items that have car images
    lightboxItems = items.filter(function (c) { return !!c.car_image; });
    if (lightboxItems.length === 0) return;

    // Find the clicked item's position in the filtered list
    var clickedId = items[index].id;
    lightboxIndex = 0;
    for (var i = 0; i < lightboxItems.length; i++) {
      if (lightboxItems[i].id === clickedId) { lightboxIndex = i; break; }
    }
    if (lightboxIndex >= lightboxItems.length) lightboxIndex = 0;

    showCarLightboxImage();
    document.getElementById('car-lightbox').style.display = 'flex';
  }

  function navigateCarLightbox(dir) {
    if (lightboxItems.length === 0) return;
    lightboxIndex = (lightboxIndex + dir + lightboxItems.length) % lightboxItems.length;
    showCarLightboxImage();
  }

  function showCarLightboxImage() {
    var c = lightboxItems[lightboxIndex];
    var img = document.getElementById('car-lightbox-img');
    var info = document.getElementById('car-lightbox-info');
    if (img) {
      img.style.opacity = '0.3';
      img.src = c.car_image;
      img.onload = function () { img.style.opacity = '1'; };
      img.onerror = function () { img.style.opacity = '1'; };
    }
    if (info) info.textContent = (c.name_cn || c.name_en) + ' (#' + c.id + ')';
    var prevBtn = document.getElementById('car-lb-prev');
    var nextBtn = document.getElementById('car-lb-next');
    if (prevBtn) prevBtn.style.display = lightboxItems.length > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = lightboxItems.length > 1 ? '' : 'none';
    preloadAdjacent(lightboxIndex);
  }

  function destroy() {}

  return { init: init, destroy: destroy };
})();
