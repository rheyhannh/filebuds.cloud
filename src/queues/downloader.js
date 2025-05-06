import { Queue } from 'bullmq';
import redisClient from '../config/redis.js';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line
import * as TaskQueueTypes from '../queues/task.js'; // eslint-disable-line

/**
 * @typedef {ILoveApiTypes.CallbackRequestBodyProps} DownloaderJobPayload
 */

/**
 * @typedef {Object} AddDownloaderJobReturnType
 * @property {boolean} ok
 * Boolean indicating whether the `Downloader` job was successfully added to the queue.
 * @property {boolean | undefined} isWaiting
 * Boolean indicating whether the `Downloader` job is waiting in the queue,
 * `undefined` when job failed added to the queue.
 * @property {TaskQueueTypes.AddTaskJobReturnType['jid']} jid
 * Unique job ID (SHA1 hash) refer to `Task` {@link TaskQueueTypes.AddTaskJobReturnType.jid job ID},
 * `undefined` when job failed added to the queue.
 */

/**
 * BullMQ queue instances for processing `Downloader`.
 * In order to keep running tests in CI/CD environment, queue are not created or equal to `null` when in `test` environment.
 */
const downloaderQueue =
	/** @type {Queue<DownloaderJobPayload, undefined, ILoveApiTypes.CallbackEventEnum> | null} */ (
		redisClient
			? new Queue('downloaderQueue', {
					connection: redisClient
				})
			: null
	);

/**
 * Add `Downloader` job that do,
 * 1. Make request to `ILoveAPI` server to download processed files.
 * 2. Forwards the downloaded files to the user's Telegram chat.
 * @param {DownloaderJobPayload} data
 * @returns {Promise<AddDownloaderJobReturnType>} Promise resolving to an object containing `ok`, `isWaiting`, and `jid` properties.
 */
const addDownloaderJob = async (data) => {
	const { event } = data;

	try {
		/**
		 * Unix timestamp indicating when the job created.
		 */
		const jstamp = Date.now();
		/**
		 * Unique job ID (SHA1 hash) refer to `Task` job {@link TaskQueueTypes.AddTaskJobReturnType.jid ID}.
		 */
		const jid = data.data.task.custom_string;

		const job = await downloaderQueue.add(event, data, {
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
	addDownloaderJob
};
