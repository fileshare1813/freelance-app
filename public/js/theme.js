// ===== THEME SYSTEM - FreelanceHub =====
// Place this file at: public/js/theme.js
// Include it in ALL views, preferably in <head> with defer, or at top of body

(function () {
  const STORAGE_KEY = 'fh_theme';
  const DARK  = 'dark';
  const LIGHT = 'light';

  // ── Apply theme immediately (before paint) to avoid flash ──
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body && document.body.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
    updateChartColors(theme);
  }

  function updateToggleIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (!icon) return;
    if (theme === DARK) {
      icon.className = 'fas fa-sun';
      btn.title = 'Switch to Light Mode';
    } else {
      icon.className = 'fas fa-moon';
      btn.title = 'Switch to Dark Mode';
    }
  }

  function getSavedTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function saveTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || LIGHT;
  }

  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === DARK ? LIGHT : DARK;
    applyTheme(next);
    saveTheme(next);

    // Trigger chart color update after a short delay (charts need re-render)
    setTimeout(() => updateChartColors(next), 50);
  }

  // ── Chart.js color patching for dark mode ──
  function updateChartColors(theme) {
    if (typeof Chart === 'undefined') return;

    const isDark = theme === DARK;

    const textColor   = isDark ? '#94a3b8' : '#64748b';
    const gridColor   = isDark ? '#252540' : '#f1f5f9';
    const borderColor = isDark ? '#2d2d4e' : '#e2e8f0';

    // Update defaults
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = borderColor;

    // Update all existing chart instances
    Object.values(Chart.instances || {}).forEach(chart => {
      if (!chart || !chart.options) return;

      // Scales
      if (chart.options.scales) {
        ['x', 'y'].forEach(axis => {
          const scale = chart.options.scales[axis];
          if (!scale) return;
          if (scale.ticks)  scale.ticks.color = textColor;
          if (scale.grid)   scale.grid.color  = gridColor;
        });
      }

      // Legend
      if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
        chart.options.plugins.legend.labels.color = textColor;
      }

      chart.update('none'); // 'none' = no animation, just re-render
    });
  }

  // ── Init: apply saved/system theme immediately ──
  const saved  = getSavedTheme();
  const system = getSystemTheme();
  const initial = saved || system;

  // Apply synchronously so there's no flash
  document.documentElement.setAttribute('data-theme', initial);

  // ── Setup after DOM ready ──
  function setup() {
    applyTheme(initial);

    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.addEventListener('click', toggleTheme);

    // Watch OS theme changes (if user hasn't manually set one)
    if (!saved && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
          const savedNow = getSavedTheme();
          if (!savedNow) applyTheme(e.matches ? DARK : LIGHT);
        });
    }

    // Re-patch charts whenever Chart.js finishes drawing
    // (needed because charts initialize after this script runs)
    if (typeof Chart !== 'undefined') {
      const origDraw = Chart.prototype.draw;
      Chart.prototype.draw = function (...args) {
        origDraw.apply(this, args);
        updateChartColors(getCurrentTheme());
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // Expose for inline use
  window.__fhTheme = { toggle: toggleTheme, apply: applyTheme, get: getCurrentTheme };
})();