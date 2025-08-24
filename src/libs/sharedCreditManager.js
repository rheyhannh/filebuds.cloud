import config from '../config/global.js';
import { Mutex } from 'async-mutex';
import redisClient from '../config/redis.js';
import dayjs from 'dayjs';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';
import * as SupabaseTypes from '../schemas/supabase.js'; // eslint-disable-line

const { IS_TEST, SB_URL, SB_SERVICE_KEY } = config;

export const DAILY_SHARED_CREDIT_LIMIT = 70;

/**
 * Available methods in {@link SharedCreditManager}.
 * @typedef {'getKeyForToday' | 'getCreditsLeft' | 'initDailyCredits' | 'consumeCredits' | 'refundCredits' | 'updateCreditsInSupabase' | 'compareCreditsLeft'} MethodNames
 */

/**
 * Redis client instance used in {@link SharedCreditManager}.
 *
 * - In non-test environments, this is the actual `redisClient`.
 * - In the `test` environment, this is a mocked object that simulates
 * basic Redis operations with default behaviors to avoid real Redis
 * interaction and allow smooth unit testing.
 */
export const redis = /** @type {import('ioredis').Redis} */ (
	IS_TEST
		? {
				get: async () => null,
				set: async () => 'OK',
				decrby: async () => 0,
				incrby: async () => 0
			}
		: redisClient
);

/**
 * Supabase client instance used in {@link SharedCreditManager}.
 */
export const supabase = createClient(SB_URL, SB_SERVICE_KEY);

/**
 * A mutex used to prevent race conditions when modifying shared daily credits.
 * Ensures that operations are executed sequentially to maintain consistency
 * between Redis and Supabase.
 *
 * Operation priorities are classified as follows:
 * - `3`: Initializing or updating credits on admin request.
 * - `2`: Refunding credits on user request.
 * - `1`: Consuming credits on user request.
 * - `0`: Non-critical operations (e.g., monitoring or checking credits).
 */
const sharedCreditMutex = new Mutex();

/**
 * A class to handles the shared daily credit system for all users in the application.
 *
 * This class is designed to be used statically—no need to instantiate it with `new` or a constructor.
 * It provides utility methods to:
 * - Initialize daily shared credits in Supabase.
 * - Read remaining credits from Redis or Supabase.
 * - Atomically consume credits from Redis cache.
 * - Refund credits in case of errors or rollbacks.
 *
 * It ensures atomic-like credit operations using `Redis` and synchronizes with `Supabase` for persistence and auditability.
 *
 * ### Usage
 * ```js
 * import scm from './sharedCreditManager.js';
 *
 * // Initialize daily shared credits.
 * await scm.initDailyCredits();
 *
 * // Get remaining shared credits for today.
 * const remainingCredits = await scm.getCreditsLeft();
 * console.log(remainingCredits) // e.g. 300
 *
 * // Consume 10 credits from the shared pool.
 * const consumeResult = await scm.consumeCredits(10, 'Consume 10 credits');
 * console.log(remainingCredits) // e.g. false
 *
 * // Refund 5 credits back to the shared pool.
 * const refundResult = await scm.refundCredits(5, 'Refund 5 credits');
 * console.log(remainingCredits) // e.g. true
 * ```
 *
 * @class SharedCreditManager
 */
export default class SharedCreditManager {
	/**
	 * Logs a message with contextual information about the caller method.
	 *
	 * This utility is intended to standardize logging across the SharedCreditManager
	 * by prefixing logs with a consistent format `[sharedCreditManager:<method>]`.
	 *
	 * @static
	 * @private Internal usage only.
	 * @param {'debug' | 'warn' | 'error'} type - Logging type.
	 * @param {MethodNames} caller - The name of the calling method within SharedCreditManager.
	 * @param {string} msg - Debug message to be logged.
	 * @param {Object} obj - Additional data or context to be logged alongside the message.
	 */
	static log(type, caller, msg, obj) {
		if (type === 'debug') {
			if (!IS_TEST) {
				logger.debug(obj, `[sharedCreditManager:${caller || '-'}] ${msg}`);
			}
		} else if (type === 'warn') {
			logger.warn(obj, `[sharedCreditManager:${caller || '-'}] ${msg}`);
		} else if (type === 'error') {
			logger.error(obj, `[sharedCreditManager:${caller || '-'}] ${msg}`);
		}
	}

