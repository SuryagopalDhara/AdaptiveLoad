<?php
// If uninstall not called from WordPress, exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

$table_name = $wpdb->prefix . 'adaptiveloader_timings';
$wpdb->query( "DROP TABLE IF EXISTS $table_name" ); // phpcs:ignore

delete_option( 'adaptiveloader_settings' );
delete_option( 'adaptiveloader_db_version' );
