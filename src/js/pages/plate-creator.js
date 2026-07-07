/* ===== License Plate Creator — Native Page ===== */
window.GTA = window.GTA || {};
GTA.PlateCreator = (function() {
  'use strict';

  var BASE = '../../';
  var PLATES = [
    { id: 'las-venturas',      name: '拉斯文加斯',     img: BASE + 'assets/plate-bg/拉斯文加斯.png',     textColor: '#1a3a7a', textArea: {} },
    { id: 'e-cola',            name: '易可乐',         img: BASE + 'assets/plate-bg/易可乐.png',         textColor: '#ffffff', textArea: {} },
    { id: 'ls-troublemakers',  name: '洛圣都捣蛋者队',  img: BASE + 'assets/plate-bg/洛圣都捣蛋者队.png',  textColor: '#EDAF1F', textArea: {} },
    { id: 'ls-car-club',       name: '洛圣都车友会',    img: BASE + 'assets/plate-bg/洛圣都车友会.png',    textColor: '#000000', textArea: {} },
    { id: 'sprunk',            name: '霜碧',           img: BASE + 'assets/plate-bg/霜碧.png',           textColor: '#ffffff', textArea: {} },
    { id: 'ls-tremors',        name: '洛圣都颤栗队',    img: BASE + 'assets/plate-bg/洛圣都颤栗队.png',    textColor: '#ffffff', textArea: {} },
    { id: 'liberty-city',      name: '自由市',         img: BASE + 'assets/plate-bg/自由市.png',         textColor: '#00086F', textArea: {} }
  ];

  var W = 2048, H = 1024;
  var selIdx = 0, plateText = 'ABC1234', loadedImages = {}, is3DMode = false;
  var renderer3d, scene3d, camera3d, plateMesh, plateTexture, controls3d;
  var animFrame, initialized = false;

  // DOM refs
  var textureCanvas, textureCtx, exportCanvas, exportCtx, preview2dCanvas, preview2dCtx;
  var styleGrid, textInput, charCnt, loader, threeContainer, toggleTrack;
  var rngFontSize, rngTextX, rngTextY, valFontSize, valTextX, valTextY;

  function init() {
    if (initialized) return;
    initializeDOMElements();
    if (!styleGrid) return;
    preloadImages(function() {
      if (loader) loader.classList.add('done');
      if (textInput) { textInput.value = 'ABC1234'; plateText = 'ABC1234'; }
      if (charCnt) charCnt.textContent = '7/8';
      bindSliders();
      updateToggleUI();
      // Always show style grid + 2D immediately
      renderStyleGrid();
      renderAll();
      // 2D visible by default; try 3D after layout settles
      setTimeout(function() {
        tryInit3D();
        updateToggleUI();
      }, 300);
      // Re-render with PlateFont once loaded
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() { renderStyleGrid(); renderAll(); });
      }
    });
    bindEvents();
    initialized = true;
  }

  function initializeDOMElements() {
    textureCanvas = document.getElementById('plate-texture-canvas');
    textureCtx = textureCanvas ? textureCanvas.getContext('2d') : null;
    exportCanvas = document.getElementById('plate-export-canvas');
    exportCtx = exportCanvas ? exportCanvas.getContext('2d') : null;
    preview2dCanvas = document.getElementById('plate-2d-canvas');
    preview2dCtx = preview2dCanvas ? preview2dCanvas.getContext('2d') : null;
    styleGrid = document.getElementById('plate-style-grid');
    textInput = document.getElementById('plate-text-input');
    charCnt = document.getElementById('plate-char-cnt');
    loader = document.getElementById('plate-loader');
    threeContainer = document.getElementById('plate-3d-container');
    toggleTrack = document.getElementById('plate-toggle-track');

    rngFontSize = document.getElementById('plate-rng-fontsize');
    rngTextX = document.getElementById('plate-rng-textx');
    rngTextY = document.getElementById('plate-rng-texty');
    valFontSize = document.getElementById('plate-val-fontsize');
    valTextX = document.getElementById('plate-val-textx');
    valTextY = document.getElementById('plate-val-texty');
  }

  function destroy() {
    if (renderer3d) { renderer3d.dispose(); renderer3d = null; }
    if (scene3d) { scene3d = null; }
    initialized = false;
    loadedImages = {};
    selIdx = 0;
  }

  function getFontSize() { return rngFontSize ? parseInt(rngFontSize.value) : 540; }
  function getTextCX() { return rngTextX ? parseFloat(rngTextX.value) : 0.5; }
  function getTextCY() { return rngTextY ? parseFloat(rngTextY.value) : 0.595; }
  function getPlateFont() { return '"PlateFont","Anton","Arial Black",sans-serif'; }

  /* === Three.js Setup === */
  var _tries3d = 0;
  function tryInit3D() {
    if (!threeContainer || !THREE) return;
    var w = threeContainer.clientWidth || threeContainer.offsetWidth || 0;
    if (w < 50 && _tries3d < 5) { _tries3d++; setTimeout(tryInit3D, 150); return; }
    initThreeJS();
  }

  function initThreeJS() {
    if (!threeContainer || !THREE) return;
    renderer3d = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    var rw = threeContainer.clientWidth || 700;
    var rh = threeContainer.clientHeight || 350;
    renderer3d.setSize(rw, rh);
    threeContainer.appendChild(renderer3d.domElement);

    scene3d = new THREE.Scene();
    camera3d = new THREE.PerspectiveCamera(30, rw / rh, 0.1, 100);
    camera3d.position.set(0, 0, 8);
    camera3d.lookAt(0, 0, 0);

    scene3d.add(new THREE.AmbientLight(0xffffff, 2.5));
    var key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(2, 1.5, 5);
    scene3d.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 2);
    fill.position.set(-2, -0.5, 1);
    scene3d.add(fill);

    plateTexture = new THREE.CanvasTexture(textureCanvas);
    plateTexture.colorSpace = THREE.SRGBColorSpace;
    plateTexture.minFilter = THREE.LinearFilter;
    plateTexture.magFilter = THREE.LinearFilter;

    var geom = new THREE.PlaneGeometry(4, 2);
    var mat = new THREE.MeshStandardMaterial({ map: plateTexture, roughness: 0.25, metalness: 0.05 });
    plateMesh = new THREE.Mesh(geom, mat);
    plateMesh.rotation.x = -0.08;
    scene3d.add(plateMesh);

    // Simple mouse drag rotation (no OrbitControls dependency)
    var isDragging = false, prevX = 0, prevY = 0;
    var rotX = -0.08, rotY = 0;
    var dom = renderer3d.domElement;
    dom.addEventListener('mousedown', function(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    dom.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.005;
      rotX += (e.clientY - prevY) * 0.005;
      rotX = Math.max(-Math.PI/3, Math.min(Math.PI/3, rotX));
      prevX = e.clientX; prevY = e.clientY;
    });
    window.addEventListener('mouseup', function() { isDragging = false; });

    window.addEventListener('resize', function() {
      if (!renderer3d || !threeContainer) return;
      var w = threeContainer.clientWidth, h2 = threeContainer.clientHeight;
      renderer3d.setSize(w, h2);
      if (camera3d) { camera3d.aspect = w / h2; camera3d.updateProjectionMatrix(); }
    });

    animate();
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    if (plateMesh) { plateMesh.rotation.x = rotX; plateMesh.rotation.y = rotY; }
    if (renderer3d && scene3d && camera3d) renderer3d.render(scene3d, camera3d);
  }

  function updateTexture() {
    if (plateTexture) plateTexture.needsUpdate = true;
  }

  function updateToggleUI() {
    if (!toggleTrack) return;
    if (is3DMode && renderer3d) {
      // 3D ready
      if (threeContainer) threeContainer.style.display = 'block';
      if (preview2dCanvas) preview2dCanvas.style.display = 'none';
      toggleTrack.classList.remove('off');
    } else {
      // Fallback to 2D
      if (threeContainer) threeContainer.style.display = 'none';
      if (preview2dCanvas) { preview2dCanvas.style.display = 'block'; preview2dCanvas.style.width = ''; preview2dCanvas.style.maxWidth = ''; preview2dCanvas.style.aspectRatio = ''; }
      toggleTrack.classList.add('off');
    }
  }

  /* === Canvas Drawing === */
  function createHalftonePattern(size, dotSize, opacity) {
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,' + opacity + ')';
    for (var y = size/8; y < size; y += size/4) {
      for (var x = size/8; x < size; x += size/4) {
        ctx.beginPath(); ctx.arc(x, y, dotSize, 0, Math.PI*2); ctx.fill();
      }
    }
    return ctx.createPattern(c, 'repeat');
  }

  function drawPlate(ctx, outW, outH, plate, text) {
    var img = loadedImages[plate.id];
    if (!img) return;
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);
    if (!text) return;

    var fs = getFontSize(), cx = getTextCX() * outW, cy = getTextCY() * outH;
    ctx.font = fs + 'px ' + getPlateFont();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    var tc = document.createElement('canvas');
    tc.width = outW; tc.height = outH;
    var tctx = tc.getContext('2d');
    tctx.font = ctx.font; tctx.textAlign = 'center'; tctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(text, cx + 2.5, cy + 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillText(text, cx - 1.5, cy - 1.5);
    ctx.fillStyle = plate.textColor; ctx.fillText(text, cx, cy);
    tctx.fillStyle = '#fff'; tctx.fillText(text, cx, cy);

    var dc = document.createElement('canvas');
    dc.width = outW; dc.height = outH;
    var dctx = dc.getContext('2d');
    dctx.fillStyle = createHalftonePattern(16, 1.2, 0.08);
    dctx.fillRect(0, 0, outW, outH);
    dctx.globalCompositeOperation = 'destination-in';
    dctx.drawImage(tc, 0, 0);
    ctx.drawImage(dc, 0, 0);
  }

  function renderAll() {
    var plate = PLATES[selIdx], text = plateText;
    if (preview2dCtx) drawPlate(preview2dCtx, W, H, plate, text);
    if (textureCtx) drawPlate(textureCtx, W, H, plate, text);
    updateTexture();
    if (exportCtx) drawPlate(exportCtx, W, H, plate, text);
  }

  /* === Style Grid === */
  function renderStyleGrid() {
    if (!styleGrid) return;
    styleGrid.innerHTML = '';
    PLATES.forEach(function(plate, idx) {
      var card = document.createElement('div');
      card.className = 'plate-style-card' + (idx === selIdx ? ' selected' : '');
      var c = document.createElement('canvas');
      c.width = W; c.height = H; c.style.width = '100%'; c.style.height = 'auto';
      drawPlate(c.getContext('2d'), W, H, plate, 'ABC123');
      var n = document.createElement('span');
      n.className = 'name'; n.textContent = plate.name;
      card.appendChild(c); card.appendChild(n);
      card.addEventListener('click', function() { selectPlate(idx); });
      styleGrid.appendChild(card);
    });
  }

  function selectPlate(idx) {
    selIdx = idx;
    var cards = styleGrid.querySelectorAll('.plate-style-card');
    cards.forEach(function(c, i) { c.classList.toggle('selected', i === idx); });
    renderAll();
  }

  /* === Preload Images === */
  function preloadImages(cb) {
    var total = PLATES.length, loaded = 0;
    PLATES.forEach(function(plate) {
      var img = new Image();
      img.onload = function() { loadedImages[plate.id] = img; loaded++; if (loaded === total) cb(); };
      img.onerror = function() { loaded++; if (loaded === total) cb(); };
      img.src = plate.img;
    });
  }

  /* === Events === */
  function bindEvents() {
    if (toggleTrack) {
      toggleTrack.addEventListener('click', function() {
        is3DMode = !is3DMode; updateToggleUI();
      });
    }
    if (textInput) {
      textInput.addEventListener('input', function(e) {
        var raw = e.target.value;
        var filtered = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').substring(0, 8);
        if (filtered !== raw) {
          e.target.value = filtered;
          var pos = textInput.selectionStart;
          textInput.setSelectionRange(Math.max(0, pos - Math.max(0, raw.length - filtered.length)), Math.max(0, pos - Math.max(0, raw.length - filtered.length)));
        }
        plateText = filtered;
        if (charCnt) { charCnt.textContent = filtered.length + '/8'; charCnt.classList.toggle('full', filtered.length >= 8); }
        renderAll();
      });
      textInput.addEventListener('paste', function(e) {
        e.preventDefault();
        var pasted = (e.clipboardData || window.clipboardData).getData('text');
        var filtered = pasted.toUpperCase().replace(/[^A-Z0-9 ]/g, '').substring(0, 8);
        var cur = textInput.value, s = textInput.selectionStart, end = textInput.selectionEnd;
        var nv = cur.substring(0, s) + filtered + cur.substring(end);
        nv = nv.substring(0, 8);
        textInput.value = nv; plateText = nv;
        if (charCnt) { charCnt.textContent = nv.length + '/8'; charCnt.classList.toggle('full', nv.length >= 8); }
        renderAll();
      });
    }
    var btnReset = document.getElementById('plate-btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', function() {
        if (textInput) { textInput.value = 'ABC1234'; plateText = 'ABC1234'; }
        if (charCnt) { charCnt.textContent = '7/8'; charCnt.classList.remove('full'); }
        selIdx = 0;
        var cards = styleGrid ? styleGrid.querySelectorAll('.plate-style-card') : [];
        cards.forEach(function(c, i) { c.classList.toggle('selected', i === 0); });
        renderAll();
      });
    }
    var btnExport = document.getElementById('plate-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', function() {
        var plate = PLATES[selIdx];
        if (exportCtx) drawPlate(exportCtx, W, H, plate, plateText);
        if (exportCanvas) {
          exportCanvas.toBlob(function(blob) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'plate_' + (plateText || 'CUSTOM') + '_' + plate.id + '.png';
            a.click();
          }, 'image/png', 1.0);
        }
      });
    }
  }

  function bindSliders() {
    [rngFontSize, rngTextX, rngTextY].forEach(function(s) {
      if (!s) return;
      s.addEventListener('input', function() {
        if (valFontSize && rngFontSize) valFontSize.textContent = rngFontSize.value;
        if (valTextX && rngTextX) valTextX.textContent = parseFloat(rngTextX.value).toFixed(3);
        if (valTextY && rngTextY) valTextY.textContent = parseFloat(rngTextY.value).toFixed(3);
        renderAll();
      });
    });
  }

  return { init: init, destroy: destroy };
})();
