<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/** @var array $settings */
/** @var array $stats */
?>
<div class="wrap adaptiveload-admin">
	<h1>AdaptiveLoad Settings</h1>
	<p>Smart, self-learning loading indicators — nothing shown for fast pages, a spinner for medium waits, contextual messages for slow ones.</p>

	<form method="post" action="options.php">
		<?php settings_fields( 'adaptiveload_settings_group' ); ?>

		<h2 class="title">General</h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">Enable AdaptiveLoad</th>
				<td>
					<label>
						<input type="checkbox" name="adaptiveload_settings[enabled]" value="1" <?php checked( $settings['enabled'] ); ?> />
						Show loading indicators on this site
					</label>
				</td>
			</tr>
			<tr>
				<th scope="row">Where to run</th>
				<td>
					<select name="adaptiveload_settings[scope]">
						<option value="all" <?php selected( $settings['scope'], 'all' ); ?>>All pages (recommended)</option>
						<option value="post_types" <?php selected( $settings['scope'], 'post_types' ); ?>>Specific post types</option>
						<option value="specific" <?php selected( $settings['scope'], 'specific' ); ?>>Specific page/post IDs</option>
					</select>
					<p class="description">
						For "Specific post types", separately edit the post type list in
						<code>includes/class-adaptiveload-frontend.php</code> or via the
						<code>adaptiveload_settings</code> option (post_types array) — an admin UI
						for this is on the roadmap.
					</p>
				</td>
			</tr>
			<tr>
				<th scope="row">Specific IDs</th>
				<td>
					<input type="text" name="adaptiveload_settings[specific_ids]"
						value="<?php echo esc_attr( implode( ',', $settings['specific_ids'] ) ); ?>"
						class="regular-text" placeholder="12,45,102" />
					<p class="description">Comma-separated post/page IDs (only used when scope is "Specific page/post IDs").</p>
				</td>
			</tr>
		</table>

		<h2 class="title">Timing Thresholds</h2>
		<p class="description">How long (in milliseconds) before each stage appears. 1000ms = 1 second.</p>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">Show spinner after</th>
				<td><input type="number" min="100" step="100"
					name="adaptiveload_settings[threshold_spinner]"
					value="<?php echo esc_attr( $settings['thresholds']['spinner'] ); ?>" /> ms</td>
			</tr>
			<tr>
				<th scope="row">Show static text after</th>
				<td><input type="number" min="200" step="100"
					name="adaptiveload_settings[threshold_static]"
					value="<?php echo esc_attr( $settings['thresholds']['staticText'] ); ?>" /> ms</td>
			</tr>
			<tr>
				<th scope="row">Show dynamic text after</th>
				<td><input type="number" min="300" step="100"
					name="adaptiveload_settings[threshold_dynamic]"
					value="<?php echo esc_attr( $settings['thresholds']['dynamicText'] ); ?>" /> ms</td>
			</tr>
			<tr>
				<th scope="row">Slow-network adjustment</th>
				<td>
					<input type="number" min="0" step="100"
						name="adaptiveload_settings[network_adjust_ms]"
						value="<?php echo esc_attr( $settings['network_adjust_ms'] ); ?>" /> ms
					<p class="description">How much sooner to show each stage for visitors detected on a slow connection.</p>
				</td>
			</tr>
		</table>

		<h2 class="title">Messages</h2>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">Static text message(s)</th>
				<td>
					<textarea name="adaptiveload_settings[static_messages]" rows="2" class="large-text"><?php
						echo esc_textarea( implode( "\n", $settings['static_messages'] ) );
					?></textarea>
					<p class="description">One message per line. The first line is used for the static stage.</p>
				</td>
			</tr>
			<tr>
				<th scope="row">Dynamic text messages</th>
				<td>
					<textarea name="adaptiveload_settings[dynamic_messages]" rows="4" class="large-text"><?php
						echo esc_textarea( implode( "\n", $settings['dynamic_messages'] ) );
					?></textarea>
					<p class="description">One message per line. These rotate for long waits. Tailor them to what the page is actually doing — e.g. "Processing payment..." on checkout.</p>
				</td>
			</tr>
		</table>

		<?php submit_button(); ?>
	</form>

	<hr />

	<h2 class="title">AI-Generated Messages <span style="font-weight:normal;font-size:13px;color:#666;">(optional)</span></h2>
	<p class="description">
		By default, AdaptiveLoad uses a built-in library of contextual messages (submit, delete, upload, payment, search, save).
		Enable this to generate genuinely dynamic, AI-written messages instead — tailored to the specific page and action a visitor is waiting on.
		Your API key is stored securely on the server and is <strong>never sent to visitors' browsers</strong>; all AI calls happen server-side via this plugin.
	</p>
	<form method="post" action="options.php">
		<?php settings_fields( 'adaptiveload_settings_group' ); ?>
		<input type="hidden" name="adaptiveload_settings[enabled]" value="<?php echo esc_attr( $settings['enabled'] ? 1 : 0 ); ?>" />
		<input type="hidden" name="adaptiveload_settings[scope]" value="<?php echo esc_attr( $settings['scope'] ); ?>" />
		<input type="hidden" name="adaptiveload_settings[post_types][]" value="<?php echo esc_attr( implode( ',', $settings['post_types'] ) ); ?>" />
		<input type="hidden" name="adaptiveload_settings[specific_ids]" value="<?php echo esc_attr( implode( ',', $settings['specific_ids'] ) ); ?>" />
		<input type="hidden" name="adaptiveload_settings[threshold_spinner]" value="<?php echo esc_attr( $settings['thresholds']['spinner'] ); ?>" />
		<input type="hidden" name="adaptiveload_settings[threshold_static]" value="<?php echo esc_attr( $settings['thresholds']['staticText'] ); ?>" />
		<input type="hidden" name="adaptiveload_settings[threshold_dynamic]" value="<?php echo esc_attr( $settings['thresholds']['dynamicText'] ); ?>" />
		<input type="hidden" name="adaptiveload_settings[network_adjust_ms]" value="<?php echo esc_attr( $settings['network_adjust_ms'] ); ?>" />
		<input type="hidden" name="adaptiveload_settings[static_messages]" value="<?php echo esc_attr( implode( "\n", $settings['static_messages'] ) ); ?>" />
		<input type="hidden" name="adaptiveload_settings[dynamic_messages]" value="<?php echo esc_attr( implode( "\n", $settings['dynamic_messages'] ) ); ?>" />

		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">Enable AI messages</th>
				<td>
					<label>
						<input type="checkbox" name="adaptiveload_settings[ai_enabled]" value="1" <?php checked( $settings['ai_enabled'] ); ?> />
						Use AI-generated contextual messages instead of the built-in library
					</label>
				</td>
			</tr>
			<tr>
				<th scope="row">Anthropic API key</th>
				<td>
					<input type="password" name="adaptiveload_settings[ai_api_key]"
						value="<?php echo esc_attr( $settings['ai_api_key'] ? str_repeat( '•', 20 ) : '' ); ?>"
						class="regular-text" placeholder="sk-ant-..." autocomplete="off" />
					<p class="description">
						Get a key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>.
						Leave unchanged (masked dots) to keep your existing key — only overwrite this field if you're setting a new key.
						Note: AI calls incur usage cost on your Anthropic account.
					</p>
				</td>
			</tr>
		</table>

		<?php submit_button( 'Save AI Settings' ); ?>
	</form>

	<hr />

	<h2 class="title">Buttons &amp; Forms (zero-JS)</h2>
	<p class="description">
		Beyond page loads, you can add smart loaders to any button or form with no code — just add a data attribute directly in your theme, page builder, or block editor's HTML.
	</p>
	<table class="widefat" style="max-width:800px;">
		<tbody>
			<tr>
				<td style="width:45%;"><code>&lt;form data-adaptiveload="form" data-adaptiveload-action="submit"&gt;</code></td>
				<td>Shows a loader scoped to the form on submit</td>
			</tr>
			<tr>
				<td><code>&lt;button data-adaptiveload="button" data-adaptiveload-action="delete"&gt;</code></td>
				<td>Shows a loader scoped to the button on click</td>
			</tr>
			<tr>
				<td><code>data-adaptiveload-message="Custom text..."</code></td>
				<td>Overrides the static-stage message for that element</td>
			</tr>
			<tr>
				<td><code>data-adaptiveload-image="https://.../loader.gif"</code></td>
				<td>Uses your own image/GIF instead of the default spinner</td>
			</tr>
		</tbody>
	</table>
	<p class="description">
		Valid <code>data-adaptiveload-action</code> values: <code>submit</code>, <code>delete</code>, <code>upload</code>, <code>payment</code>, <code>search</code>, <code>save</code>, <code>generic</code> —
		these pick the contextual fallback message set (or inform the AI prompt, if AI messages are enabled above).
	</p>

	<hr />

	<h2 class="title">Page Load Dashboard</h2>
	<p class="description">Live data collected from real visitors. Pages need at least a few visits before averages are meaningful.</p>

	<?php if ( empty( $stats ) ) : ?>
		<p><em>No data yet — check back after your site gets some traffic.</em></p>
	<?php else : ?>
		<table class="widefat striped">
			<thead>
				<tr>
					<th>Page URL</th>
					<th>Avg. Load Time</th>
					<th>Slowest Recorded</th>
					<th>Samples</th>
					<th>Tier</th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $stats as $row ) :
					$avg = round( $row->avg_ms );
					$tier = $avg >= 2500 ? 'Slow' : ( $avg >= 800 ? 'Medium' : 'Fast' );
					$tier_class = strtolower( $tier );
				?>
				<tr>
					<td><?php echo esc_html( $row->page_url ); ?></td>
					<td><?php echo esc_html( number_format_i18n( $avg ) ); ?> ms</td>
					<td><?php echo esc_html( number_format_i18n( round( $row->max_ms ) ) ); ?> ms</td>
					<td><?php echo esc_html( $row->sample_count ); ?></td>
					<td><span class="adaptiveload-tier adaptiveload-tier-<?php echo esc_attr( $tier_class ); ?>"><?php echo esc_html( $tier ); ?></span></td>
				</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
	<?php endif; ?>
</div>