	/**
	 * Generate the Redis key for today's shared credits.
	 *
	 * @static
	 * @private Internal usage only.
	 * @returns {string} Redis key in format `sharedCredits:YYYY-MM-DD`
	 */
	static getKeyForToday() {
		const today = dayjs().format('YYYY-MM-DD');
		return `sharedCredits:${today}`;
	}

	/**
	 * Get remaining shared credits for today.
	 * - Prioritizes Redis cache.
	 * - Falls back to Supabase and initializes if `shouldInit` is true.
	 *
	 * @static
	 * @param {boolean} [shouldInit=true] Whether to initialize daily shared credits if not found in Redis nor Supabase, default to `true`.
	 * @returns {Promise<number | undefined>} Remaining shared credits. When remaining shared credits not found in Redis nor Supabase and `shouldInit` is false, returns `undefined`.
	 */
	static async getCreditsLeft(shouldInit = true) {
		const key = this.getKeyForToday();
		const redisValue = await redis.get(key);

		if (redisValue !== null) return parseInt(redisValue);

		const { data, error } =
			/** @type {{data:SupabaseTypes.SharedCreditEntry | null, error:import('@supabase/supabase-js').PostgrestError | null}} */ (
				await supabase
					.from('shared-credits')
					.select('credits_left')
					.eq('date', dayjs().format('YYYY-MM-DD'))
					.single()
			);

		if (error || !data) {
			if (shouldInit) {
				await this.initDailyCredits();
				return DAILY_SHARED_CREDIT_LIMIT;
			}
			return undefined;
		}

		await redis.set(key, data.credits_left, 'EX', 60 * 60 * 24);
		return data.credits_left;
	}

	/**
	 * Initialize daily shared credits in Supabase and Redis if not already existing.
	 * Sets today's shared credits to the specified `amount`. If no amount is provided, it defaults to {@link DAILY_SHARED_CREDIT_LIMIT}.
	 *
	 * @static
	 * @priority {@link sharedCreditMutex `3`}
	 * @param {number} [amount=DAILY_SHARED_CREDIT_LIMIT] Amount of shared credits to set for today.
	 * @throws {Error} If Supabase fails to upsert entry.
	 */
	static async initDailyCredits(amount) {
		await sharedCreditMutex.runExclusive(async () => {
			const x = Number.isInteger(amount) ? amount : DAILY_SHARED_CREDIT_LIMIT;
			const todayKey = this.getKeyForToday();
			const today = todayKey.split(':')[1];
			const sbArgs = [
				{
					date: today,
					credits_left: x,
					created_at: new Date(),
					created_by: 'scm:initDailyCredits',
					last_updated_at: new Date(),
					last_updated_by: 'scm:initDailyCredits',
					comment: `Initiating daily shared credits for ${today} with ${x} credits`
				},
				{ onConflict: ['date'] }
			];
			const { error } = await supabase.from('shared-credits').upsert(...sbArgs);

			if (error) {
				this.log('debug', 'initDailyCredits', 'Supabase upsert failed', {
					args: { amount },
					details: { today, sbArgs }
				});

				throw error;
			}

			await redis.set(todayKey, x, 'EX', 60 * 60 * 24);

			this.log(
				'debug',
				'initDailyCredits',
				'Successfully initialize and set shared credit quota',
				{
					args: { amount },
					details: { today },
					result: x
				}
			);

			// TODO: Pass 'details' if exist.
			await this.addCreditsTransactionInSupabase(today, 'init', x);
		}, 3);
	}

