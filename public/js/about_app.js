/**
 * about_app.js — Neura App Metadata Client Loader
 * ================================================
 * Fetches app metadata from /api/about (sourced from about_app.json)
 * and populates all DOM elements with data-about="..." attributes.
 *
 * Usage in HTML:
 *   <span data-about="app.version">v1.0</span>      <- auto-replaced
 *   <span data-about="author.name">...</span>
 *   <span data-about="legal.copyright_year">2026</span>
 *
 * This script is self-initializing on DOMContentLoaded.
 */

(function () {
  'use strict';

  // Cache: store fetched data in-memory so multiple pages share the same call
  let _aboutCache = null;
  let _fetchPromise = null;

  // Deep-get a dot-separated key path from an object.
  function deepGet(obj, path) {
    return path.split('.').reduce(function(acc, key) {
      return acc != null ? acc[key] : undefined;
    }, obj);
  }

  // Fetch about data from the server (or return cached result).
  function fetchAbout() {
    if (_aboutCache) return Promise.resolve(_aboutCache);
    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = fetch('/api/about')
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load about_app.json');
        return res.json();
      })
      .then(function(data) {
        _aboutCache = data;
        _fetchPromise = null;
        return data;
      })
      .catch(function(err) {
        console.warn('[about_app.js] Could not load app metadata:', err);
        _fetchPromise = null;
        return null;
      });

    return _fetchPromise;
  }

  // Populate all [data-about] elements in the document.
  function populateAboutElements(data, root) {
    if (!data) return;
    var scope = root || document;

    scope.querySelectorAll('[data-about]').forEach(function(el) {
      var key = el.getAttribute('data-about');
      var value = deepGet(data, key);

      if (value == null) return;

      var isHtmlKey = el.hasAttribute('data-about-html');
      if (isHtmlKey) {
        el.innerHTML = String(value);
      } else {
        var format = el.getAttribute('data-about-format');
        var display = String(value);

        if (format === 'copyright') {
          display = '\u00A9 ' + value;
        } else if (format === 'version') {
          display = display.startsWith('v') ? display : 'v' + display;
        }

        el.textContent = display;
      }

      if (el.style.visibility === 'hidden') {
        el.style.visibility = '';
      }
    });
  }

  // Expose a global NeuraAbout API for scripts that need the data directly.
  window.NeuraAbout = {
    // Get the full about data (returns a Promise).
    get: fetchAbout,

    // Get a specific value (returns a Promise resolving to the value).
    getValue: function(key) {
      return fetchAbout().then(function(data) {
        return data ? deepGet(data, key) : null;
      });
    },

    // Manually re-populate [data-about] elements within an optional root.
    // Useful after dynamically injecting new HTML into the DOM.
    populate: function(root) {
      return fetchAbout().then(function(data) {
        populateAboutElements(data, root);
      });
    },

    // Return the cache (null if not fetched yet).
    getCached: function() {
      return _aboutCache;
    }
  };

  // Auto-init: populate on DOMContentLoaded
  function init() {
    fetchAbout().then(function(data) {
      if (data) populateAboutElements(data, document);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
