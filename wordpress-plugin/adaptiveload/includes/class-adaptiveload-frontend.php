<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Loads the AdaptiveLoad JS library on the frontend and wires it up
 * with the site's configured thresholds, messages, and the site-wide
 * prediction endpoint.
 */
class AdaptiveLoad_Frontend {

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	public static function enqueue_assets() {
		$settings = self::get_settings();

		if ( empty( $settings['enabled'] ) ) {
			return;
		}

		if ( ! self::should_run_on_current_page( $settings ) ) {
			return;
		}

		wp_enqueue_script(
			'adaptiveload',
			ADAPTIVELOAD_URL . 'assets/js/adaptiveload.js',
			array(),
			ADAPTIVELOAD_VERSION,
			true // load in footer, non-render-blocking
		);

		wp_enqueue_script(
			'adaptiveload-init',
			ADAPTIVELOAD_URL . 'assets/js/init.js',
			array( 'adaptiveload' ),
			ADAPTIVELOAD_VERSION,
			true
		);

		wp_localize_script(
			'adaptiveload-init',
			'AdaptiveLoadSettings',
			array(
				'restUrl'         => esc_url_raw( rest_url( 'adaptiveload/v1' ) ),
				'pageUrl'         => esc_url_raw( self::current_url() ),
				'thresholds'      => $settings['thresholds'],
				'staticMessages'  => $settings['static_messages'],
				'dynamicMessages' => $settings['dynamic_messages'],
				'networkAdjustMs' => (int) $settings['network_adjust_ms'],
				'enableLearning'  => true,
			)
		);
	}

	/**
	 * Decide whether AdaptiveLoad should run on the current request,
	 * based on admin-configured scope (all pages / specific post types / specific IDs).
	 */
	private static function should_run_on_current_page( $settings ) {
		if ( is_admin() ) {
			return false;
		}

		$scope = $settings['scope'];

		if ( 'all' === $scope ) {
			return true;
		}

		if ( 'post_types' === $scope && is_singular() ) {
			$post_type = get_post_type();
			return in_array( $post_type, $settings['post_types'], true );
		}

		if ( 'specific' === $scope && is_singular() ) {
			$id = get_the_ID();
			return in_array( $id, $settings['specific_ids'], true );
		}

		return false;
	}

	private static function current_url() {
		$scheme = is_ssl() ? 'https://' : 'http://';
		return $scheme . ( $_SERVER['HTTP_HOST'] ?? '' ) . ( $_SERVER['REQUEST_URI'] ?? '' );
	}

	/**
	 * Central place that reads plugin settings with sane defaults.
	 */
	public static function get_settings() {
		$defaults = array(
			'enabled'           => true,
			'scope'             => 'all', // all | post_types | specific
			'post_types'        => array( 'post', 'page' ),
			'specific_ids'      => array(),
			'thresholds'        => array(
				'spinner'     => 1000,
				'staticText'  => 3000,
				'dynamicText' => 5000,
			),
			'static_messages'   => array( 'Loading...' ),
			'dynamic_messages'  => array( 'Still working on it...', 'Almost there...', 'Just a moment more...' ),
			'network_adjust_ms' => 500,
		);

		$saved = get_option( 'adaptiveload_settings', array() );
		return wp_parse_args( $saved, $defaults );
	}
}
