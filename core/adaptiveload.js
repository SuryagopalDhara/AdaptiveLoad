/*!
 * AdaptiveLoad.js v2.0.0
 * A smart, self-learning loading indicator — for page loads, buttons,
 * forms, and any async action. Free & open source — MIT License.
 * https://github.com/SuryagopalDhara/AdaptiveLoad
 *
 * No required dependencies. Works standalone in any HTML/JS site,
 * or via the AdaptiveLoad WordPress plugin.
 */

(function (global, factory) {
  typeof module === 'object' && module.exports
    ? (module.exports = factory())
    : (global.AdaptiveLoad = factory());
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var DEFAULTS = {
    thresholds: { spinner: 1000, staticText: 3000, dynamicText: 5000 },
    staticMessages: ['Loading...'],
    dynamicMessages: ['Still working on it...', 'Almost there...', 'Just a moment more...'],
    dynamicRotateInterval: 2500,
    networkAdjustMs: 500,
    respectReducedMotion: true,
    target: null,              // page-level overlay target (defaults to <body>)
    element: null,              // NEW: scope the loader to a specific element instead of full page
    storageKey: 'adaptiveload_speed_tier',
    onStateChange: null,
    // Visual config — NEW: pick a built-in type or supply a fully custom renderer
    visual: {
      type: 'spinner',          // 'spinner' | 'image' | 'gif' | 'custom'
      src: null,                // image/gif URL, used when type is 'image' or 'gif'
      customHtml: null,         // raw HTML string, used when type is 'custom'
      size: 36                  // px, applies to spinner/image/gif
    },
    renderSpinner: null,        // advanced override, takes precedence over `visual`
    renderStaticText: null,
    renderDynamicText: null,
    enableLearning: true,
    learningStorageKey: 'adaptiveload_page_stats',
    // NEW: action type informs both the rule-based fallback messages and
    // whatever context gets sent to an AI provider. e.g. 'submit', 'delete',
    // 'upload', 'payment', 'search', 'save', 'generic'.
    actionType: 'generic',
    // NEW: optional async function(context) -> Promise<string[]>
    // Receives { actionType, pageUrl, elapsedMs, elementType }.
    // Should call YOUR OWN backend — never put API keys in frontend JS.
    // If omitted or it fails/times out, falls back to the built-in message library.
    aiMessageProvider: null,
    aiTimeoutMs: 2500
  };

  // Built-in rule-based fallback messages, keyed by action type.
  // Used when no AI provider is configured (or it fails) — still feels
  // "smart" and contextual without needing any external API.
  var MESSAGE_LIBRARY = {
    submit: ['Submitting your info...', 'Almost done...', 'Just finishing up...'],
    delete: ['Removing that for you...', 'Almost there...'],
    upload: ['Uploading your file...', 'Almost done uploading...', 'Just a bit more...'],
    payment: ['Processing your payment securely...', 'Confirming with your bank...', 'Almost done, hang tight...'],
    search: ['Searching...', 'Finding the best results...', 'Almost there...'],
    save: ['Saving your changes...', 'Almost done...'],
    generic: ['Still working on it...', 'Almost there...', 'Just a moment more...']
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
    var conn = (typeof navigator !== 'undefined') &&
      (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
    if (conn && conn.effectiveType) {
      var type = conn.effectiveType;
      if (type === 'slow-2g' || type === '2g') return 'slow';
      if (type === '3g') return 'medium';
      return 'fast';
    }
    return null;
  }

  function getSessionTier(storageKey) {
    try { return sessionStorage.getItem(storageKey); } catch (e) { return null; }
  }

  function setSessionTier(storageKey, tier) {
    try { sessionStorage.setItem(storageKey, tier); } catch (e) { /* ignore */ }
  }

  function classifyByDuration(ms) {
    if (ms < 800) return 'fast';
    if (ms < 2500) return 'medium';
    return 'slow';
  }

  // ---- Local learning ------------------------------------------------------

  function readStats(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }

  function writeStats(key, stats) {
    try { localStorage.setItem(key, JSON.stringify(stats)); } catch (e) { /* ignore */ }
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
    if (!entry || entry.count < 2) return null;
    return classifyByDuration(entry.avg);
  }

  // ---- Default DOM rendering ------------------------------------------------

  function injectStylesOnce() {
    if (document.getElementById('adaptiveload-styles')) return;
    var css = [
      '.adaptiveload-overlay{position:fixed;inset:0;display:flex;align-items:center;',
      'justify-content:center;flex-direction:column;gap:12px;pointer-events:none;z-index:999999;}',
      '.adaptiveload-inline{position:absolute;inset:0;display:flex;align-items:center;',
      'justify-content:center;flex-direction:column;gap:8px;pointer-events:none;z-index:999;',
      'background:rgba(255,255,255,0.6);border-radius:inherit;}',
      '.adaptiveload-spinner{border-radius:50%;border:3px solid rgba(0,0,0,0.15);',
      'border-top-color:rgba(0,0,0,0.65);animation:adaptiveload-spin 0.8s linear infinite;}',
      '@keyframes adaptiveload-spin{to{transform:rotate(360deg);}}',
      '.adaptiveload-text{font:500 14px/1.4 system-ui,-apple-system,sans-serif;',
      'color:rgba(0,0,0,0.75);background:rgba(255,255,255,0.9);padding:6px 14px;',
      'border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,0.1);}',
      '.adaptiveload-visual-img{display:block;object-fit:contain;}',
      '@media (prefers-reduced-motion: reduce){.adaptiveload-spinner{animation-duration:2s;}}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'adaptiveload-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildVisualHtml(visual) {
    var size = visual.size || 36;
    if (visual.type === 'image' || visual.type === 'gif') {
      if (!visual.src) return '<div class="adaptiveload-spinner" style="width:' + size + 'px;height:' + size + 'px;"></div>';
      return '<img class="adaptiveload-visual-img" src="' + escapeHtml(visual.src) +
        '" alt="Loading" style="width:' + size + 'px;height:' + size + 'px;" />';
    }
    if (visual.type === 'custom' && visual.customHtml) {
      return visual.customHtml;
    }
    return '<div class="adaptiveload-spinner" style="width:' + size + 'px;height:' + size + 'px;"></div>';
  }

  function createOverlay(target, scoped) {
    var el = document.createElement('div');
    el.className = scoped ? 'adaptiveload-inline' : 'adaptiveload-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    if (scoped) {
      var computedPosition = getComputedStyle(target).position;
      if (computedPosition === 'static') {
        target.style.position = 'relative';
      }
      target.appendChild(el);
    } else {
      (target || document.body).appendChild(el);
    }
    return el;
  }

  // ---- AI message resolution -------------------------------------------------

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('ai_timeout')); }, ms);
      promise.then(function (val) { clearTimeout(timer); resolve(val); },
        function (err) { clearTimeout(timer); reject(err); });
    });
  }

  function resolveDynamicMessages(opts, context) {
    if (typeof opts.aiMessageProvider === 'function') {
      return withTimeout(Promise.resolve(opts.aiMessageProvider(context)), opts.aiTimeoutMs)
        .then(function (messages) {
          if (Array.isArray(messages) && messages.length > 0) return messages;
          return fallbackMessages(opts);
        })
        .catch(function () {
          return fallbackMessages(opts); // AI failed or timed out — degrade gracefully
        });
    }
    return Promise.resolve(fallbackMessages(opts));
  }

  function fallbackMessages(opts) {
    if (opts.dynamicMessages && opts.dynamicMessages !== DEFAULTS.dynamicMessages) {
      return opts.dynamicMessages;
    }
    return MESSAGE_LIBRARY[opts.actionType] || MESSAGE_LIBRARY.generic;
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
    var scoped = !!opts.element;

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
      if (!overlay) overlay = createOverlay(scoped ? opts.element : opts.target, scoped);
      return overlay;
    }

    function showSpinner() {
      var el = ensureOverlay();
      if (opts.renderSpinner) {
        opts.renderSpinner(el);
      } else {
        el.innerHTML = buildVisualHtml(opts.visual);
      }
      setState('spinner');
    }

    function showStaticText() {
      var el = ensureOverlay();
      var msg = opts.staticMessages[0];
      if (opts.renderStaticText) {
        opts.renderStaticText(el, msg);
      } else {
        el.innerHTML = buildVisualHtml(opts.visual) +
          '<div class="adaptiveload-text">' + escapeHtml(msg) + '</div>';
      }
      setState('static');
    }

    function showDynamicText() {
      var el = ensureOverlay();
      var i = 0;
      var messages = fallbackMessages(opts);

      function render(list) {
        var msg = list[i % list.length];
        if (opts.renderDynamicText) {
          opts.renderDynamicText(el, msg);
        } else {
          el.innerHTML = buildVisualHtml(opts.visual) +
            '<div class="adaptiveload-text">' + escapeHtml(msg) + '</div>';
        }
        i++;
      }

      render(messages);
      rotateTimer = setInterval(function () { render(messages); }, opts.dynamicRotateInterval);
      setState('dynamic');

      resolveDynamicMessages(opts, {
        actionType: opts.actionType,
        pageUrl: pageUrl,
        elapsedMs: startTime !== null ? Math.round(now() - startTime) : null,
        elementType: scoped ? (opts.element.tagName || 'element').toLowerCase() : 'page'
      }).then(function (resolvedMessages) {
        if (state === 'dynamic' && resolvedMessages && resolvedMessages.length) {
          messages = resolvedMessages;
          i = 0;
        }
      });
    }

    function computeAdjustedThresholds() {
      var t = opts.thresholds;
      var adjusted = { spinner: t.spinner, staticText: t.staticText, dynamicText: t.dynamicText };
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

      var t = scoped ? opts.thresholds : computeAdjustedThresholds();

      timers.push(setTimeout(showSpinner, t.spinner));
      timers.push(setTimeout(showStaticText, t.staticText));
      timers.push(setTimeout(showDynamicText, t.dynamicText));
    }

    function stop() {
      clearTimers();
      if (overlay) {
        if (scoped && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        } else {
          overlay.innerHTML = '';
        }
      }
      overlay = scoped ? null : overlay;
      setState('idle');

      if (startTime !== null) {
        var duration = now() - startTime;
        startTime = null;

        if (!scoped && opts.enableLearning) {
          recordLoad(opts.learningStorageKey, pageUrl, duration);
        }
        if (!scoped) setSessionTier(opts.storageKey, classifyByDuration(duration));

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
      _internal: { detectNetworkTier: detectNetworkTier, getPageTier: getPageTier, readStats: readStats }
    };
  }

  // ---- Auto-init: zero-JS implementation via data attributes ----------------
  //
  // Usage:
  //   <form data-adaptiveload="form" data-adaptiveload-action="submit">
  //   <button data-adaptiveload="button" data-adaptiveload-action="delete">
  //
  // For real page navigations/native form submits, the loader disappears
  // naturally with the page. For AJAX/SPA use, call el.adaptiveLoadStop()
  // from your own async handler once the work finishes.

  function autoInit(root) {
    root = root || document;
    var elements = root.querySelectorAll('[data-adaptiveload]');

    elements.forEach(function (el) {
      if (el._adaptiveLoadBound) return;
      el._adaptiveLoadBound = true;

      var kind = el.getAttribute('data-adaptiveload');
      var actionType = el.getAttribute('data-adaptiveload-action') || 'generic';
      var customMessage = el.getAttribute('data-adaptiveload-message');
      var imageSrc = el.getAttribute('data-adaptiveload-image');

      var instance = AdaptiveLoadInstance({
        element: el,
        actionType: actionType,
        staticMessages: customMessage ? [customMessage] : DEFAULTS.staticMessages,
        visual: imageSrc ? { type: 'image', src: imageSrc, size: 28 } : DEFAULTS.visual
      });

      el.adaptiveLoadInstance = instance;
      el.adaptiveLoadStop = function () { return instance.stop(); };

      if (kind === 'form') {
        el.addEventListener('submit', function () { instance.start(); });
      } else {
        el.addEventListener('click', function () { instance.start(); });
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { autoInit(); });
    } else {
      autoInit();
    }
  }

  AdaptiveLoadInstance.VERSION = '2.0.0';
  AdaptiveLoadInstance.autoInit = autoInit;
  AdaptiveLoadInstance.MESSAGE_LIBRARY = MESSAGE_LIBRARY;
  return AdaptiveLoadInstance;
});
