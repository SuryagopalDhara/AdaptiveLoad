<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST API surface for AdaptiveLoader.
 *
 * POST /wp-json/adaptiveloader/v1/record  -> log a page load timing
 * GET  /wp-json/adaptiveloader/v1/predict -> get predicted tier for a URL
 */
class AdaptiveLoader_REST {

	const NAMESPACE_ = 'adaptiveloader/v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route(
			self::NAMESPACE_,
			'/record',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_record' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'page_url'     => array( 'required' => true, 'type' => 'string' ),
					'load_time_ms' => array( 'required' => true, 'type' => 'integer' ),
					'device_type'  => array( 'required' => false, 'type' => 'string' ),
					'network_tier' => array( 'required' => false, 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE_,
			'/predict',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_predict' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'page_url' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);
	}

	public static function handle_record( WP_REST_Request $request ) {
		$page_url     = $request->get_param( 'page_url' );
		$load_time_ms = (int) $request->get_param( 'load_time_ms' );
		$device_type  = $request->get_param( 'device_type' ) ?: 'unknown';
		$network_tier = $request->get_param( 'network_tier' ) ?: 'unknown';

		// Basic sanity limits — reject absurd values to keep data clean.
		if ( $load_time_ms <= 0 || $load_time_ms > 120000 ) {
			return new WP_REST_Response( array( 'stored' => false, 'reason' => 'out_of_range' ), 200 );
		}

		AdaptiveLoader_DB::record_timing( $page_url, $load_time_ms, $device_type, $network_tier );

		return new WP_REST_Response( array( 'stored' => true ), 200 );
	}

	public static function handle_predict( WP_REST_Request $request ) {
		$page_url = $request->get_param( 'page_url' );
		$stats    = AdaptiveLoader_DB::get_page_average( $page_url );

		if ( ! $stats || $stats['sample_count'] < 3 ) {
			return new WP_REST_Response(
				array( 'tier' => null, 'reason' => 'insufficient_data' ),
				200
			);
		}

		$avg = $stats['avg_ms'];
		$tier = 'fast';
		if ( $avg >= 2500 ) {
			$tier = 'slow';
		} elseif ( $avg >= 800 ) {
			$tier = 'medium';
		}

		return new WP_REST_Response(
			array(
				'tier'         => $tier,
				'avg_ms'       => $avg,
				'sample_count' => $stats['sample_count'],
			),
			200
		);
	}
}
