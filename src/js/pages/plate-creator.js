/* ===== License Plate Creator ===== */
window.GTA = window.GTA || {};
GTA.PlateCreator = (function() {
  'use strict';

  var BASE = '../../';
  var PLATES = [
    { id: 'las-venturas',     name: '拉斯文加斯',     img: BASE+'assets/plate-bg/拉斯文加斯.png',     textColor: '#1a3a7a' },
    { id: 'e-cola',           name: '易可乐',         img: BASE+'assets/plate-bg/易可乐.png',         textColor: '#ffffff' },
    { id: 'ls-troublemakers', name: '洛圣都捣蛋者队',  img: BASE+'assets/plate-bg/洛圣都捣蛋者队.png',  textColor: '#EDAF1F' },
    { id: 'ls-car-club',      name: '洛圣都车友会',    img: BASE+'assets/plate-bg/洛圣都车友会.png',    textColor: '#000000' },
    { id: 'sprunk',           name: '霜碧',           img: BASE+'assets/plate-bg/霜碧.png',           textColor: '#ffffff' },
    { id: 'ls-tremors',       name: '洛圣都颤栗队',    img: BASE+'assets/plate-bg/洛圣都颤栗队.png',    textColor: '#ffffff' },
    { id: 'liberty-city',     name: '自由市',         img: BASE+'assets/plate-bg/自由市.png',         textColor: '#00086F' }
  ];

  var W = 2048, H = 1024, selIdx = 0, plateText = 'ABC1234', loadedImgs = {};
  var inited = false;

  // DOM
  var el2dCanvas, elTexCanvas, elExpCanvas;
  var elGrid, elInput, elCnt, elLoader, el3d, elToggle, el2d;
  var elRngFS, elRngX, elRngY, elValFS, elValX, elValY;

  function init() {
    if (inited) return;
    el2dCanvas = document.getElementById('plate-2d-canvas');
    elTexCanvas = document.getElementById('plate-texture-canvas');
    elExpCanvas = document.getElementById('plate-export-canvas');
    elGrid = document.getElementById('plate-style-grid');
    elInput = document.getElementById('plate-text-input');
    elCnt = document.getElementById('plate-char-cnt');
    elLoader = document.getElementById('plate-loader');
    el3d = document.getElementById('plate-3d-container');
    elToggle = document.getElementById('plate-toggle-track');
    elRngFS = document.getElementById('plate-rng-fontsize');
    elRngX = document.getElementById('plate-rng-textx');
    elRngY = document.getElementById('plate-rng-texty');
    elValFS = document.getElementById('plate-val-fontsize');
    elValX = document.getElementById('plate-val-textx');
    elValY = document.getElementById('plate-val-texty');

    if (!elGrid) return;

    _tries = 0;
    preloadImages(function() {
      if (elLoader) elLoader.classList.add('done');
      if (elInput) { elInput.value = 'ABC1234'; }
      if (elCnt) elCnt.textContent = '7/8';
      renderGrid();
      renderAll();
      bindAll();
      show2D();
      // Try 3D after layout
      setTimeout(try3D, 400);
      // Re-render on font ready
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() { renderGrid(); renderAll(); });
      }
    });
    inited = true;
  }

  function destroy() {
    // Clean up window event listeners
    if (_onMouseMove) { window.removeEventListener('mousemove', _onMouseMove); _onMouseMove = null; }
    if (_onMouseUp)   { window.removeEventListener('mouseup', _onMouseUp); _onMouseUp = null; }
    if (_onResize)    { window.removeEventListener('resize', _onResize); _onResize = null; }
    // Dispose WebGL resources
    if (plateTex) { try { plateTex.dispose(); } catch(e){} plateTex = null; }
    if (plateMesh && plateMesh.material) {
      try {
        if (plateMesh.material.map) plateMesh.material.map.dispose();
        plateMesh.material.dispose();
      } catch(e){}
    }
    if (renderer3d) {
      try { renderer3d.dispose(); } catch(e){}
      if (renderer3d.domElement && renderer3d.domElement.parentNode) {
        renderer3d.domElement.parentNode.removeChild(renderer3d.domElement);
      }
      renderer3d = null;
    }
    scene3d = null; camera3d = null; plateMesh = null;
    inited = false; loadedImgs = {}; selIdx = 0; _tries = 0;
    if (animFrame3d) { cancelAnimationFrame(animFrame3d); animFrame3d = null; }
  }

  /* ===== 2D Drawing ===== */
  function getCtx(el) { return el ? el.getContext('2d') : null; }
  function getFS() { return elRngFS ? parseInt(elRngFS.value) : 540; }
  function getTX() { return elRngX ? parseFloat(elRngX.value) : 0.5; }
  function getTY() { return elRngY ? parseFloat(elRngY.value) : 0.595; }

  function drawPlate(ctx, plate, text) {
    var img = loadedImgs[plate.id];
    if (!img) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    if (!text) return;
    var fs = getFS(), cx = getTX() * W, cy = getTY() * H;
    ctx.font = fs + 'px "PlateFont","Anton","Arial Black",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Emboss
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(text, cx + 2, cy + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillText(text, cx - 1, cy - 1);
    ctx.fillStyle = plate.textColor; ctx.fillText(text, cx, cy);
  }

  function renderAll() {
    var plate = PLATES[selIdx], text = plateText;
    drawPlate(getCtx(el2dCanvas), plate, text);
    drawPlate(getCtx(elTexCanvas), plate, text);
    drawPlate(getCtx(elExpCanvas), plate, text);
    if (plateTex) plateTex.needsUpdate = true;
  }

  function renderGrid() {
    if (!elGrid) return;
    elGrid.innerHTML = '';
    PLATES.forEach(function(p, i) {
      var card = document.createElement('div');
      card.className = 'plate-style-card' + (i === selIdx ? ' selected' : '');
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H; cv.style.cssText = 'width:100%;height:auto;border-radius:4px;display:block;';
      drawPlate(cv.getContext('2d'), p, 'ABC123');
      var nm = document.createElement('span');
      nm.className = 'name'; nm.textContent = p.name;
      card.appendChild(cv); card.appendChild(nm);
      card.addEventListener('click', (function(idx) { return function() { selectPlate(idx); }; })(i));
      elGrid.appendChild(card);
    });
  }

  function selectPlate(i) {
    selIdx = i;
    var cards = elGrid.querySelectorAll('.plate-style-card');
    cards.forEach(function(c, idx) { c.classList.toggle('selected', idx === i); });
    renderAll();
  }

  /* ===== 2D / 3D Toggle ===== */
  function show2D() {
    if (el3d && renderer3d) el3d.style.display = 'none';
    if (el2dCanvas) { el2dCanvas.style.display = 'block'; el2dCanvas.style.width = '100%'; el2dCanvas.style.maxWidth = '700px'; }
    if (elToggle) elToggle.classList.add('off');
  }

  function show3D() {
    if (el3d) el3d.style.display = 'block';
    if (el2dCanvas) el2dCanvas.style.display = 'none';
    if (elToggle) elToggle.classList.remove('off');
  }

  /* ===== Events ===== */
  function bindAll() {
    if (elToggle) elToggle.onclick = function() {
      if (renderer3d && el3d) {
        if (el3d.style.display === 'block') show2D(); else show3D();
      }
    };
    if (elInput) {
      elInput.oninput = function(e) {
        plateText = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g,'').substring(0,8);
        e.target.value = plateText;
        if (elCnt) { elCnt.textContent = plateText.length + '/8'; elCnt.classList.toggle('full', plateText.length >= 8); }
        renderAll();
      };
    }
    var btnR = document.getElementById('plate-btn-reset');
    if (btnR) btnR.onclick = function() {
      if (elInput) { elInput.value = 'ABC1234'; plateText = 'ABC1234'; }
      if (elCnt) { elCnt.textContent = '7/8'; elCnt.classList.remove('full'); }
      selIdx = 0; renderGrid(); renderAll();
    };
    var btnE = document.getElementById('plate-btn-export');
    if (btnE) btnE.onclick = function() {
      drawPlate(getCtx(elExpCanvas), PLATES[selIdx], plateText);
      elExpCanvas.toBlob(function(b) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'plate_' + (plateText||'CUSTOM') + '_' + PLATES[selIdx].id + '.png';
        a.click();
      }, 'image/png');
    };
    // Sliders
    [elRngFS, elRngX, elRngY].forEach(function(s) {
      if (!s) return;
      s.oninput = function() {
        if (elValFS) elValFS.textContent = elRngFS.value;
        if (elValX) elValX.textContent = parseFloat(elRngX.value).toFixed(3);
        if (elValY) elValY.textContent = parseFloat(elRngY.value).toFixed(3);
        renderAll();
      };
    });
  }

  /* ===== Image Loading ===== */
  function preloadImages(cb) {
    var total = PLATES.length, done = 0;
    PLATES.forEach(function(p) {
      var img = new Image();
      img.onload = function() { loadedImgs[p.id] = img; checkDone(); };
      img.onerror = function() { checkDone(); };
      img.src = p.img;
      function checkDone() { done++; if (done >= total) cb(); }
    });
  }

  /* ===== 3D (Three.js, optional) ===== */
  var renderer3d, scene3d, camera3d, plateMesh, plateTex, animFrame3d;
  var _onMouseMove = null, _onMouseUp = null, _onResize = null;
  var _dragging3d = false, _px3d = 0, _py3d = 0;
  var _tries = 0;

  function try3D() {
    var stEl = document.getElementById('plate-3d-status');
    if (!el3d) return;
    if (typeof THREE === 'undefined') {
      _tries++;
      if (_tries < 10) { setTimeout(try3D, 600); return; }
      if (stEl) stEl.textContent = '3D 引擎加载超时，已切换至 2D 模式';
      return;
    }
    var w = el3d.clientWidth || el3d.offsetWidth || 0;
    if (w < 50) {
      _tries++;
      if (_tries < 15) { setTimeout(try3D, 400); return; }
      if (stEl) stEl.textContent = '预览区域未就绪，已切换至 2D 模式';
      return;
    }
    var testCanvas = document.createElement('canvas');
    var gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      if (stEl) stEl.textContent = 'WebGL 不可用，已切换至 2D 模式';
      return;
    }
    init3D();
  }

  function init3D() {
    try {
      // Clear status text
      var st = document.getElementById('plate-3d-status');
      if (st) st.remove();

      renderer3d = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      var rw = Math.max(el3d.clientWidth, 700), rh = Math.max(el3d.clientHeight, 350);
      renderer3d.setSize(rw, rh);
      el3d.appendChild(renderer3d.domElement);

      scene3d = new THREE.Scene();
      camera3d = new THREE.PerspectiveCamera(30, rw/rh, 0.1, 100);
      camera3d.position.set(0, 0, 8);

      // Side lighting — avoid direct front illumination
      scene3d.add(new THREE.AmbientLight(0xffffff, 0.1));
      var key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(6, 1.5, 3); scene3d.add(key);
      var fill = new THREE.DirectionalLight(0xffffff, 0.15);
      fill.position.set(-5, 0.5, 2); scene3d.add(fill);
      var rim = new THREE.DirectionalLight(0xffffff, 0.5);
      rim.position.set(0, -1.5, 2.5); scene3d.add(rim);
      var top = new THREE.DirectionalLight(0xd4a843, 0.3);
      top.position.set(0, 5, 0.5); scene3d.add(top);

      plateTex = new THREE.CanvasTexture(elTexCanvas);
      plateTex.colorSpace = THREE.SRGBColorSpace;
      plateTex.minFilter = THREE.LinearFilter;
      plateTex.magFilter = THREE.LinearFilter;

      var mat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.08 });
      plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), mat);
      plateMesh.rotation.x = -0.15;
      scene3d.add(plateMesh);

      // Mouse drag
      var dom = renderer3d.domElement;
      dom.addEventListener('mousedown', function(e) { _dragging3d = true; _px3d = e.clientX; _py3d = e.clientY; });
      _onMouseMove = function(e) {
        if (!_dragging3d || !plateMesh) return;
        plateMesh.rotation.y += (e.clientX - _px3d) * 0.005;
        plateMesh.rotation.x += (e.clientY - _py3d) * 0.005;
        plateMesh.rotation.y = Math.max(-1.2, Math.min(1.2, plateMesh.rotation.y));
        plateMesh.rotation.x = Math.max(-1.0, Math.min(1.0, plateMesh.rotation.x));
        _px3d = e.clientX; _py3d = e.clientY;
      };
      _onMouseUp = function() { _dragging3d = false; };
      _onResize = function() {
        if (!renderer3d || !el3d) return;
        var w2 = el3d.clientWidth, h2 = el3d.clientHeight;
        renderer3d.setSize(w2, h2);
        camera3d.aspect = w2/h2; camera3d.updateProjectionMatrix();
      };
      window.addEventListener('mousemove', _onMouseMove);
      window.addEventListener('mouseup', _onMouseUp);
      window.addEventListener('resize', _onResize);

      function loop() {
        animFrame3d = requestAnimationFrame(loop);
        renderer3d.render(scene3d, camera3d);
      }
      loop();

      // Switch to 3D view
      show3D();
    } catch(e) {
      console.warn('[PlateCreator] 3D failed:', e.message);
    }
  }

  return { init: init, destroy: destroy };
})();