/* ===== Upload Zone Component ===== */
window.GTA = window.GTA || {};

GTA.UploadZone = (function () {
  var zone = null;
  var fileInput = null;
  var onFileCallback = null;

  function init(zoneId, inputId, onFile) {
    zone = document.getElementById(zoneId);
    fileInput = document.getElementById(inputId);
    onFileCallback = onFile;

    if (!zone || !fileInput) return;

    // Click to open file dialog
    zone.addEventListener('click', function () {
      fileInput.click();
    });

    // File selected via input
    fileInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    // Drag events
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drag-over');

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  function handleFile(file) {
    // Validate image type
    var validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];
    if (validTypes.indexOf(file.type) === -1) {
      GTA.Toast.error('不支持的图片格式，请使用 PNG/JPG/WebP/BMP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      GTA.Toast.error('图片超过 10MB 限制');
      return;
    }

    if (onFileCallback) {
      onFileCallback(file);
    }
  }

  function setEnabled(enabled) {
    if (zone) {
      zone.style.pointerEvents = enabled ? 'auto' : 'none';
      zone.style.opacity = enabled ? '1' : '0.5';
    }
  }

  return { init: init, setEnabled: setEnabled };
})();
