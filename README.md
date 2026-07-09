# AdaptiveLoad

A smart, self-learning loading indicator. Free and open source.

Built by [Suryagopal Dhara](https://suryacreates.com) · [suryacreates.com/adaptiveload](https://suryacreates.com/adaptiveload/) · [GitHub](https://github.com/SuryagopalDhara/AdaptiveLoad)

Most loading spinners are dumb — always on, or always off. AdaptiveLoad adapts to how long a page *actually* takes, using both site-wide historical data and each visitor's own connection speed.

## How it behaves

| Load time      | What's shown                                  |
|-----------------|-----------------------------------------------|
| Under 1s        | Nothing (avoids UI flicker)                   |
| 1–3s            | A simple spinner                              |
| 3–5s            | Spinner + static text ("Loading...")          |
| Over 5s         | Spinner + rotating contextual messages        |

**The smart part:**
- Learns per-page load-time history and can skip straight to the right stage on repeat visits.
- Detects visitor network speed (Network Information API where supported, with a session-based fallback for Safari/Firefox) and adjusts thresholds accordingly.

## What's in this repo

```
adaptiveload/
├── core/
│   └── adaptiveload.js         # Standalone library — zero dependencies, works anywhere
└── wordpress-plugin/
    └── adaptiveload/           # Full WordPress plugin (drop into wp-content/plugins)
```

## Using the standalone library (any website, any stack)

No build step, no dependencies required. Pick whichever fits your project:

### Option A — CDN (fastest, zero install)

Add one line to your HTML. No npm, no build tools, works immediately:

```html
<script src="https://cdn.jsdelivr.net/npm/adaptiveload@1/core/adaptiveload.js"></script>
<script>
  var loader = AdaptiveLoad({
    thresholds: { spinner: 1000, staticText: 3000, dynamicText: 5000 },
    staticMessages: ['Loading...'],
    dynamicMessages: ['Almost there...', 'Just a moment more...']
  });

  loader.start();
  // when your async work / page load finishes:
  loader.stop();
</script>
```

(Once published to npm, jsDelivr and unpkg auto-serve the package — no separate CDN setup needed. Swap `@1` for `@latest` or a specific version like `@1.0.0` for stability.)

### Option B — npm (for build-tooled projects: React, Vue, Next.js, Vite, etc.)

```bash
npm install adaptiveload
```

```js
import AdaptiveLoad from 'adaptiveload';
// or: const AdaptiveLoad = require('adaptiveload');

const loader = AdaptiveLoad({ /* options */ });
loader.start();
```

### Option C — Download and self-host

Copy `core/adaptiveload.js` into your project and include it locally — useful for air-gapped environments or strict CSP policies that block external scripts.

### Framework quick-starts

**React**
```jsx
import { useEffect, useRef } from 'react';
import AdaptiveLoad from 'adaptiveload';

function useAdaptiveLoad(isLoading) {
  const loaderRef = useRef(null);

  useEffect(() => {
    loaderRef.current = AdaptiveLoad({ /* options */ });
  }, []);

  useEffect(() => {
    if (isLoading) loaderRef.current?.start();
    else loaderRef.current?.stop();
  }, [isLoading]);
}
```

**Vue**
```js
import AdaptiveLoad from 'adaptiveload';

export default {
  data() { return { loader: null }; },
  mounted() { this.loader = AdaptiveLoad({ /* options */ }); },
  methods: {
    startLoading() { this.loader.start(); },
    stopLoading() { this.loader.stop(); }
  }
};
```

**Plain fetch/AJAX wrapper**
```js
const loader = AdaptiveLoad();

async function fetchData(url) {
  loader.start();
  try {
    const res = await fetch(url);
    return await res.json();
  } finally {
    loader.stop();
  }
}
```

See inline comments in `core/adaptiveload.js` for the full options list (custom render functions, learning storage keys, reduced-motion handling, etc).

## Zero-JS implementation (v2.0)

For buttons and forms, you often don't need to write any JavaScript at all. Just add data attributes:

```html
<script src="https://cdn.jsdelivr.net/npm/adaptiveload@2/core/adaptiveload.js"></script>

<form data-adaptiveload="form" data-adaptiveload-action="submit">
  <input type="email" name="email" required>
  <button type="submit">Subscribe</button>
</form>

<button data-adaptiveload="button" data-adaptiveload-action="delete" data-adaptiveload-message="Removing item...">
  Delete
</button>
```

AdaptiveLoad automatically scans the page on load, attaches itself to any element with `data-adaptiveload`, and shows a loader scoped to that element (not the whole page) when it's clicked or submitted.

**Attributes:**
| Attribute | Values | Purpose |
|---|---|---|
| `data-adaptiveload` | `"button"` or `"form"` | Enables auto-binding |
| `data-adaptiveload-action` | `submit`, `delete`, `upload`, `payment`, `search`, `save`, `generic` | Picks contextual fallback messages |
| `data-adaptiveload-message` | any string | Overrides the static-stage message |
| `data-adaptiveload-image` | URL | Use a custom image/GIF instead of the default spinner |

For real page navigations or native form submits, the loader disappears naturally with the page. For AJAX/SPA interactions, stop it manually once your async work finishes:

```js
document.querySelector('#my-button').adaptiveLoadStop();
```

If you inject new buttons/forms dynamically (e.g. after a fetch), re-scan the page:

```js
AdaptiveLoad.autoInit(); // re-scans the whole document
// or scope it: AdaptiveLoad.autoInit(someContainerElement);
```

## Element-level loaders (buttons, forms, any container)

Beyond the zero-JS approach, you can attach a loader to any specific element manually — useful when you need full control:

```js
const button = document.querySelector('#save-button');

const loader = AdaptiveLoad({
  element: button,          // scopes the loader to this element instead of the full page
  actionType: 'save',       // picks contextual fallback messages
  thresholds: { spinner: 300, staticText: 1200, dynamicText: 3000 } // buttons should feel snappier than page loads
});

async function handleSave() {
  loader.start();
  try {
    await fetch('/api/save', { method: 'POST' /* ... */ });
  } finally {
    loader.stop();
  }
}

button.addEventListener('click', handleSave);
```

## Custom loading visuals

Swap the default spinner for an image, GIF, or fully custom HTML — one config option:

```js
// Image or GIF
const loader = AdaptiveLoad({
  visual: { type: 'image', src: '/assets/my-loader.gif', size: 48 }
});

// Fully custom HTML (e.g. your own CSS animation, SVG, Lottie player, etc.)
const loader = AdaptiveLoad({
  visual: {
    type: 'custom',
    customHtml: '<div class="my-custom-spinner"></div>'
  }
});
```

## Optional AI-generated contextual messages

By default, AdaptiveLoad uses a built-in library of contextual messages based on `actionType` (submit, delete, upload, payment, search, save) — no setup required. If you want genuinely dynamic, AI-generated messages tailored to the specific page and task, provide an `aiMessageProvider` function.

**Important: never call an AI API directly from frontend JS — that exposes your API key.** Instead, point `aiMessageProvider` at your own backend endpoint, which then calls the AI provider server-side.

```js
const loader = AdaptiveLoad({
  actionType: 'payment',
  aiMessageProvider: async function (context) {
    // context = { actionType, pageUrl, elapsedMs, elementType }
    const res = await fetch('/api/adaptiveload/ai-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    const data = await res.json();
    return data.messages; // e.g. ['Almost done — verifying your card...', 'Just confirming with your bank...']
  },
  aiTimeoutMs: 2500 // falls back to the built-in message library if this is exceeded
});
```

Example backend endpoint (Node/Express) that calls an AI provider safely:

```js
app.post('/api/adaptiveload/ai-messages', async (req, res) => {
  const { actionType, pageUrl, elapsedMs } = req.body;

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY, // kept server-side, never sent to the browser
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A user is waiting on a "${actionType}" action on the page "${pageUrl}", ` +
          `already waited ${elapsedMs}ms. Write 3 short, reassuring loading messages ` +
          `(under 8 words each) that reduce perceived wait time. Return ONLY a JSON array of strings.`
      }]
    })
  });

  const data = await aiResponse.json();
  const messages = JSON.parse(data.content[0].text);
  res.json({ messages });
});
```

If `aiMessageProvider` is omitted, fails, or times out, AdaptiveLoad silently falls back to the built-in message library — the AI layer is entirely optional and never blocks the loader from working.

## Using the WordPress plugin

1. Copy `wordpress-plugin/adaptiveload` into your site's `wp-content/plugins/` folder.
2. Activate it from the Plugins screen.
3. Configure thresholds, messages, and scope under **Settings → AdaptiveLoad**.
4. Check the built-in dashboard on that same settings page to see real load-time data as it comes in.

No coding required for site owners. Developers can hook into `window.adaptiveLoadInstance` on the frontend for manual control (AJAX-heavy pages, forms, etc).

## Privacy

Only anonymized data is ever stored: page URL, load duration, device type (mobile/desktop), and a coarse network tier (fast/medium/slow). No IP addresses, cookies, or visitor identifiers are collected.

## License

- `core/adaptiveload.js` — MIT License
- `wordpress-plugin/` — GPLv2 or later (WordPress.org requirement)

## Contributing

Issues and PRs welcome at [github.com/SuryagopalDhara/AdaptiveLoad](https://github.com/SuryagopalDhara/AdaptiveLoad).

## Changelog

**v2.0.0** — Element-level loaders (buttons, forms, any container), zero-JS auto-init via `data-adaptiveload` attributes, custom visuals (image/GIF/custom HTML), optional AI-generated contextual messages via `aiMessageProvider`.

**v1.0.0** — Initial release: adaptive time-based page-load states, network-aware threshold adjustment, site-wide learning (WordPress plugin).

Roadmap: Gutenberg block support, visual chart on the WP admin dashboard, a built-in (optional) AI proxy endpoint in the WordPress plugin so PHP devs don't need to write their own backend route.
