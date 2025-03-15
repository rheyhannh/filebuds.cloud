import axios from 'axios';
import config from '../config/global.js';
import * as SupabaseTypes from '../schemas/supabase.js'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const { SB_REST_URL, SB_SERVICE_KEY } = config;

/**
 * Axios instance for interacting with `Supabase` REST API.
 * Uses a predefined base URL and authorization headers.
 */
const axiosSupabase = axios.create({
	baseURL: SB_REST_URL,
	headers: {
		Authorization: `Bearer ${SB_SERVICE_KEY}`,
		apikey: SB_SERVICE_KEY
	}
});

/**
 * Retrieves job logs from `Supabase` database based on the provided filter criteria.
 *
 * It will constructs a query string from the `filter` object, where each key-value pair
 * is converted into a query parameter following the `eq.{value}` format for Supabase filtering.
 *
 * To prevent unnecessary job logs from being returned, atleast one filter criteria must be provided otherwise an error will be thrown.
 *
 * @param {SupabaseTypes.JobLogQueryParams} filter An object containing key-value pairs used to filter job logs. Atleast one filter criteria must be provided.
 * @throws {Error} Throws an error if no filter criteria is provided.
 * @returns {Promise<Array<SupabaseTypes.JobLogEntry> | undefined>} A promise resolving to an array of job log entries, or `undefined` if the request fails.
 */
const getJobLog = async (filter) => {
	if (!filter) {
		throw new Error("Param 'filter' required.");
	}

	if (typeof filter !== 'object' || Array.isArray(filter)) {
		throw new Error("Param 'filter' must be an object.");
	}

	// Atleast one filter criteria is required.
	if (Object.keys(filter).length === 0) {
		throw new Error('Atleast one filter criteria is required.');
	}

	try {
		const queries = Object.entries(filter)
			.filter(([, val]) => Boolean(val))
			.map(
				([key, val]) =>
					`${encodeURIComponent(key)}=eq.${encodeURIComponent(val)}`
			)
			.join('&');

		const { data } =
			/** @type {import('axios').AxiosResponse<Array<SupabaseTypes.JobLogEntry>>} */ (
				await axiosSupabase.get(`/job-logs?${queries}`)
			);

		return data;
	} catch {
		return undefined;
	}
};

/**
 * Adds a new job log entry to the `Supabase` database.
 *
 * This function logs the state of a job based on the provided parameters. It validates
 * the job event type, job ID, associated user ID, associated Telegram user ID,
 * whether the log entry should be immutable and its tool type.
 *
 * The function will throw an error if required parameters are missing or invalid.
 *
 * @param {'task.completed' | 'task.failed' | 'downloader.completed' | 'downloader.failed'} event Event type describing job name and its state.
 * @param {string} jobId Unique identifier of the job.
 * @param {string} userId User ID associated with the job. When `telegramUserId` is provided, this parameter is optional.
 * @param {number} telegramUserId Telegram user ID associated with the job. When `userId` is provided, this parameter is optional.
 * @param {boolean} immutable Whether the log entry should be immutable.
 * @param {ILoveApiTypes.ToolEnum} tool Tool used for processing the job.
 * @param {Object} [toolOptions={}] Additional tool-specific options, default is empty object `{}`.
 * @param {SupabaseTypes.FileJobLogProps} [files] File details associated with the job, default is `null`.
 * @param {SupabaseTypes.JobLogEntry['task_worker_result'] | SupabaseTypes.JobLogEntry['downloader_worker_result']} [workerResult=null] Result of the worker processing the job, default is `null`.
 * @param {SupabaseTypes.WorkerErrorJobLogProps} [workerError=null] Details of any errors encountered during processing, default is `null`.
 * @param {SupabaseTypes.WorkerStatsJobLogProps} [workerStats=null] Additional statistics related to the worker process, default is `null`.
 * @throws {Error} Throws an error if required parameters are missing or invalid.
 * @returns {Promise<{ ok: boolean }>} An object indicating are request success or failure.
 */
