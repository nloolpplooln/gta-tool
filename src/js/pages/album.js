/* ===== Vehicle Album Page ===== */
window.GTA = window.GTA || {};

GTA.Album = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var currentVehicleId = null;
  var currentVehicle = null;
  var objectUrls = [];

  function init(params) {
    var vehicleId = params.id;
    if (!vehicleId) {
      GTA.Router.navigate('encyclopedia');
      return;
    }

    currentVehicleId = vehicleId;
    currentVehicle = Catalog.getById(vehicleId);
    if (!currentVehicle) {
      GTA.Toast.error('未找到该载具');
      GTA.Router.navigate('encyclopedia');
      return;
    }

    // Check if owned
    GTA.db.ready().then(async function () {
      var owned = await GTA.db.ownedVehicles.get(currentVehicleId);
      if (!owned) {
        GTA.Toast.warning('该载具尚未收藏，请先加入收藏');
        GTA.Router.navigate('vehicle/' + currentVehicleId);
        return;
      }
      render();
      loadPhotos();
    });
  }

  function destroy() {
    cleanupUrls();
    currentVehicleId = null;
    currentVehicle = null;
  }

  function cleanupUrls() {
    objectUrls.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    objectUrls = [];
  }

  function render() {
    var v = currentVehicle;
    if (!v) return;

    // Album title
    var titleEl = document.getElementById('album-title');
    if (titleEl) {
      titleEl.textContent = Utils.escapeHtml(v.name) + ' - 相册';
    }

    // Bind upload button
    var uploadBtn = document.getElementById('btn-upload-photo');
    var fileInput = document.getElementById('album-file-input');

    if (uploadBtn && fileInput) {
      uploadBtn.onclick = function () { fileInput.click(); };
      fileInput.onchange = function (e) {
        if (e.target.files && e.target.files.length > 0) {
          handleUploads(e.target.files);
          e.target.value = '';
        }
      };
    }

    // Bind back button
    var backBtn = document.getElementById('album-back-btn');
    if (backBtn) {
      backBtn.onclick = function () {
        GTA.Router.navigate('vehicle/' + currentVehicleId);
      };
    }
  }

  async function handleUploads(fileList) {
    var files = Array.from(fileList);
    var uploaded = 0;
    var failed = 0;

    for (var i = 0; i < files.length; i++) {
      try {
        // Check if this should be the cover photo
        var existingPhotos = await GTA.ImageStore.getPhotos(currentVehicleId);
        var isCover = existingPhotos.length === 0; // First photo becomes cover

        await GTA.ImageStore.savePhoto(currentVehicleId, files[i], isCover);
        uploaded++;
      } catch (e) {
        console.error('[Album] Upload error:', e);
        failed++;
      }
    }

    if (uploaded > 0) GTA.Toast.success('成功上传 ' + uploaded + ' 张');
    if (failed > 0) GTA.Toast.error(failed + ' 张上传失败');

    loadPhotos();
  }

  async function loadPhotos() {
    var grid = document.getElementById('album-grid');
    var countEl = document.getElementById('album-count');
    if (!grid) return;

    try {
      cleanupUrls();
      var photos = await GTA.ImageStore.getPhotos(currentVehicleId);

      if (countEl) countEl.textContent = photos.length + ' 张照片';

      if (photos.length === 0) {
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1">' +
            '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="114" height="114" rx="10"/><circle cx="42" cy="45" r="12"/><path d="M3 95l30-30 25 25 20-20 39 39"/></svg>' +
            '<p>还没有上传照片</p>' +
          '</div>';
        return;
      }

      grid.innerHTML = '';

      // Add upload tile
      var uploadTile = document.createElement('div');
      uploadTile.className = 'album-upload';
      uploadTile.innerHTML = '<span class="upload-plus">+</span><span>上传图片</span>';
      uploadTile.addEventListener('click', function () {
        document.getElementById('album-file-input').click();
      });
      grid.appendChild(uploadTile);

      // Add photo cards
      photos.forEach(function (photo) {
        var url = GTA.ImageStore.getPhotoUrl(photo, true);
        objectUrls.push(url);

        var tile = document.createElement('div');
        tile.className = 'album-photo';

        if (url) {
          tile.innerHTML =
            '<img src="' + url + '" alt="" loading="lazy">' +
            (photo.isCover ? '<span class="cover-badge">封面</span>' : '') +
            '<div class="photo-overlay">' +
              (!photo.isCover ? '<button class="btn btn-secondary" data-action="cover" data-id="' + photo.id + '">设为封面</button>' : '') +
              '<button class="btn btn-danger" data-action="delete" data-id="' + photo.id + '">删除</button>' +
            '</div>';
        }

        // Click to view full image
        tile.addEventListener('click', function (e) {
          if (e.target.closest('.photo-overlay')) return;
          var fullUrl = GTA.ImageStore.getPhotoUrl(photo, false);
          showLightbox(fullUrl);
        });

        grid.appendChild(tile);
      });

      // Bind overlay buttons
      grid.querySelectorAll('[data-action="cover"]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = parseInt(this.getAttribute('data-id'));
          GTA.ImageStore.setCover(id).then(function () {
            GTA.Toast.success('已设为封面');
            loadPhotos();
          });
        });
      });

      grid.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = parseInt(this.getAttribute('data-id'));
          GTA.Modal.show({
            title: '删除照片',
            body: '<p>确定要删除这张照片吗？此操作不可撤销。</p>',
            confirmText: '删除',
            cancelText: '取消',
            onConfirm: function () {
              GTA.ImageStore.deletePhoto(id).then(function () {
                GTA.Toast.info('照片已删除');
                loadPhotos();
              });
            }
          });
        });
      });

    } catch (e) {
      console.error('[Album] Load error:', e);
      grid.innerHTML = '<p class="text-muted">加载失败</p>';
    }
  }

  function showLightbox(url) {
    if (!url) return;

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML =
      '<span class="lightbox-close">✕</span>' +
      '<img src="' + url + '" alt="">';

    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox-close')) {
        lb.remove();
        URL.revokeObjectURL(url);
      }
    });

    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        lb.remove();
        URL.revokeObjectURL(url);
        document.removeEventListener('keydown', handler);
      }
    });

    document.body.appendChild(lb);
  }

  return { init: init, destroy: destroy };
})();
