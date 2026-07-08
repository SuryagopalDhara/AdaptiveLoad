<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles the custom DB table that stores aggregated, anonymized
 * page load timing history used to power the "smart" learning.
 *
 * No personal data is stored — only: URL, load time (ms), device
 * type (mobile/desktop), and a coarse network tier (fast/medium/slow).
 */
class AdaptiveLoader_DB {

	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . 'adaptiveloader_timings';
	}

	public static function create_table() {
		global $wpdb;
		$table_name      = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			page_url VARCHAR(255) NOT NULL,
			load_time_ms INT UNSIGNED NOT NULL,
			device_type VARCHAR(20) DEFAULT 'unknown',
			network_tier VARCHAR(20) DEFAULT 'unknown',
			recorded_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			KEY page_url (page_url(191)),
			KEY recorded_at (recorded_at)
		) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );

		add_option( 'adaptiveloader_db_version', ADAPTIVELOADER_VERSION );
	}

	/**
	 * Insert a single timing record.
	 */
	public static function record_timing( $page_url, $load_time_ms, $device_type, $network_tier ) {
		global $wpdb;

		$wpdb->insert(
			self::table_name(),
			array(
				'page_url'     => sanitize_text_field( $page_url ),
				'load_time_ms' => absint( $load_time_ms ),
				'device_type'  => sanitize_text_field( $device_type ),
				'network_tier' => sanitize_text_field( $network_tier ),
				'recorded_at'  => current_time( 'mysql' ),
			),
			array( '%s', '%d', '%s', '%s' )
		);

		self::prune_old_records();
	}

	/**
	 * Keep the table lean — only retain the last N records per page.
	 * Runs probabilistically (1-in-50 inserts) to avoid overhead on every request.
	 */
	private static function prune_old_records() {
		if ( wp_rand( 1, 50 ) !== 1 ) {
			return;
		}
		global $wpdb;
		$table = self::table_name();
		// Keep only the most recent 500 rows per URL.
		$wpdb->query(
			"DELETE t1 FROM $table t1
			LEFT JOIN (
				SELECT id FROM $table t2
				WHERE t2.page_url = t1.page_url
				ORDER BY t2.recorded_at DESC
				LIMIT 500
			) AS keep_ids ON t1.id = keep_ids.id
			WHERE keep_ids.id IS NULL"
		);
	}

	/**
	 * Get the average load time + sample count for a specific page.
	 */
	public static function get_page_average( $page_url ) {
		global $wpdb;
		$table = self::table_name();

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT AVG(load_time_ms) as avg_ms, COUNT(*) as sample_count
				FROM $table WHERE page_url = %s",
				$page_url
			)
		);

		if ( ! $row || null === $row->avg_ms ) {
			return null;
		}

		return array(
			'avg_ms'       => round( (float) $row->avg_ms ),
			'sample_count' => (int) $row->sample_count,
		);
	}

	/**
	 * Get aggregated stats for all known pages, for the admin dashboard.
	 */
	public static function get_all_page_stats( $limit = 50 ) {
		global $wpdb;
		$table = self::table_name();

		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT page_url,
					AVG(load_time_ms) as avg_ms,
					MAX(load_time_ms) as max_ms,
					COUNT(*) as sample_count
				FROM $table
				GROUP BY page_url
				ORDER BY avg_ms DESC
				LIMIT %d",
				$limit
			)
		);
	}
}
