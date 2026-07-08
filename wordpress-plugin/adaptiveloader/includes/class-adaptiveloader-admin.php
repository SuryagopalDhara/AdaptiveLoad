<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin settings page — lets non-developers configure everything
 * through a normal WordPress settings UI, no code required.
 */
class AdaptiveLoader_Admin {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_assets' ) );
	}

	public static function add_menu() {
		add_options_page(
			'AdaptiveLoader Settings',
			'AdaptiveLoader',
			'manage_options',
			'adaptiveloader',
			array( __CLASS__, 'render_settings_page' )
		);
	}

	public static function enqueue_admin_assets( $hook ) {
		if ( 'settings_page_adaptiveloader' !== $hook ) {
			return;
		}
		wp_enqueue_style(
			'adaptiveloader-admin',
			ADAPTIVELOADER_URL . 'assets/css/admin.css',
			array(),
			ADAPTIVELOADER_VERSION
		);
	}

	public static function register_settings() {
		register_setting( 'adaptiveloader_settings_group', 'adaptiveloader_settings', array( __CLASS__, 'sanitize_settings' ) );
	}

	public static function sanitize_settings( $input ) {
		$clean = array();

		$clean['enabled'] = ! empty( $input['enabled'] );
		$clean['scope']   = in_array( $input['scope'] ?? 'all', array( 'all', 'post_types', 'specific' ), true )
			? $input['scope']
			: 'all';

		$clean['post_types'] = isset( $input['post_types'] ) && is_array( $input['post_types'] )
			? array_map( 'sanitize_text_field', $input['post_types'] )
			: array( 'post', 'page' );

		$ids = isset( $input['specific_ids'] ) ? explode( ',', $input['specific_ids'] ) : array();
		$clean['specific_ids'] = array_filter( array_map( 'absint', $ids ) );

		$clean['thresholds'] = array(
			'spinner'     => max( 100, absint( $input['threshold_spinner'] ?? 1000 ) ),
			'staticText'  => max( 200, absint( $input['threshold_static'] ?? 3000 ) ),
			'dynamicText' => max( 300, absint( $input['threshold_dynamic'] ?? 5000 ) ),
		);

		$clean['static_messages'] = self::lines_to_array( $input['static_messages'] ?? 'Loading...' );
		$clean['dynamic_messages'] = self::lines_to_array(
			$input['dynamic_messages'] ?? "Still working on it...\nAlmost there...\nJust a moment more..."
		);

		$clean['network_adjust_ms'] = max( 0, absint( $input['network_adjust_ms'] ?? 500 ) );

		return $clean;
	}

	private static function lines_to_array( $text ) {
		$lines = array_map( 'trim', explode( "\n", $text ) );
		$lines = array_filter( $lines );
		return array_values( $lines ) ?: array( 'Loading...' );
	}

	public static function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings = AdaptiveLoader_Frontend::get_settings();
		$stats    = AdaptiveLoader_DB::get_all_page_stats( 20 );

		include ADAPTIVELOADER_PATH . 'admin/settings-page.php';
	}
}
