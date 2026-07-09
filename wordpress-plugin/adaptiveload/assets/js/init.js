/*!
 * AdaptiveLoad WordPress init script.
 * Wires the standalone adaptiveload.js library to admin-configured
 * settings, and reports timings back to the site-wide learning endpoint.
 */
(function () {
	'use strict';

	if ( typeof AdaptiveLoad === 'undefined' || typeof AdaptiveLoadSettings === 'undefined' ) {
		return;
	}

	var settings = AdaptiveLoadSettings;

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

	function buildAiProvider() {
		if ( ! settings.aiEnabled ) return null;

		return function ( context ) {
			return fetch( settings.restUrl + '/ai-messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( context )
			} )
				.then( function ( r ) { return r.json(); } )
				.then( function ( data ) { return data && data.messages ? data.messages : []; } )
				.catch( function () { return []; } );
		};
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

		var aiProvider = buildAiProvider();

		// Make the AI provider (if enabled) the default for every future
		// AdaptiveLoad instance — including ones auto-created from
		// data-adaptiveload elements on buttons/forms elsewhere on the page.
		if ( typeof AdaptiveLoad.configureDefaults === 'function' && aiProvider ) {
			AdaptiveLoad.configureDefaults( { aiMessageProvider: aiProvider } );
		}

		var loader = AdaptiveLoad( {
			thresholds: thresholds,
			staticMessages: settings.staticMessages,
			dynamicMessages: settings.dynamicMessages,
			networkAdjustMs: settings.networkAdjustMs,
			enableLearning: true,
			aiMessageProvider: aiProvider
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
		window.adaptiveLoadInstance = loader;

		// Now that defaults (including any AI provider) are configured,
		// scan the page for data-adaptiveload buttons/forms and bind them.
		if ( typeof AdaptiveLoad.autoInit === 'function' ) {
			AdaptiveLoad.autoInit();
		}
	}

	// Ask the site-wide prediction endpoint whether this page is historically slow.
	// Falls back to default thresholds if the request fails or there's no data yet.
	fetch( settings.restUrl + '/predict?page_url=' + encodeURIComponent( settings.pageUrl ) )
		.then( function ( r ) { return r.json(); } )
		.then( function ( data ) { initLoader( data && data.tier ); } )
		.catch( function () { initLoader( null ); } );
})();
