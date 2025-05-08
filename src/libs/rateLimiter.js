import TTLCache from '@isaacs/ttlcache';

/**
 * @typedef {Object} RateLimiterOptions
 * @property {number} [maxAttempt]
 * Maximum number of allowed attempts per key during the `ttl` window.
 * - Default : `3`
 */

/**
 * A simple per-user rate limiter built on top of `@isaacs/ttlcache`.
 *
 * Each key (such as a user ID) is allowed a limited number of attempts
 * within a defined TTL (time-to-live) window. After exceeding the limit,
 * further attempts are rejected until the TTL expires and resets.
 *
 * ### Usage
 * ```js
 * import RateLimiter from './rateLimiter.js';
 *
 * // Creates a rate limiter with the following rules:
 * // - Time-to-live (TTL) window is set to 1 hour.
 * // - Supports up to 50 unique user entries; new users beyond this limit will be rejected.
 * // - Each user is allowed up to 3 attempts within the 1-hour window.
 * const MyRateLimiter = new RateLimiter({
 * 	ttl: 1000 * 60 * 60, // 1 hour
 * 	max: 50,
 * 	maxAttempt: 3
 * })
 * ```
 *
 * @class RateLimiter
 * @template K, V
 * @extends {TTLCache<K, V>}
 * @see https://www.npmjs.com/package/@isaacs/ttlcache
 */
export default class RateLimiter extends TTLCache {
	/**
	 * Maximum number of allowed attempts per key during the TTL window. See example below,
	 *
	 * ```js
	 * const options = {
	 *   ttl: 60 * 1000, // 1 minute
	 *   max: 250,       // Maximum 250 keys allowed in cache
	 *   maxAttempt: 3   // Each key can call attempt() up to 3 times within 1 minute
	 * }
	 * ```
	 *
	 * Each cache key (e.g., a user ID) can call `attempt()` up to `maxAttempt` times
	 * within the TTL period. Once exceeded, further calls are rejected until TTL resets.
	 */
	maxAttempt;

	/**
	 * Create a RateLimiter instance by configuring {@link TTLCache.Options TTLCache} and {@link RateLimiterOptions RateLimiter} options.
	 * Ensure `ttl`, `max`, and `maxAttempt` in options are configured otherwise it will use exactly same value on below example.
	 *
	 * @constructor
	 * @param {Pick<TTLCache.Options<K, V>, 'max' | 'ttl'> & RateLimiterOptions} [options] {@link TTLCache.Options TTLCache} and {@link RateLimiterOptions RateLimiter} options.
	 * @example
	 * ```js
	 * const MyRateLimiter = new RateLimiter(
	 * 	{ ttl: 60 * 1000, max: 250, maxAttempt: 3 }
	 * )
	 * ```
	 */
	constructor(options = { ttl: 60 * 1000, max: 250, maxAttempt: 3 }) {
		let { maxAttempt = 3, ...ttlCacheOptions } = options;

		ttlCacheOptions = {
			max: ttlCacheOptions?.max ?? 250,
			ttl: ttlCacheOptions?.ttl ?? 60 * 1000,
			updateAgeOnGet: false, // Do not reset TTL when accessing
			checkAgeOnGet: true, // Expire items immediately on get if TTL expired
			noUpdateTTL: true // Prevent TTL from refreshing on set
		};

		super(ttlCacheOptions);

		this.maxAttempt =
			typeof maxAttempt === 'number' && maxAttempt > 0 ? maxAttempt : 3;
	}

	/**
	 * Attempts to perform an action for the given key.
	 *
	 * - If the key does not exist and cache has not reached max capacity, it is added.
	 * - If the key exists but has remaining attempts, it increments the attempt count.
	 * - If the key exists but exceeded allowed attempts, it rejects.
	 * - If the key does not exist but cache is full, it rejects immediately.
	 *
	 * @param {K} key Key to identify the requester (typically a user ID).
	 * @returns {boolean} Returns `true` if the attempt is allowed, otherwise `false`.
	 */
	attempt(key) {
		const currentCount = this.get(key);

		if (typeof currentCount === 'number') {
			if (currentCount >= this.maxAttempt) {
				// Key exists but has exceeded allowed attempts
				return false;
			}

			this.set(key, currentCount + 1);
			return true;
		} else {
			if (this.size >= this.max) {
				// Cache full, cannot add new key
				return false;
			}

			this.set(key, 1);
			return true;
		}
	}

	/**
	 * Update the maximum allowed attempts dynamically.
	 *
	 * @param {number} newMaxAttempt The new maximum attempt limit, must be a positive number otherwise falls back to default `3`.
	 */
	setMaxAttempt(newMaxAttempt) {
		this.maxAttempt =
			Number.isInteger(newMaxAttempt) && newMaxAttempt > 0 ? newMaxAttempt : 3;
	}
}
