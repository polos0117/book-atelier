/* Shared appearance only. Character settings and prompt generation stay independent. */
(function () {
  'use strict';
  var root = document.documentElement;
  var keys = { theme: 'book_room_v1', background: 'book_background_v1', density: 'atelier_density_v1' };
  var themeColors = {sunlit: "#f8f4eb", moonlit: "#202630", hanok: "#f3f1e9", forest: "#f1f6ed", candlelit: "#211b25"};
  var viewportFrame = 0;
  function fitVisibleViewport() {
    if (viewportFrame) cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(function () {
      viewportFrame = 0;
      var viewport = window.visualViewport;
      var height = viewport && viewport.height ? viewport.height : window.innerHeight;
      if (height) root.style.setProperty('--atelier-vh', Math.round(height * 100) / 100 + 'px');
    });
  }
  function normalize(key, value) {
    return key === 'theme' ? (themeColors[value] ? value : 'sunlit')
      : key === 'background' ? (value === 'off' ? 'off' : 'on')
      : (value === 'relaxed' ? value : 'compact');
  }
  function apply(key, value) {
    root.dataset[key] = normalize(key, value);
    if (key === 'theme') {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = themeColors[root.dataset.theme];
    }
  }
  function read(key) {
    var value;
    try { value = localStorage.getItem(keys[key]); } catch (e) {}
    apply(key, value);
  }
  /* Copy the previously selected shelf once; retain every old shelf and the shared atelier preference. */
  try {
    var shelves = JSON.parse(localStorage.getItem('book_hall_v1') || '{}');
    var previous = localStorage.getItem('atelier_theme_v1') || 'daylight';
    if (shelves && !Array.isArray(shelves) && typeof shelves === 'object' &&
        !Object.prototype.hasOwnProperty.call(shelves, 'sunlit') && Array.isArray(shelves[previous])) {
      shelves.sunlit = shelves[previous].slice(0, 12);
      localStorage.setItem('book_hall_v1', JSON.stringify(shelves));
    }
  } catch (e) {}
  Object.keys(keys).forEach(read);
  fitVisibleViewport();
  window.addEventListener('resize', fitVisibleViewport, { passive: true });
  window.addEventListener('orientationchange', fitVisibleViewport, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitVisibleViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', fitVisibleViewport, { passive: true });
  }
  window.AtelierAppearance = {
    themes: Object.freeze(Object.keys(themeColors)),
    get: function () { return { theme: root.dataset.theme, background: root.dataset.background, density: root.dataset.density }; },
    set: function (key, value) {
      if (!keys[key]) return;
      apply(key, value);
      try { localStorage.setItem(keys[key], root.dataset[key]); } catch (e) {}
      window.dispatchEvent(new Event('atelier-appearance'));
    }
  };
  window.addEventListener('storage', function (event) {
    Object.keys(keys).forEach(function (key) {
      if (event.key === keys[key] || event.key === null) read(key);
    });
    window.dispatchEvent(new Event('atelier-appearance'));
  });
})();