	/**
	 * Consume (decrease) a specific number of credits from the daily shared pool.
	 * Ensures Redis and Supabase are both updated.
	 *
	 * @static
	 * @priority {@link sharedCreditMutex `1`}
	 * @param {number} amount Number of credits to consume.
	 * @param {string} [reason] Optional reason for the credit consumption.
	 * @param {string} [refId] Identifier as reference why the credit consumption was made, `null` when not provided.
	 * @param {Object} [details] Object as additional details related to transaction, `null` when not provided.
	 * @returns {Promise<boolean>} Whether the consumption was successful (enough credits available).
	 */
	static async consumeCredits(
		amount,
		reason = null,
		refId = null,
		details = null
	) {
		return await sharedCreditMutex.runExclusive(async () => {
			if (typeof amount !== 'number' || amount < 0) {
				throw new TypeError(
					"Param 'amount' should be number and positive number"
				);
			}

			const key = this.getKeyForToday();
			const today = key.split(':')[1];
			const newRemaining = await redis.decrby(key, amount);

			if (newRemaining >= 0) {
				await this.updateCreditsInSupabase(
					newRemaining,
					reason ?? `Consume ${amount} credits`
				);

				this.log(
					'debug',
					'consumeCredits',
					'Successfully consumed shared credit',
					{
						args: { amount, reason, refId, details },
						details: { key },
						computed: newRemaining + amount,
						result: newRemaining
					}
				);

				await this.addCreditsTransactionInSupabase(
					today,
					'consume',
					amount,
					reason,
					refId,
					details
				);

				return true;
			}

			await redis.incrby(key, amount);

			this.log(
				'debug',
				'consumeCredits',
				'Shared credit consumption failed due to insufficient quota',
				{
					args: { amount, reason, refId, details },
					details: { key },
					computed: newRemaining + amount,
					result: newRemaining
				}
			);

			return false;
		}, 1);
	}

	/**
	 * Refund or add back credits to the daily shared credit pool.
	 *
	 * @static
	 * @priority {@link sharedCreditMutex `2`}
	 * @param {number} amount Amount of credits to refund.
	 * @param {string} [reason] Optional reason for refund.
	 */
	static async refundCredits(amount, reason = null) {
		await sharedCreditMutex.runExclusive(async () => {
			if (typeof amount !== 'number' || amount < 0) {
				throw new TypeError(
					"Param 'amount' should be number and positive number"
				);
			}

			const key = this.getKeyForToday();
			const today = key.split(':')[1];
			const redisValue = await redis.get(key);

			if (redisValue === null) {
				this.log(
					'debug',
					'refundCredits',
					'Failed to refund shared credit because it was not initialized',
					{
						args: { amount, reason },
						details: { key },
						computed: redisValue
					}
				);

				return;
			}

			const newRemaining = await redis.incrby(key, amount);

			await this.updateCreditsInSupabase(
				newRemaining,
				reason ?? `Refunded ${amount} credits`
			);

			this.log(
				'debug',
				'refundCredits',
				'Successfully refunded shared credit',
				{
					args: { amount, reason },
					details: { key },
					computed: newRemaining - amount,
					result: newRemaining
				}
			);

			// TODO: Pass 'refId' or 'details' if exist.
			await this.addCreditsTransactionInSupabase(
				today,
				'refund',
				amount,
				reason
			);
		}, 2);
	}

	/**
	 * Update the remaining credits in Supabase for today's entry.
	 *
	 * @static
	 * @private Internal usage only.
	 * @param {number} remaining New value of remaining credits.
	 * @param {string} [comment] Optional comment for auditing/logging.
	 */
	static async updateCreditsInSupabase(remaining, comment = null) {
		const today = dayjs().format('YYYY-MM-DD');
		await supabase
			.from('shared-credits')
			.update({
				credits_left: remaining,
				last_updated_at: new Date(),
				last_updated_by: 'scm:updateCreditsInSupabase',
				comment
			})
			.eq('date', today);
	}

