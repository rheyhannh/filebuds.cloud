import { createHash } from 'node:crypto';
import { Queue } from 'bullmq';
import redisClient from '../config/redis.js';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line
import * as ILoveIMGServiceTypes from '../services/iloveimg.js'; // eslint-disable-line
import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line

/**
 * @typedef {Object} TaskJobPayload
 * @property {string | undefined} userId
 * User identifier matching a registered user ID on Supabase or a user's IP address,
 * `undefined` when the request originates from a Telegram bot.
 * @property {number | undefined} telegramUserId
 * Telegram user ID, `undefined` when the request originates from the web.
 * @property {number | undefined} messageId
 * Telegram message ID that used to give feedback to user, such tracking job and its result.
 * When request initiated from web equal to `undefined`.
 * @property {ILoveApiTypes.ToolEnum} tool
 * ILoveAPI tool type being used. This corresponds to a supported processing tool.
 * @property {Object} toolOptions
 * Tool options specific to the tool being used.
 * @property {TelegramBotTypes.FileTypeEnum} fileType
 * The type of file.
 * @property {string | string[]} fileLink
 * Public file URL(s) string to be processed. Some tools (e.g., PDF merging) may require multiple file URLs.
 */

/**
 * @typedef {Object} AddTaskJobReturnType
 * @property {boolean} ok
 * Boolean indicating whether the `Task` job was successfully added to the queue.
 * @property {boolean | undefined} isWaiting
 * Boolean indicating whether the `Task` job is waiting in the queue,
 * `undefined` when job failed added to the queue.
 * @property {string | undefined} jid
 * Unique job ID (SHA1 hash) using `userId`, `tool`, and `timestamp` when job was created,
 * `undefined` when job failed added to the queue.
 */

/**
 * BullMQ queue instances for processing `Task`.
 * In order to keep running tests in CI/CD environment, queue are not created or equal to `null` when in `test` environment.
 */
const taskQueue =
	/** @type {Queue<TaskJobPayload, ILoveIMGServiceTypes.ServiceReturnType, ILoveApiTypes.ToolEnum> | null} */ (
		redisClient
			? new Queue('taskQueue', {
					connection: redisClient
				})
			: null
	);

/**
 * Add `Task` job that do,
 * 1. Make request to `ILoveAPI` server to initiating task.
 * 2. Make request for uploading files to `ILoveAPI` server.
 * 3. Make request to `ILoveAPI` server to process task.
 * @param {TaskJobPayload} data
 * @returns {Promise<AddTaskJobReturnType>} Promise resolving to an object containing `ok`, `isWaiting`, and `jid` properties.
 */
const addTaskJob = async (data) => {
	const { userId, tool } = data;

	try {
		/**
		 * Unix timestamp indicating when the job created.
		 */
		const jstamp = Date.now();
		/**
		 * Unique job ID (SHA1 hash) using `userId`, `tool`, and `timestamp`.
		 */
		const jid = createHash('sha1')
			.update(`${userId}-${tool}-${jstamp}`)
			.digest('hex');

		const job = await taskQueue.add(tool, data, {
			jobId: jid,
			timestamp: jstamp,
			// We log each jobs to Supabase, so redis log are not necessary.
			removeOnComplete: true,
			removeOnFail: true
		});

		return { ok: true, isWaiting: await job.isWaiting(), jid };
	} catch {
		return { ok: false };
	}
};

export default {
	addTaskJob
};
