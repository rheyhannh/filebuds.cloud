import config from './global.js';
import TTLCache from '@isaacs/ttlcache';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line
import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line

/**
 * @typedef {string} CachedMessageId
 * A concatenation string of the Telegram user ID and the message ID.
 *
 * For example, for user ID `185150` and message ID `258`, the key would be `'185150258'`.
 */

/**
 * @typedef {Object} UploadedFileInfo
 * Represents a user's uploaded file and associated metadata stored temporarily for processing.
 * @property {number} userId
 * Telegram user ID of the user who uploaded the file.
 * @property {number} messageId
 * Message ID of the message that the file was uploaded to.
 * @property {ILoveApiTypes.ToolEnum} tool
 * Tool type used to process the uploaded file.
 * @property {TelegramBotTypes.FileTypeEnum} fileType
 * Uploaded file type.
 * @property {Array<{fileName:string, fileLink:string}>} files
 * Array of file objects containing the file name and link associated with this upload, to be processed by the tool.
 */

const { IS_TEST } = config;

const locks = /** @type {Map<string, Promise<void>>} */ (new Map());

const userMessageUploadCache =
	/** @type {TTLCache<CachedMessageId, UploadedFileInfo>} */ (
		new TTLCache({
			ttl: IS_TEST ? 2000 : 1000 * 60 * 60 * 24, // 2 seconds in test mode, 1 day in production.
			max: IS_TEST ? 3 : 230, // 5 in test mode, 250 in production.
			checkAgeOnGet: true
		})
	);

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
 * @class RateLimiter
 * @template K, V
 * @extends {TTLCache<K, V>}
 * @see https://www.npmjs.com/package/@isaacs/ttlcache
 */
class RateLimiter extends TTLCache {
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
	 * Create a `RateLimiter` instance by configuring {@link TTLCache.Options TTLCache} and {@link RateLimiterOptions RateLimiter} options.
	 * Ensure `ttl`, `max`, and `maxAttempt` in options are configured otherwise it will use exactly same value on `example`.
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

/**
 * Acquire a lock per cache key and run a callback safely.
 * This ensures that operations on the same cache key are executed one at a time,
 * preventing race conditions or overwritten updates.
 *
 * @template T
 * @param {string} key Unique identifier with {@link CachedMessageId this} format.
 * @param {() => Promise<T>} fn An async function to execute exclusively under the lock.
 * @returns {Promise<T>} Result of the executed async function.
 */
const withLock = async (key, fn) => {
	const prev = locks.get(key) ?? Promise.resolve();

	let resolveNext;
	const next = new Promise((resolve) => {
		resolveNext = resolve;
	});

	locks.set(key, next);

	try {
		await prev;
		return await fn();
	} finally {
		resolveNext();

		if (locks.get(key) === next) {
			locks.delete(key);
		}
	}
};

export default {
	/**
	 * Map of active locks per cache key
	 * used to manage concurrency during cache operations
	 * to prevent race conditions when multiple asynchronous operations (e.g. file uploads)
	 * are trying to read and write to the same cache entry simultaneously.
	 *
	 * Each key must be in {@link CachedMessageId this} format,
	 * and the value is a `Promise` that represents the current lock.
	 */
	locks,
	/**
	 * A temporary cache for user-uploaded files.
	 *
	 * Each key must be in {@link CachedMessageId this} format.
	 * Values are metadata about the {@link UploadedFileInfo uploaded files}, expiring after 24 hour (non-refreshing TTL).
	 *
	 * #### When updating a cache entry using `set()`, ensures :
	 * - Update operations should be wrapped inside `withLock` helper function, to prevent race conditions.
	 * - Should called with `{ noUpdateTTL: true }`, to prevent TTL from being updated. This behaviour also used to synchronize other services (Telegram API) to works as expected.
	 */
	userMessageUploadCache,
	/**
	 * An async function to acquire a lock per cache key and run a callback safely.
	 * This ensures that operations on the same cache key are executed one at a time,
	 * preventing race conditions or overwritten updates.
	 */
	withLock,
	RateLimiter
};
