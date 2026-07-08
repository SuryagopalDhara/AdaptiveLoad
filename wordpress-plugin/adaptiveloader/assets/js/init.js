/*!
 * AdaptiveLoader WordPress init script.
 * Wires the standalone adaptiveloader.js library to admin-configured
 * settings, and reports timings back to the site-wide learning endpoint.
 */
(function () {
	'use strict';

	if ( typeof AdaptiveLoader === 'undefined' || typeof AdaptiveLoaderSettings === 'undefined' ) {
		return;
	}

	var settings = AdaptiveLoaderSettings;

	function detectDeviceType() {
		return /Mobi|Android/i.test( navigator.userAgent ) ? 'mobile' : 'desktop';
	}

	function detectNetworkTierLabel() {
		var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
		if ( conn && conn.effectiveType ) {
			if ( conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' ) return 'slow';
			if ( conn.effectiveType === '3g' ) return 'medium';
			return 'fast';
		}
		return 'unknown';
	}

	function reportTiming( durationMs ) {
		if ( ! settings.enableLearning ) return;

		var body = JSON.stringify( {
			page_url: settings.pageUrl,
			load_time_ms: Math.round( durationMs ),
			device_type: detectDeviceType(),
			network_tier: detectNetworkTierLabel()
		} );

		// Fire-and-forget; never block or delay the page for this.
		if ( navigator.sendBeacon ) {
			var blob = new Blob( [ body ], { type: 'application/json' } );
			navigator.sendBeacon( settings.restUrl + '/record', blob );
		} else {
			fetch( settings.restUrl + '/record', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: body,
				keepalive: true
			} ).catch( function () {} );
		}
	}

	function initLoader( siteTier ) {
		var thresholds = settings.thresholds;

		// If the site has enough history for this exact page, nudge thresholds
		// so returning visitors to a known-slow page get feedback sooner.
		if ( siteTier === 'slow' ) {
			thresholds = {
				spinner: Math.max( 200, thresholds.spinner - settings.networkAdjustMs ),
				staticText: Math.max( 400, thresholds.staticText - settings.networkAdjustMs ),
				dynamicText: Math.max( 600, thresholds.dynamicText - settings.networkAdjustMs )
			};
		}

		var loader = AdaptiveLoader( {
			thresholds: thresholds,
			staticMessages: settings.staticMessages,
			dynamicMessages: settings.dynamicMessages,
			networkAdjustMs: settings.networkAdjustMs,
			enableLearning: true
		} );

		loader.start();

		window.addEventListener( 'load', function () {
			var duration = loader.stop();
			if ( duration !== null ) {
				reportTiming( duration );
			}
		} );

		// Expose for theme/plugin devs who want manual control
		// (e.g. AJAX-heavy pages, SPA-style WP themes, form submissions).
		window.adaptiveLoaderInstance = loader;
	}

	// Ask the site-wide prediction endpoint whether this page is historically slow.
	// Falls back to default thresholds if the request fails or there's no data yet.
	fetch( settings.restUrl + '/predict?page_url=' + encodeURIComponent( settings.pageUrl ) )
		.then( function ( r ) { return r.json(); } )
		.then( function ( data ) { initLoader( data && data.tier ); } )
		.catch( function () { initLoader( null ); } );
})();
