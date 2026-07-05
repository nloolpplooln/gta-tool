/* ===== Wiki Colors Detail Page ===== */
window.GTA = window.GTA || {};

GTA.WikiColors = (function () {
  var Utils = GTA.Utils;
  var allEntries = [];
  var colorLookup = {};
  var activeCategory = 'all';
  var lightboxList = [];
  var lightboxIdx = -1;

  var CAT_CN = {
    'Chrome': '铬合金',
    'Classic': '经典',
    'Matte': '哑光',
    'Metallic': '金属质感',
    'Metals': '金属',
    'Chameleon': '变色龙',
    'Pearlescent': '珠光色',
    'Trim Color': '内饰色',
    'Dial/Accent Color': '仪表/强调色'
  };

  async function init() {
    var container = document.getElementById('wiki-colors-content');
    if (!container) return;

    if (allEntries.length === 0) {
      try {
        var [resp1, resp2] = await Promise.all([
          fetch('../../wiki-colors.json'),
          fetch('../../gta-colors.json')
        ]);
        allEntries = await resp1.json();
        var colorsData = await resp2.json();
        (colorsData.colors || colorsData).forEach(function (c) {
          colorLookup[c.id] = {
            bg: c.gradient || c.hex || '',
            cn: c.name_cn || ''
          };
        });
      } catch (e) {
        container.innerHTML = '<div class="colors-page"><p style="padding:var(--space-lg);color:var(--color-danger)">加载数据失败</p></div>';
        return;
      }
    }

    render(container);
    ensureLightbox();
  }

  function getCategories() {
    var cats = ['all'];
    var seen = {};
    allEntries.forEach(function (e) {
      if (e.category && !seen[e.category]) {
        seen[e.category] = true;
        cats.push(e.category);
      }
    });
    return cats;
  }

  function filterEntries() {
    return allEntries.filter(function (e) {
      if (e.section) return false;
      if (activeCategory !== 'all' && e.category !== activeCategory) return false;
      return true;
    });
  }

  function getColorCn(cid) {
    if (cid === null || cid === undefined) return '';
    var entry = colorLookup[cid];
    return entry ? entry.cn : '';
  }

  function renderColorSwatch(cid) {
    if (cid === null || cid === undefined) return '';
    var entry = colorLookup[cid];
    if (!entry || !entry.bg) return '';
    var bg = entry.bg;
    var onclick = cid !== null ? ' onclick="GTA.WikiColors.goToColorCard(' + cid + ')"' : '';
    if (bg.indexOf('#') === 0) {
      return '<span class="wiki-swatch wiki-swatch-link" style="background-color:' + bg + ';"' + onclick + ' title="查看颜色卡片"></span>';
    }
    return '<span class="wiki-swatch wiki-swatch-link" style="background:' + bg + ';"' + onclick + ' title="查看颜色卡片"></span>';
  }

  function render(container) {
    var categories = getCategories();
    var filtered = filterEntries();

    var html = '<div class="colors-page">';

    html += '<p style="color:var(--color-text-muted);font-size:var(--font-size-caption);margin-bottom:var(--space-md)">数据来源：GTA Wiki · 色块可点击跳转颜色卡片 · 点击截图放大</p>';

    html += '<div class="color-filter-chips" id="wiki-filter-chips">';
    categories.forEach(function (cat) {
      var label = cat === 'all' ? '全部' : (CAT_CN[cat] || cat);
      var activeClass = activeCategory === cat ? ' active' : '';
      html += '<span class="color-filter-chip' + activeClass + '" data-category="' + cat + '">' + label + '</span>';
    });
    html += '</div>';

    html += '<div class="color-results-count">显示 ' + filtered.length + ' 条</div>';

    var showPearl = activeCategory === 'all' || activeCategory === 'Classic' || activeCategory === 'Metallic';

    html += '<div class="wiki-table-wrap">';
    html += '<table class="wiki-color-table">';
    html += '<thead><tr>' +
      '<th>预览</th><th>颜色</th><th>色号</th>' +
      (showPearl ? '<th>默认珠光</th>' : '') +
      '<th>解锁条件</th><th>故事模式</th><th>在线模式</th><th>截图</th>' +
    '</tr></thead>';
    html += '<tbody>';

    // Build lightbox list (entries with images)
    lightboxList = filtered.filter(function (e) { return !!e.image; });

    // Use 100px thumbnails for faster table loading
    function thumbUrl(img) {
      if (!img) return '';
      return img.replace(/\/\d+px-/, '/100px-');
    }

    filtered.forEach(function (e) {
      var cn = getColorCn(e.id);
      var pearlCn = getColorCn(e.pearl_id);
      var showPearlCol = activeCategory === 'all' || activeCategory === 'Classic' || activeCategory === 'Metallic';

      // Find index in lightbox list
      var lbIdx = lightboxList.indexOf(e);

      html += '<tr>' +
        '<td>' + renderColorSwatch(e.id) + '</td>' +
        '<td>' +
          (cn ? '<strong>' + Utils.escapeHtml(cn) + '</strong><br><span class="wiki-name-en">' + Utils.escapeHtml(e.name) + '</span>' : '<strong>' + Utils.escapeHtml(e.name) + '</strong>') +
        '</td>' +
        '<td><span class="wiki-color-id">' + (e.id !== null ? e.id : '') + '</span></td>' +
        (showPearlCol
          ? '<td>' + renderColorSwatch(e.pearl_id) + ' ' + (pearlCn ? Utils.escapeHtml(pearlCn) : Utils.escapeHtml(e.pearl_name || '—')) + '</td>'
          : '') +
        '<td class="wiki-unlock">' + Utils.escapeHtml(e.unlock || '默认') + '</td>' +
        '<td class="wiki-price">' + Utils.escapeHtml(e.cost_story || '—') + '</td>' +
        '<td class="wiki-price wiki-price-online">' + Utils.escapeHtml(e.cost_online || '—') + '</td>' +
        '<td class="wiki-img-cell">' + (e.image
          ? '<img src="' + thumbUrl(e.image) + '" class="wiki-color-img" data-lb-idx="' + lbIdx + '" data-full="' + e.image + '" onerror="this.style.display=\'none\'" title="点击放大">'
          : '') + '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    html += '</div>';

    container.innerHTML = html;

    // Filter chips
    var chips = container.querySelectorAll('#wiki-filter-chips .color-filter-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeCategory = this.getAttribute('data-category');
        render(container);
      });
    });

  }

  // ── Jump to color card page ──

  function goToColorCard(cid) {
    GTA.Router.navigate('colors?search=' + cid);
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
    var total = lightboxList.length;
    if (total <= 1) return;
    var next = (idx + 1) % total;
    var prev = (idx - 1 + total) % total;
    preloadImg(lightboxList[next].image.replace('/200px-', '/800px-'));
    preloadImg(lightboxList[prev].image.replace('/200px-', '/800px-'));
  }

  // ── Lightbox ──

  function ensureLightbox() {
    if (document.getElementById('wiki-lightbox')) return;
    var lb = document.createElement('div');
    lb.id = 'wiki-lightbox';
    lb.className = 'wiki-lightbox';
    lb.style.display = 'none';
    lb.innerHTML =
      '<span class="wiki-lightbox-close">&times;</span>' +
      '<span class="wiki-lightbox-prev" id="wiki-lb-prev">&lsaquo;</span>' +
      '<span class="wiki-lightbox-next" id="wiki-lb-next">&rsaquo;</span>' +
      '<img class="wiki-lightbox-img" id="wiki-lightbox-img" src="">' +
      '<div class="wiki-lightbox-title" id="wiki-lightbox-title"></div>';
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('wiki-lightbox-close')) {
        lb.style.display = 'none';
      }
    });
    document.body.appendChild(lb);

    document.getElementById('wiki-lb-prev').addEventListener('click', function (e) {
      e.stopPropagation();
      navigateLightbox(-1);
    });
    document.getElementById('wiki-lb-next').addEventListener('click', function (e) {
      e.stopPropagation();
      navigateLightbox(1);
    });

    // Delegated image click
    document.addEventListener('click', function (e) {
      var img = e.target.closest('.wiki-color-img');
      if (!img) return;
      var idx = parseInt(img.getAttribute('data-lb-idx'));
      if (isNaN(idx) || idx < 0 || idx >= lightboxList.length) return;
      openLightbox(idx);
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      var lbEl = document.getElementById('wiki-lightbox');
      if (!lbEl || lbEl.style.display === 'none') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateLightbox(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateLightbox(1); }
      if (e.key === 'Escape') { e.preventDefault(); lbEl.style.display = 'none'; }
    });
  }

  function openLightbox(idx) {
    lightboxIdx = idx;
    showLightboxImage();
    document.getElementById('wiki-lightbox').style.display = 'flex';
  }

  function navigateLightbox(dir) {
    if (lightboxList.length === 0) return;
    lightboxIdx = (lightboxIdx + dir + lightboxList.length) % lightboxList.length;
    showLightboxImage();
  }

  function showLightboxImage() {
    var e = lightboxList[lightboxIdx];
    var img = document.getElementById('wiki-lightbox-img');
    var titleEl = document.getElementById('wiki-lightbox-title');
    if (img) {
      img.style.opacity = '0.3';
      img.src = e.image.replace('/200px-', '/800px-');
      img.onload = function () { img.style.opacity = '1'; };
      img.onerror = function () { img.style.opacity = '1'; };
    }
    if (titleEl) titleEl.textContent = e.name + (e.id !== null ? ' (#' + e.id + ')' : '');
    var prev = document.getElementById('wiki-lb-prev');
    var next = document.getElementById('wiki-lb-next');
    if (prev) prev.style.display = lightboxList.length > 1 ? '' : 'none';
    if (next) next.style.display = lightboxList.length > 1 ? '' : 'none';
    // Preload adjacent
    preloadAdjacent(lightboxIdx);
  }

  function destroy() {}

  return { init: init, destroy: destroy, goToColorCard: goToColorCard };
})();
