<?php
/**
 * Plugin Name: AdaptiveLoader
 * Plugin URI:  https://suryacreates.com/adaptiveloader/
 * Description: A smart, self-learning loading indicator. Shows nothing for fast loads, a spinner for medium waits, and contextual messages for slow ones — automatically adjusted per page and per visitor's connection speed.
 * Version:     1.0.0
 * Author:      Suryagopal Dhara
 * Author URI:  https://suryacreates.com
 * License:     GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: adaptiveloader
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'ADAPTIVELOADER_VERSION', '1.0.0' );
define( 'ADAPTIVELOADER_PATH', plugin_dir_path( __FILE__ ) );
define( 'ADAPTIVELOADER_URL', plugin_dir_url( __FILE__ ) );

require_once ADAPTIVELOADER_PATH . 'includes/class-adaptiveloader-db.php';
require_once ADAPTIVELOADER_PATH . 'includes/class-adaptiveloader-rest.php';
require_once ADAPTIVELOADER_PATH . 'includes/class-adaptiveloader-frontend.php';
require_once ADAPTIVELOADER_PATH . 'includes/class-adaptiveloader-admin.php';

/**
 * Core plugin bootstrap.
 */
final class AdaptiveLoader_Plugin {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		register_activation_hook( __FILE__, array( 'AdaptiveLoader_DB', 'create_table' ) );

		AdaptiveLoader_REST::init();
		AdaptiveLoader_Frontend::init();

		if ( is_admin() ) {
			AdaptiveLoader_Admin::init();
		}
	}
}

AdaptiveLoader_Plugin::instance();
