<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST API surface for AdaptiveLoad.
 *
 * POST /wp-json/adaptiveload/v1/record  -> log a page load timing
 * GET  /wp-json/adaptiveload/v1/predict -> get predicted tier for a URL
 */
class AdaptiveLoad_REST {

	const NAMESPACE_ = 'adaptiveload/v1';

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

		register_rest_route(
			self::NAMESPACE_,
			'/ai-messages',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_ai_messages' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'actionType' => array( 'required' => false, 'type' => 'string' ),
					'pageUrl'    => array( 'required' => false, 'type' => 'string' ),
					'elapsedMs'  => array( 'required' => false, 'type' => 'integer' ),
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

		AdaptiveLoad_DB::record_timing( $page_url, $load_time_ms, $device_type, $network_tier );

		return new WP_REST_Response( array( 'stored' => true ), 200 );
	}

	public static function handle_predict( WP_REST_Request $request ) {
		$page_url = $request->get_param( 'page_url' );
		$stats    = AdaptiveLoad_DB::get_page_average( $page_url );

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

	/**
	 * Proxies AI message generation server-side, so the API key never
	 * reaches the browser. Falls back gracefully (empty messages array)
	 * on any failure — the frontend library already knows to fall back
	 * to its built-in message library when this happens.
	 */
	public static function handle_ai_messages( WP_REST_Request $request ) {
		$settings = AdaptiveLoad_Frontend::get_settings();

		if ( empty( $settings['ai_enabled'] ) || empty( $settings['ai_api_key'] ) ) {
			return new WP_REST_Response( array( 'messages' => array() ), 200 );
		}

		$action_type = sanitize_text_field( $request->get_param( 'actionType' ) ?: 'generic' );
		$page_url    = sanitize_text_field( $request->get_param( 'pageUrl' ) ?: '' );
		$elapsed_ms  = (int) $request->get_param( 'elapsedMs' );

		// Cache identical requests briefly to limit API cost — messages don't
		// need to be unique per visitor, just contextual per action/page.
		$cache_key = 'adaptiveload_ai_' . md5( $action_type . '|' . $page_url );
		$cached    = get_transient( $cache_key );
		if ( false !== $cached ) {
			return new WP_REST_Response( array( 'messages' => $cached ), 200 );
		}

		$prompt = sprintf(
			'A website visitor is waiting on a "%s" action on the page "%s", already waited %dms. ' .
			'Write 3 short, reassuring loading messages (under 8 words each) that reduce perceived wait ' .
			'time, using a warm and human tone. Return ONLY a JSON array of 3 strings, nothing else.',
			$action_type,
			$page_url,
			$elapsed_ms
		);

		$response = wp_remote_post(
			'https://api.anthropic.com/v1/messages',
			array(
				'timeout' => 6,
				'headers' => array(
					'x-api-key'         => $settings['ai_api_key'],
					'anthropic-version' => '2023-06-01',
					'Content-Type'      => 'application/json',
				),
				'body'    => wp_json_encode(
					array(
						'model'      => 'claude-sonnet-4-6',
						'max_tokens' => 200,
						'messages'   => array(
							array( 'role' => 'user', 'content' => $prompt ),
						),
					)
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response( array( 'messages' => array() ), 200 );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$text = $body['content'][0]['text'] ?? '';
		$messages = json_decode( $text, true );

		if ( ! is_array( $messages ) || empty( $messages ) ) {
			return new WP_REST_Response( array( 'messages' => array() ), 200 );
		}

		$messages = array_map( 'sanitize_text_field', $messages );
		set_transient( $cache_key, $messages, 15 * MINUTE_IN_SECONDS );

		return new WP_REST_Response( array( 'messages' => $messages ), 200 );
	}
}