const addJobLog = async (
	event,
	jobId,
	userId,
	telegramUserId,
	immutable,
	tool,
	toolOptions = {},
	files = null,
	workerResult = null,
	workerError = null,
	workerStats = null
) => {
	if (typeof event !== 'string') {
		throw new Error("Param 'event' required and must be string.");
	}
	const jobName = /** @type {'task' | 'downloader'} */ (event.split('.')[0]);
	if (!['task', 'downloader'].includes(jobName)) {
		throw new Error('Invalid job name.');
	}
	const jobState = /** @type {'completed' | 'failed'} */ (event.split('.')[1]);
	if (!['completed', 'failed'].includes(jobState)) {
		throw new Error('Invalid job result type.');
	}

	if (typeof jobId !== 'string') {
		throw new Error("Param 'jobId' required and must be string.");
	}

	if (!userId && !telegramUserId) {
		throw new Error("Atleast 'userId' or 'telegramUserId' must be provided.");
	}

	if (typeof immutable !== 'boolean') {
		throw new Error("Param 'immutable' required and must be boolean.");
	}

	if (typeof tool !== 'string') {
		throw new Error("Param 'tool' required and must be string.");
	}

	const payload = /** @type {SupabaseTypes.JobLogEntry} */ ({
		job_id: jobId,
		user_id: userId,
		tg_user_id: telegramUserId,
		immutable,
		tool,
		tool_options: toolOptions,
		files,
		[`${jobName}_worker_state`]: jobState,
		[`${jobName}_worker_result`]: workerResult,
		[`${jobName}_worker_error`]: workerError,
		[`${jobName}_worker_stats`]: workerStats
	});

	try {
		await axiosSupabase.post('/job-logs', payload);
		return { ok: true };
	} catch {
		return { ok: false };
	}
};

/**
 * Updates an existing job log entry in the `Supabase` database.
 *
 * This function updates a job log entry based on the provided filter criteria and the job name.
 * It ensures that the event type, filter, and immutability flag are valid before proceeding.
 *
 * To prevent accidental updates atleast two filter criteria must be provided otherwise an error will be thrown.
 *
 * @param {'task.completed' | 'task.failed' | 'downloader.completed' | 'downloader.failed'} event Event type describing job name and its state.
 * @param {Omit<SupabaseTypes.JobLogQueryParams, 'immutable' | 'task_worker_state' | 'downloader_worker_state'>} filter Filtering criteria to find the job log entry. Atleast two filter criteria must be provided.
 * @param {boolean} immutable Whether the log entry should be immutable.
 * @param {SupabaseTypes.JobLogEntry['task_worker_result'] | SupabaseTypes.JobLogEntry['downloader_worker_result']} [workerResult=null] Result of the worker processing the job, default is `null`.
 * @param {SupabaseTypes.WorkerErrorJobLogProps} [workerError=null] Details of any errors encountered during processing, default is `null`.
 * @param {SupabaseTypes.WorkerStatsJobLogProps} [workerStats=null] Additional statistics related to the worker process, default is `null`.
 * @throws {Error} Throws an error if required parameters are missing or invalid.
 * @returns {Promise<{ ok: boolean }>} An object indicating are request success or failure.
 */
const updateWorkerJobLog = async (
	event,
	filter,
	immutable,
	workerResult = null,
	workerError = null,
	workerStats = null
) => {
	if (typeof event !== 'string') {
		throw new Error("Param 'event' required and must be string.");
	}
	const jobName = /** @type {'task' | 'downloader'} */ (event.split('.')[0]);
	if (!['task', 'downloader'].includes(jobName)) {
		throw new Error('Invalid job name.');
	}
	const jobState = /** @type {'completed' | 'failed'} */ (event.split('.')[1]);
	if (!['completed', 'failed'].includes(jobState)) {
		throw new Error('Invalid job result type.');
	}

	if (!filter) {
		throw new Error("Param 'filter' required.");
	}

	if (typeof filter !== 'object' || Array.isArray(filter)) {
		throw new Error("Param 'filter' must be an object.");
	}

	// Atleast two filters are required to prevent accidental updates.
	if (Object.keys(filter).length < 2) {
		throw new Error(
			'Atleast two filters are required to prevent accidental updates.'
		);
	}

	if (typeof immutable !== 'boolean') {
		throw new Error("Param 'immutable' required and must be boolean.");
	}

	const payload =
		/** @type {Omit<SupabaseTypes.JobLogEntry, 'job_id' | 'user_id' | 'tg_user_id' | 'tool' | 'tool_options' | 'files'>} */ ({
			immutable,
			[`${jobName}_worker_state`]: jobState,
			[`${jobName}_worker_result`]: workerResult,
			[`${jobName}_worker_error`]: workerError,
			[`${jobName}_worker_stats`]: workerStats
		});

	try {
		const queries = Object.entries(filter)
			.filter(([, val]) => Boolean(val))
			.map(
				([key, val]) =>
					`${encodeURIComponent(key)}=eq.${encodeURIComponent(val)}`
			)
			.join('&');

		await axiosSupabase.patch(`/job-logs?${queries}`, payload);
		return { ok: true };
	} catch {
		return { ok: false };
	}
};

export default {
	axiosSupabase,
	getJobLog,
	addJobLog,
	updateWorkerJobLog
};
