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

	locks.set(
		key,
		prev.then(() => next)
	);

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
	withLock
};
