<?php
/**
 * Plugin Name: AdaptiveLoad
 * Plugin URI:  https://suryacreates.com/adaptiveload/
 * Description: A smart, self-learning loading indicator. Shows nothing for fast loads, a spinner for medium waits, and contextual messages for slow ones — automatically adjusted per page and per visitor's connection speed.
 * Version:     1.0.0
 * Author:      Suryagopal Dhara
 * Author URI:  https://suryacreates.com
 * License:     GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: adaptiveload
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'ADAPTIVELOAD_VERSION', '1.0.0' );
define( 'ADAPTIVELOAD_PATH', plugin_dir_path( __FILE__ ) );
define( 'ADAPTIVELOAD_URL', plugin_dir_url( __FILE__ ) );

require_once ADAPTIVELOAD_PATH . 'includes/class-adaptiveload-db.php';
require_once ADAPTIVELOAD_PATH . 'includes/class-adaptiveload-rest.php';
require_once ADAPTIVELOAD_PATH . 'includes/class-adaptiveload-frontend.php';
require_once ADAPTIVELOAD_PATH . 'includes/class-adaptiveload-admin.php';

/**
 * Core plugin bootstrap.
 */
final class AdaptiveLoad_Plugin {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		register_activation_hook( __FILE__, array( 'AdaptiveLoad_DB', 'create_table' ) );

		AdaptiveLoad_REST::init();
		AdaptiveLoad_Frontend::init();

		if ( is_admin() ) {
			AdaptiveLoad_Admin::init();
		}
	}
}

AdaptiveLoad_Plugin::instance();
