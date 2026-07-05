/* ===== Hash-Based SPA Router ===== */
window.GTA = window.GTA || {};

GTA.Router = (function () {
  var currentRoute = null;
  var currentPage = null;
  var currentController = null;

  /**
   * Route definition table
   * Each route has:
   *   - pattern: regex to match the hash
   *   - page: page identifier string (matches data-page attribute)
   *   - controller: the page module (must have init/destroy)
   *   - parseParams: function to extract params from match groups
   */
  var routes = [
    {
      pattern: /^#\/dashboard$/,
      page: 'dashboard',
      controller: GTA.Dashboard,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/encyclopedia$/,
      page: 'encyclopedia',
      controller: GTA.Encyclopedia,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/vehicle\/([^/]+)$/,
      page: 'vehicle-detail',
      controller: GTA.VehicleDetail,
      parseParams: function (m) { return { id: m[1] }; }
    },
    {
      pattern: /^#\/scanner$/,
      page: 'scanner',
      controller: GTA.Scanner,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/garage$/,
      page: 'garage',
      controller: GTA.Garage,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/garage\/(\d+)$/,
      page: 'garage',
      controller: GTA.Garage,
      parseParams: function (m) { return { id: m[1] }; }
    },
    {
      pattern: /^#\/mods\/([^/]+)$/,
      page: 'modifications',
      controller: GTA.Modifications,
      parseParams: function (m) { return { id: m[1] }; }
    },
    {
      pattern: /^#\/album\/([^/]+)$/,
      page: 'album',
      controller: GTA.Album,
      parseParams: function (m) { return { id: m[1] }; }
    },
    {
      pattern: /^#\/share$/,
      page: 'share',
      controller: GTA.Share,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/liveries$/,
      page: 'liveries',
      controller: GTA.Liveries,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/colors(?:\?(.+))?$/,
      page: 'colors',
      controller: GTA.Colors,
      parseParams: function (m) {
        var params = {};
        if (m[1]) {
          var parts = m[1].split('&');
          parts.forEach(function (p) {
            var kv = p.split('=');
            if (kv.length === 2) params[kv[0]] = kv[1];
          });
        }
        return params;
      }
    },
    {
      pattern: /^#\/wiki-colors$/,
      page: 'wiki-colors',
      controller: GTA.WikiColors,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/compare$/,
      page: 'compare',
      controller: GTA.Compare,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/dlc-timeline$/,
      page: 'dlc-timeline',
      controller: GTA.DlcTimeline,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/plate-creator$/,
      page: 'plate-creator',
      controller: GTA.PlateCreator,
      parseParams: function () { return {}; }
    },
    {
      pattern: /^#\/settings$/,
      page: 'settings',
      controller: GTA.Settings,
      parseParams: function () { return {}; }
    }
  ];

  function init() {
    // Bind hash change
    window.addEventListener('hashchange', function () {
      resolveRoute();
    });

    // Initial route
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    } else {
      resolveRoute();
    }

    // Bind back-button data-nav attributes
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-nav]');
      if (btn) {
        var target = btn.getAttribute('data-nav');
        if (target) {
          e.preventDefault();
          navigate(target);
        }
      }
    });
  }

  /**
   * Navigate to a route
   * @param {string} route - Route string like 'dashboard' or 'vehicle/pfister-811'
   */
  function navigate(route) {
    if (route.indexOf('#') !== 0) {
      route = '#/' + route;
    }
    // Encode special chars in the route segments after #/
    var hashPart = route.substring(2);
    var encoded = hashPart.split('/').map(function(seg) {
      return encodeURIComponent(seg);
    }).join('/');
    window.location.hash = '#/' + encoded;
  }

  function resolveRoute() {
    var hash = window.location.hash;
    if (!hash) {
      hash = '#/dashboard';
    }
    // Decode URI-encoded hash
    hash = decodeURIComponent(hash);

    var matched = false;

    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      var match = hash.match(route.pattern);

      if (match) {
        // Destroy previous controller
        if (currentController && currentController.destroy) {
          currentController.destroy();
        }

        // Remove previous animations
        var allSections = document.querySelectorAll('.page-section');
        allSections.forEach(function (s) {
          s.classList.remove('active', 'page-enter', 'page-exit');
        });

        // Show target page with enter animation
        var targetSection = document.querySelector('[data-page="' + route.page + '"]');
        if (targetSection) {
          targetSection.classList.add('active', 'page-enter');
          // Clean up animation class after it finishes
          targetSection.addEventListener('animationend', function handler() {
            targetSection.classList.remove('page-enter');
            targetSection.removeEventListener('animationend', handler);
          });
        }

        // Init new controller
        var params = route.parseParams(match);
        currentController = route.controller;
        currentPage = route.page;
        currentRoute = hash;

        if (currentController && currentController.init) {
          currentController.init(params);
        }

        // Emit route changed event
        GTA.EventBus.emit('route:changed', { page: route.page, params: params, hash: hash });

        // Scroll to top
        var content = document.getElementById('app-content');
        if (content) {
          content.scrollTop = 0;
        }

        matched = true;
        break;
      }
    }

    if (!matched) {
      console.warn('[Router] No route matched for:', hash);
      navigate('dashboard');
    }
  }

  function getCurrentPage() {
    return currentPage;
  }

  return { init: init, navigate: navigate, routes: routes, getCurrentPage: getCurrentPage };
})();
