# AdaptiveLoader

A smart, self-learning loading indicator. Free and open source.

Built by [Suryagopal Dhara](https://suryacreates.com) · [suryacreates.com/adaptiveloader](https://suryacreates.com/adaptiveloader/) · [GitHub](https://github.com/SuryagopalDhara/AdaptiveLoader)

Most loading spinners are dumb — always on, or always off. AdaptiveLoader adapts to how long a page *actually* takes, using both site-wide historical data and each visitor's own connection speed.

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
adaptiveloader/
├── core/
│   └── adaptiveloader.js         # Standalone library — zero dependencies, works anywhere
└── wordpress-plugin/
    └── adaptiveloader/           # Full WordPress plugin (drop into wp-content/plugins)
```

## Using the standalone library (any website, any stack)

No build step, no dependencies required. Pick whichever fits your project:

### Option A — CDN (fastest, zero install)

Add one line to your HTML. No npm, no build tools, works immediately:

```html
<script src="https://cdn.jsdelivr.net/npm/adaptiveloader@1/core/adaptiveloader.js"></script>
<script>
  var loader = AdaptiveLoader({
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
npm install adaptiveloader
```

```js
import AdaptiveLoader from 'adaptiveloader';
// or: const AdaptiveLoader = require('adaptiveloader');

const loader = AdaptiveLoader({ /* options */ });
loader.start();
```

### Option C — Download and self-host

Copy `core/adaptiveloader.js` into your project and include it locally — useful for air-gapped environments or strict CSP policies that block external scripts.

### Framework quick-starts

**React**
```jsx
import { useEffect, useRef } from 'react';
import AdaptiveLoader from 'adaptiveloader';

function useAdaptiveLoader(isLoading) {
  const loaderRef = useRef(null);

  useEffect(() => {
    loaderRef.current = AdaptiveLoader({ /* options */ });
  }, []);

  useEffect(() => {
    if (isLoading) loaderRef.current?.start();
    else loaderRef.current?.stop();
  }, [isLoading]);
}
```

**Vue**
```js
import AdaptiveLoader from 'adaptiveloader';

export default {
  data() { return { loader: null }; },
  mounted() { this.loader = AdaptiveLoader({ /* options */ }); },
  methods: {
    startLoading() { this.loader.start(); },
    stopLoading() { this.loader.stop(); }
  }
};
```

**Plain fetch/AJAX wrapper**
```js
const loader = AdaptiveLoader();

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

See inline comments in `core/adaptiveloader.js` for the full options list (custom render functions, learning storage keys, reduced-motion handling, etc).

## Using the WordPress plugin

1. Copy `wordpress-plugin/adaptiveloader` into your site's `wp-content/plugins/` folder.
2. Activate it from the Plugins screen.
3. Configure thresholds, messages, and scope under **Settings → AdaptiveLoader**.
4. Check the built-in dashboard on that same settings page to see real load-time data as it comes in.

No coding required for site owners. Developers can hook into `window.adaptiveLoaderInstance` on the frontend for manual control (AJAX-heavy pages, forms, etc).

## Privacy

Only anonymized data is ever stored: page URL, load duration, device type (mobile/desktop), and a coarse network tier (fast/medium/slow). No IP addresses, cookies, or visitor identifiers are collected.

## License

- `core/adaptiveloader.js` — MIT License
- `wordpress-plugin/` — GPLv2 or later (WordPress.org requirement)

## Contributing

Issues and PRs welcome at [github.com/SuryagopalDhara/AdaptiveLoader](https://github.com/SuryagopalDhara/AdaptiveLoader). This is an early v1.0.0 — the roadmap includes per-page-type contextual messaging (checkout vs. search vs. upload), a visual chart on the admin dashboard, and Gutenberg block support.
