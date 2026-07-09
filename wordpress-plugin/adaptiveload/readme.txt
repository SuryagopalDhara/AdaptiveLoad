=== AdaptiveLoad ===
Contributors: suryagopaldhara
Tags: loading, spinner, preloader, performance, ux
Requires at least: 5.6
Tested up to: 6.6
Requires PHP: 7.2
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Author: Suryagopal Dhara
Author URI: https://suryacreates.com
Plugin URI: https://suryacreates.com/adaptiveload/
GitHub: https://github.com/SuryagopalDhara/AdaptiveLoad

A smart, self-learning loading indicator. Shows nothing for fast loads, a spinner for medium waits, and contextual messages for slow ones.

== Description ==

Most loading indicators are dumb: either always-on or always-off. **AdaptiveLoad** is different — it adapts to how long a page *actually* takes to load, both from historical site-wide data and from each visitor's own connection speed.

**How it works:**

* Under 1 second — nothing is shown (avoids UI flicker on fast pages)
* 1–3 seconds — a simple spinner
* 3–5 seconds — spinner + a static "Loading..." message
* Over 5 seconds — spinner + rotating, contextual messages ("Processing payment...", "Uploading your file...")

**The smart part:**

* AdaptiveLoad records real load times for every page (anonymized — no personal data), and learns which pages are typically fast or slow.
* It also detects each visitor's network speed (via the Network Information API where supported, with a graceful fallback for browsers that don't support it) and adjusts the thresholds so slower-connection visitors see helpful feedback sooner.
* Returning visitors to a known-slow page skip straight to the more informative states instead of waiting through the full ladder.

**Built for everyone:**

* No coding required — configure everything from Settings → AdaptiveLoad.
* Also ships as a standalone, dependency-free JavaScript library (`adaptiveload.js`) that works on any website, not just WordPress.
* 100% free and open source (GPLv2).

== Installation ==

1. Upload the `adaptiveload` folder to `/wp-content/plugins/`, or install directly through the WordPress plugin screen.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to Settings → AdaptiveLoad to configure thresholds and messages (sensible defaults are provided out of the box).

== Frequently Asked Questions ==

= Will this slow down my site? =

No — the script loads asynchronously in the footer and does no work at all unless a page actually takes over a second to load.

= Does it collect personal data? =

No. Only anonymized page URL, load duration, device type (mobile/desktop), and a coarse network tier (fast/medium/slow) are stored — no IP addresses, cookies, or visitor identifiers.

= Can I use this outside WordPress? =

Yes. The core `adaptiveload.js` library has zero dependencies and works in any HTML/JS project. See the project's GitHub repository.

= Can I customize the messages per page (e.g. checkout vs. search)? =

Contextual per-page-type messaging is on the roadmap. Currently you can set one shared static message and a pool of rotating dynamic messages sitewide.

== Changelog ==

= 2.0.0 =
* Element-level loaders: add smart loading indicators to any button or form, not just full page loads.
* Zero-JS implementation: use `data-adaptiveload="button"` or `="form"` attributes directly in your HTML — no code required.
* Optional AI-generated contextual messages, powered by your own Anthropic API key. Configured under Settings → AdaptiveLoad. Your key stays server-side and is never exposed to visitors' browsers.
* Custom loading visuals: use your own image or GIF via `data-adaptiveload-image`.
* Falls back gracefully to the built-in message library if AI is disabled, fails, or times out.

= 1.0.0 =
* Initial release: adaptive time-based states, network-aware adjustment, site-wide learning dashboard, REST API, admin settings page.
