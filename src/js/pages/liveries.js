/* ===== Livery Reference Page ===== */
window.GTA = window.GTA || {};

GTA.Liveries = (function () {
  var Utils = GTA.Utils;
  var allLiveries = [];
  var vehicleIndex = {}; // vehicle name → entry

  async function init() {
    var container = document.getElementById('liveries-content');
    if (!container) return;

    // Load data
    if (allLiveries.length === 0) {
      try {
        var resp = await fetch('../../liveries.json');
        var data = await resp.json();
        allLiveries = data.vehicles || data;
        (data.notes || []).forEach(function (n) { vehicleIndex['__note__' + n.substring(0, 20)] = { vehicle: n, liveries: [] }; });
        allLiveries.forEach(function (entry) {
          vehicleIndex[entry.vehicle] = entry;
        });
      } catch (e) {
        container.innerHTML = '<p style="padding:var(--space-lg);color:var(--color-danger)">加载涂装数据失败</p>';
        return;
      }
    }

    renderPage(container);
  }

  function renderPage(container) {
    container.innerHTML =
      '<h1 style="margin-bottom:var(--space-sm)">涂装对照表</h1>' +
      '<p style="color:var(--color-text-muted);margin-bottom:var(--space-md)">由 尾立沙拉furret 制作，原始 PDF 嵌入展示</p>' +
      '<div class="livery-pdf-wrap">' +
        '<embed src="../../assets/liveries.pdf" type="application/pdf" width="100%" height="800px" style="border:none;border-radius:var(--radius-md)">' +
      '</div>';
  }

  function destroy() {}

  return { init: init, destroy: destroy };
})();
