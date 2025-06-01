import config from '../config/global.js';
import { Mutex } from 'async-mutex';
import redisClient from '../config/redis.js';
import dayjs from 'dayjs';
import { createClient } from '@supabase/supabase-js';
import * as SupabaseTypes from '../schemas/supabase.js'; // eslint-disable-line

const { IS_TEST, SB_URL, SB_SERVICE_KEY } = config;

export const DAILY_SHARED_CREDIT_LIMIT = 70;

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
 * Ensures that operations like consuming and refunding credits are executed
 * sequentially to maintain consistency between Redis and Supabase.
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
	 * @param {number} [amount=DAILY_SHARED_CREDIT_LIMIT] Amount of shared credits to set for today.
	 * @throws {Error} If Supabase fails to upsert entry.
	 */
	static async initDailyCredits(amount) {
		const x = Number.isInteger(amount) ? amount : DAILY_SHARED_CREDIT_LIMIT;
		const today = dayjs().format('YYYY-MM-DD');
		const { error } = await supabase.from('shared-credits').upsert(
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
		);

		if (error) {
			throw new Error('Failed to initialize daily shared credits in Supabase');
		}

		await redis.set(this.getKeyForToday(), x, 'EX', 60 * 60 * 24);
	}

	/**
	 * Consume (decrease) a specific number of credits from the daily shared pool.
	 * Ensures Redis and Supabase are both updated.
	 *
	 * @static
	 * @param {number} amount Number of credits to consume.
	 * @param {string} [reason] Optional reason for the credit consumption.
	 * @returns {Promise<boolean>} Whether the consumption was successful (enough credits available).
	 */
	static async consumeCredits(amount, reason = null) {
		if (typeof amount !== 'number' || amount < 0) return false;

		return await sharedCreditMutex.runExclusive(async () => {
			const key = this.getKeyForToday();
			const newRemaining = await redis.decrby(key, amount);

			if (newRemaining >= 0) {
				await this.updateCreditsInSupabase(
					newRemaining,
					reason ?? `Consume ${amount} credits`
				);
				return true;
			}

			await redis.incrby(key, amount);
			return false;
		});
	}

	/**
	 * Refund or add back credits to the daily shared credit pool.
	 *
	 * @static
	 * @param {number} amount Amount of credits to refund.
	 * @param {string} [reason] Optional reason for refund.
	 */
	static async refundCredits(amount, reason = null) {
		if (typeof amount !== 'number' || amount < 0) return;

		await sharedCreditMutex.runExclusive(async () => {
			const key = this.getKeyForToday();
			const redisValue = await redis.get(key);

			if (redisValue === null) return;

			const newRemaining = await redis.incrby(key, amount);

			await this.updateCreditsInSupabase(
				newRemaining,
				reason ?? `Refunded ${amount} credits`
			);
		});
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
	 * @returns {Promise<{ redisValue: number | null, supabaseValue: number | null, diff: number | null, equal: boolean | null }>} An object containing the Redis value, Supabase value, their difference, and a boolean indicating if they are equal.
	 */
	static async compareCreditsLeft() {
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
	}
}
