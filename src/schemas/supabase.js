import * as ILoveApiTypes from './iloveapi.js'; // eslint-disable-line
import * as TelegramBotTypes from './bot.js'; // eslint-disable-line

/**
 * @typedef {Object} BaseJobLogProps
 * Represents a job log entry on Supabase PostgreSQL.
 * @property {number} id
 * Unique job identifier used as the primary key in Supabase PostgreSQL.
 * @property {string} job_id
 * Unique SHA1 hash created using `userId`, `tool`, and `timestamp` at job creation.
 * @property {number} created_at
 * Timestamp (in milliseconds) indicating when the job log was created.
 * @property {string | null} user_id
 * User identifier matching a registered user ID on Supabase or a user's IP address,
 * `null` when the request originates from a Telegram bot.
 * @property {number | null} tg_user_id
 * Telegram user ID, `null` when the request originates from the web.
 * @property {ILoveApiTypes.ToolEnum} tool
 * Tool type used for this job.
 * @property {Object} tool_options
 * Options related to the used tool.
 * @property {boolean} immutable
 * Indicates if the job log is immutable.
 * Useful for informing users that no further processing is awaited.
 */

/**
 * @typedef {Object} FileJobLogProps
 * File details associated with the job.
 * @property {TelegramBotTypes.FileTypeEnum} file_type
 * The type of file.
 * @property {string | string[]} file_link
 * A link (or multiple links) to the file(s).
 */

/**
 * @typedef {'completed' | 'failed'} WorkerStateJobLogEnum
 */

/**
 * @typedef {Object} WorkerErrorJobLogProps
 * @property {string | undefined} failed_reason
 * Explanation of why the job failed.
 * @property {string | undefined} stacktrace
 * Error stack trace.
 */

/**
 * @typedef {Object} WorkerStatsJobLogProps
 * @property {number} created_at
 * Timestamp (ms) when job created.
 * @property {number} processed_at
 * Timestamp (ms) when job began.
 * @property {number} finished_at
 * Timestamp (ms) when job finished.
 * @property {number} ats
 * Number of attempts when job is moved to active.
 * @property {number} atm
 * Number of attempts after the job has failed.
 * @property {number} delay
 * Job delay in milliseconds.
 * @property {number} priority
 * Job priority (0 = highest, 2,097,152 = lowest).
 */

/**
 * @typedef {Object} WorkerBaseJobLogProps
 * @property {WorkerStateJobLogEnum} task_worker_state
 * State of the `task` worker.
 * @property {ILoveApiTypes.TaskCreationResult | null} task_worker_result
 * Result returned by the `task` worker, `null` if the job fails.
 * @property {WorkerErrorJobLogProps | null} task_worker_error
 * Error details if the `task` job fails, `null` if the job completes successfully.
 * @property {WorkerStatsJobLogProps} task_worker_stats
 * Performance statistics for the `task` worker.
 * @property {WorkerStateJobLogEnum} downloader_worker_state
 * State of the `downloader` worker.
 * @property {ILoveApiTypes.CallbackRequestBodyProps | null} downloader_worker_result
 * Result from the `downloader` worker based on `ILoveApi` callback request body, `null` if the job fails.
 * @property {WorkerErrorJobLogProps | null} downloader_worker_error
 * Error details if the `downloader` job fails, `null` if the job completes successfully.
 * @property {WorkerStatsJobLogProps} downloader_worker_stats
 * Performance statistics for the `downloader` worker.
 */

/**
 * @typedef {BaseJobLogProps & { files:FileJobLogProps } & WorkerBaseJobLogProps} JobLogEntry
 * Represents a job log entry on Supabase PostgreSQL.
 */

/**
 * @typedef {Omit<BaseJobLogProps, 'created_at' | 'tool_options'> & Pick<WorkerBaseJobLogProps, 'task_worker_state' | 'downloader_worker_state'>} JobLogQueryParams
 * Represents a set of key-value pairs used to query job log entries in Supabase PostgreSQL.
 * Each key corresponds to a column in the job log table, and its value is used as a filter in the database query.
 */

export default {};