	/**
	 * Compares the shared credits left between Redis and Supabase for today's date.
	 *
	 * @static
	 * @priority {@link sharedCreditMutex `3`}
	 * @returns {Promise<{ redisValue: number | null, supabaseValue: number | null, diff: number | null, equal: boolean | null }>} An object containing the Redis value, Supabase value, their difference, and a boolean indicating if they are equal.
	 */
	static async compareCreditsLeft() {
		return await sharedCreditMutex.runExclusive(async () => {
			const redisKey = this.getKeyForToday();
			const redisRaw = await redis.get(redisKey);

			const { data: supabaseEntry } =
				/** @type {{data:SupabaseTypes.SharedCreditEntry | null}} */ (
					await supabase
						.from('shared-credits')
						.select('credits_left')
						.eq('date', dayjs().format('YYYY-MM-DD'))
						.single()
				);

			const redisValueParsed = redisRaw !== null ? parseInt(redisRaw) : null;
			const redisValue = Number.isInteger(redisValueParsed)
				? redisValueParsed
				: null;
			const supabaseValue = Number.isInteger(supabaseEntry?.credits_left)
				? supabaseEntry.credits_left
				: null;

			const diff =
				Number.isInteger(redisValue) && Number.isInteger(supabaseValue)
					? Math.abs(supabaseValue - redisValue)
					: null;

			const equal =
				Number.isInteger(redisValue) && Number.isInteger(supabaseValue)
					? redisValue === supabaseValue
					: null;

			return { redisValue, supabaseValue, diff, equal };
		}, 3);
	}

	/**
	 * Adds a shared credits transaction record into Supabase.
	 *
	 * @static
	 * @private Internal usage only.
	 * @param {string} date Date in the format `'YYYY-MM-DD'`.
	 * @param {'init' | 'consume' | 'refund'} type Type of transaction.
	 * @param {number} amount Amount of transaction.
	 * @param {string} [comment] Comment for transaction, `null` when not provided.
	 * @param {string} [refId] Identifier as reference why the transaction was made, `null` when not provided.
	 * @param {Object} [details] Object as additional details related to transaction, `null` when not provided.
	 */
	static async addCreditsTransactionInSupabase(
		date,
		type,
		amount,
		comment = null,
		refId = null,
		details = null
	) {
		const { error } = await supabase
			.from('shared-credits-transactions')
			.insert({
				date,
				type,
				amount,
				comment,
				ref_id: refId,
				details
			})
			.select();

		if (error) {
			const obj = {
				args: { date, type, amount, comment, refId, details },
				response: { error }
			};

			this.log(
				'error',
				'addCreditsTransactionInSupabase',
				'Failed to add transaction in Supabase',
				obj
			);

			return;
		}
	}

	// TODO:
	// - [1] Add 'shared-credits-logs' table on Supabase to logs each transactions (consume, refund, init) with:
	// id(int8): Supabase auto increment number id's (assigned by Supabase)
	// date_key(string): Date key with format YYYY:MM:DD, reference to table shared-credits['data']
	// type('init' | 'consumse' | 'refund'): Type of transaction
	// amount(int8): Amount of transaction
	// comment(string | null): Comment related to transaction, null when not provided (example below)
	// ... 'Consuming 25 credits for upscaleimage job [job:somejobidhere]'
	// ... 'Refunding 15 credits due users being rate limited [log:somelogidhere]'
	// ... 'Refunding 10 credits due expired callback queries [log:somelogidhere]'
	// ... 'Refunding 40 credits due invalid uploaded media [log:somelogidhere]'
	// ... 'Refunding 55 credits due callback query handler failure [log:somelogidhere]'
	// ... 'Refunding 50 credits due task worker failure [log:somelogidhere]'
	// ... 'Refunding 55 credits due downloader worker failure [job:somejobidhere]'
	// ... 'Refunding 25 credits due task worker failure [job:somejobidhere]'
	// job_id(string | null): Reference to table job-logs['job_id'] or null when transaction not related to job
	// log_id(string | null): Reference to logger.base.id for debugging or null when transaction not related to log
	// created_at(timestampz): Supabase timestampz (assigned by Supabase)
	// - [2] Add updateCreditsTransactionsInSupabase(type, amount, comment, jobId, logId) to log each transactions.
}
