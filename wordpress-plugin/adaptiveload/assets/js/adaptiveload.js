/*!
 * AdaptiveLoad.js v1.0.0
 * A smart, self-learning loading indicator library.
 * Free & open source — MIT License
 * By Suryagopal Dhara — https://suryacreates.com
 * https://github.com/SuryagopalDhara/AdaptiveLoad
 *
 * No dependencies. Works standalone in any HTML/JS site,
 * or via the AdaptiveLoad WordPress plugin.
 */

(function (global, factory) {
  typeof module === 'object' && module.exports
    ? (module.exports = factory())
    : (global.AdaptiveLoad = factory());
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var DEFAULTS = {
    // Time thresholds in milliseconds
    thresholds: {
      spinner: 1000,     // show spinner after this long
      staticText: 3000,  // switch to static text after this long
      dynamicText: 5000  // switch to rotating dynamic text after this long
    },
    // Messages shown at the "static text" stage
    staticMessages: ['Loading...'],
    // Messages rotated through at the "dynamic text" stage
    dynamicMessages: ['Still working on it...', 'Almost there...', 'Just a moment more...'],
    dynamicRotateInterval: 2500,
    // How much to pull thresholds forward (in ms) per "slow" tier detected.
    // e.g. a value of 500 means slow-network users see spinner/text ~0.5s sooner each stage.
    networkAdjustMs: 500,
    // Respect prefers-reduced-motion
    respectReducedMotion: true,
    // Container / mount target. Defaults to a fixed overlay appended to body.
    target: null,
    // Storage key for session-based learning
    storageKey: 'adaptiveload_speed_tier',
    // Called with (state) whenever the UI state changes: 'idle' | 'spinner' | 'static' | 'dynamic'
    onStateChange: null,
    // Custom render functions (optional overrides)
    renderSpinner: null,
    renderStaticText: null,
    renderDynamicText: null,
    // Enable local learning (records load times per-URL into localStorage)
    enableLearning: true,
    learningStorageKey: 'adaptiveload_page_stats'
  };

  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  function deepMerge(target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          target[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  // ---- Network speed detection -------------------------------------------

  function detectNetworkTier() {
    // Primary: Network Information API (Chrome/Edge/Android — not Safari/Firefox)
    var conn = (typeof navigator !== 'undefined') &&
      (navigator.connection || navigator.mozConnection || navigator.webkitConnection);

    if (conn && conn.effectiveType) {
      var type = conn.effectiveType;
      if (type === 'slow-2g' || type === '2g') return 'slow';
      if (type === '3g') return 'medium';
      return 'fast'; // 4g and above
    }
    return null; // unsupported — fall back to session learning
  }

  function getSessionTier(storageKey) {
    try {
      return sessionStorage.getItem(storageKey);
    } catch (e) {
      return null;
    }
  }

  function setSessionTier(storageKey, tier) {
    try {
      sessionStorage.setItem(storageKey, tier);
    } catch (e) { /* storage unavailable, ignore */ }
  }

  // Classify a measured load time (ms) into a tier, used as a fallback
  // signal when the Network Information API isn't available.
  function classifyByDuration(ms) {
    if (ms < 800) return 'fast';
    if (ms < 2500) return 'medium';
    return 'slow';
  }

  // ---- Local learning (per-URL historical load times) --------------------

  function readStats(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeStats(key, stats) {
    try {
      localStorage.setItem(key, JSON.stringify(stats));
    } catch (e) { /* ignore quota / privacy-mode errors */ }
  }

  function recordLoad(key, url, durationMs) {
    var stats = readStats(key);
    var entry = stats[url] || { count: 0, avg: 0 };
    entry.avg = (entry.avg * entry.count + durationMs) / (entry.count + 1);
    entry.count += 1;
    stats[url] = entry;
    writeStats(key, stats);
    return entry;
  }

  function getPageTier(key, url) {
    var stats = readStats(key);
    var entry = stats[url];
    if (!entry || entry.count < 2) return null; // not enough data yet
    return classifyByDuration(entry.avg);
  }

  // ---- Default DOM rendering ----------------------------------------------

  function injectStylesOnce() {
    if (document.getElementById('adaptiveload-styles')) return;
    var css = [
      '.adaptiveload-overlay{position:fixed;inset:0;display:flex;align-items:center;',
      'justify-content:center;flex-direction:column;gap:12px;background:rgba(255,255,255,0.0);',
      'pointer-events:none;z-index:999999;}',
      '.adaptiveload-spinner{width:36px;height:36px;border-radius:50%;',
      'border:3px solid rgba(0,0,0,0.15);border-top-color:rgba(0,0,0,0.65);',
      'animation:adaptiveload-spin 0.8s linear infinite;}',
      '@keyframes adaptiveload-spin{to{transform:rotate(360deg);}}',
      '.adaptiveload-text{font:500 14px/1.4 system-ui,-apple-system,sans-serif;',
      'color:rgba(0,0,0,0.75);background:rgba(255,255,255,0.9);padding:6px 14px;',
      'border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,0.1);}',
      '@media (prefers-reduced-motion: reduce){.adaptiveload-spinner{animation-duration:2s;}}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'adaptiveload-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createOverlay(target) {
    var el = document.createElement('div');
    el.className = 'adaptiveload-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    (target || document.body).appendChild(el);
    return el;
  }

  // ---- Main controller -----------------------------------------------------

  function AdaptiveLoadInstance(userOptions) {
    var opts = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), userOptions || {});
    var startTime = null;
    var timers = [];
    var rotateTimer = null;
    var overlay = null;
    var state = 'idle';
    var pageUrl = (typeof location !== 'undefined') ? location.pathname : 'unknown';

    function setState(next) {
      state = next;
      if (typeof opts.onStateChange === 'function') {
        try { opts.onStateChange(next); } catch (e) { /* swallow user errors */ }
      }
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
      if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    }

    function ensureOverlay() {
      injectStylesOnce();
      if (!overlay) overlay = createOverlay(opts.target);
      return overlay;
    }

    function showSpinner() {
      var el = ensureOverlay();
      if (opts.renderSpinner) {
        opts.renderSpinner(el);
      } else {
        el.innerHTML = '<div class="adaptiveload-spinner"></div>';
      }
      setState('spinner');
    }

    function showStaticText() {
      var el = ensureOverlay();
      var msg = opts.staticMessages[0];
      if (opts.renderStaticText) {
        opts.renderStaticText(el, msg);
      } else {
        el.innerHTML = '<div class="adaptiveload-spinner"></div><div class="adaptiveload-text">' +
          escapeHtml(msg) + '</div>';
      }
      setState('static');
    }

    function showDynamicText() {
      var el = ensureOverlay();
      var messages = opts.dynamicMessages;
      var i = 0;

      function render() {
        var msg = messages[i % messages.length];
        if (opts.renderDynamicText) {
          opts.renderDynamicText(el, msg);
        } else {
          el.innerHTML = '<div class="adaptiveload-spinner"></div><div class="adaptiveload-text">' +
            escapeHtml(msg) + '</div>';
        }
        i++;
      }

      render();
      rotateTimer = setInterval(render, opts.dynamicRotateInterval);
      setState('dynamic');
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function computeAdjustedThresholds() {
      var t = opts.thresholds;
      var adjusted = { spinner: t.spinner, staticText: t.staticText, dynamicText: t.dynamicText };

      // Signal priority: live Network Info API > per-page history > session-learned tier
      var tier = detectNetworkTier();
      if (!tier) tier = getPageTier(opts.learningStorageKey, pageUrl);
      if (!tier) tier = getSessionTier(opts.storageKey);

      if (tier === 'slow') {
        adjusted.spinner = Math.max(200, t.spinner - opts.networkAdjustMs);
        adjusted.staticText = Math.max(adjusted.spinner + 200, t.staticText - opts.networkAdjustMs);
        adjusted.dynamicText = Math.max(adjusted.staticText + 200, t.dynamicText - opts.networkAdjustMs);
      } else if (tier === 'medium') {
        var half = opts.networkAdjustMs / 2;
        adjusted.spinner = Math.max(200, t.spinner - half);
        adjusted.staticText = Math.max(adjusted.spinner + 200, t.staticText - half);
        adjusted.dynamicText = Math.max(adjusted.staticText + 200, t.dynamicText - half);
      }
      return adjusted;
    }

    function start() {
      startTime = now();
      clearTimers();
      setState('idle');

      var t = computeAdjustedThresholds();

      timers.push(setTimeout(showSpinner, t.spinner));
      timers.push(setTimeout(showStaticText, t.staticText));
      timers.push(setTimeout(showDynamicText, t.dynamicText));
    }

    function stop() {
      clearTimers();
      if (overlay) {
        overlay.innerHTML = '';
      }
      setState('idle');

      if (startTime !== null) {
        var duration = now() - startTime;
        startTime = null;

        // Feed back into local learning + session tier for next navigation
        if (opts.enableLearning) {
          recordLoad(opts.learningStorageKey, pageUrl, duration);
        }
        setSessionTier(opts.storageKey, classifyByDuration(duration));

        return duration;
      }
      return null;
    }

    function destroy() {
      clearTimers();
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
    }

    return {
      start: start,
      stop: stop,
      destroy: destroy,
      getState: function () { return state; },
      // Exposed for advanced/custom integrations (e.g. WP admin dashboard charts)
      _internal: { detectNetworkTier: detectNetworkTier, getPageTier: getPageTier, readStats: readStats }
    };
  }

  AdaptiveLoadInstance.VERSION = '1.0.0';
  return AdaptiveLoadInstance;
});
