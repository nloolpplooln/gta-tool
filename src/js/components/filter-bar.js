/* ===== Filter Bar (Encyclopedia) ===== */
window.GTA = window.GTA || {};

GTA.FilterBar = (function () {
  var searchInput = null;
  var brandSelect = null;
  var typeSelect = null;
  var ownedSelect = null;
  var discontinuedCheckbox = null;
  var onChangeCallback = null;

  function init(onChange) {
    searchInput = document.getElementById('filter-search');
    brandSelect = document.getElementById('filter-brand');
    typeSelect = document.getElementById('filter-type');
    ownedSelect = document.getElementById('filter-owned');
    discontinuedCheckbox = document.getElementById('filter-discontinued');

    onChangeCallback = onChange;

    // Populate brand and type dropdowns from catalog
    populateDropdowns();

    // Attach listeners
    var debouncedOnChange = GTA.Utils.debounce(function () {
      if (onChangeCallback) onChangeCallback(getFilters());
    }, 200);

    if (searchInput) searchInput.addEventListener('input', debouncedOnChange);
    if (brandSelect) brandSelect.addEventListener('change', function () { onChangeCallback(getFilters()); });
    if (typeSelect) typeSelect.addEventListener('change', function () { onChangeCallback(getFilters()); });
    if (ownedSelect) ownedSelect.addEventListener('change', function () { onChangeCallback(getFilters()); });
    if (discontinuedCheckbox) discontinuedCheckbox.addEventListener('change', function () { onChangeCallback(getFilters()); });
  }

  function populateDropdowns() {
    var brands = GTA.VehicleCatalog.getBrands();
    var types = GTA.VehicleCatalog.getTypes();

    // Brands
    if (brandSelect) {
      brandSelect.innerHTML = '<option value="">全部品牌</option>';
      brands.forEach(function (b) {
        var opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brandSelect.appendChild(opt);
      });
    }

    // Types
    if (typeSelect) {
      typeSelect.innerHTML = '<option value="">全部类型</option>';
      types.forEach(function (t) {
        var opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        typeSelect.appendChild(opt);
      });
    }
  }

  /**
   * Get current filter values
   */
  function getFilters() {
    return {
      search: searchInput ? searchInput.value.toLowerCase().trim() : '',
      brand: brandSelect ? brandSelect.value : '',
      type: typeSelect ? typeSelect.value : '',
      owned: ownedSelect ? ownedSelect.value : '',
      discontinued: discontinuedCheckbox ? discontinuedCheckbox.checked : false
    };
  }

  /**
   * Update dropdowns (e.g. after catalog reload)
   */
  function refresh() {
    populateDropdowns();
  }

  return { init: init, getFilters: getFilters, refresh: refresh };
})();
