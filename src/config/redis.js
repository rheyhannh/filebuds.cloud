import { Redis } from 'ioredis';
import config from './global.js';

const { IS_TEST, REDIS_URL, REDIS_HOST, REDIS_PORT } = config;

/**
 * Creates and returns a Redis client instance.
 *
 * - If `IS_TEST` is `true`, it returns `null` (no Redis connection in tests).
 * - If `REDIS_URL` is provided, it initializes Redis with the URL.
 * - If `REDIS_HOST` and `REDIS_PORT` are provided, it initializes Redis with host and port.
 * - If neither `REDIS_URL` nor `REDIS_HOST` and `REDIS_PORT` are available, it throws an error.
 *
 * @returns {Redis | null} Redis client instance or `null` if in test mode.
 * @throws {Error} Throws an error if neither `REDIS_URL` nor `REDIS_HOST` and `REDIS_PORT` are set.
 */
function createRedisClient() {
	if (IS_TEST) {
		return null;
	}

	if (REDIS_URL) {
		return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
	}

	if (typeof REDIS_PORT !== 'string' && typeof REDIS_PORT !== 'number') {
		throw new Error(
			'Expected REDIS_PORT to be a string or number. If you are using a Redis connection URL, set the REDIS_URL environment variable instead.'
		);
	}

	const port = Number(REDIS_PORT);
	if (!Number.isInteger(port) || port <= 0) {
		throw new Error(
			'Invalid REDIS_PORT, must be a positive integer. If you prefer using a Redis connection URL, set the REDIS_URL environment variable instead.'
		);
	}

	if (REDIS_HOST) {
		return new Redis({
			host: REDIS_HOST,
			port,
			maxRetriesPerRequest: null
		});
	}

	throw new Error(
		'Failed to initialize Redis client. Provide either REDIS_URL or both REDIS_HOST and REDIS_PORT.'
	);
}

/**
 * Redis client instance, `null` when running in test environment.
 */
const redisClient = createRedisClient();

export default redisClient;
