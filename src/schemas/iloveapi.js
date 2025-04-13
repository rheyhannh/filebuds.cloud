/**
 * @typedef {'upscaleimage' | 'convertimage' | 'removebackgroundimage' | 'watermarkimage'} ToolEnum
 */

/**
 * @typedef {'TaskWaiting' | 'TaskProcessing' | 'TaskSuccess' | 'TaskSuccessWithWarnings' | 'TaskError' | 'TaskDeleted' | 'TaskNotFound'} TaskStatusEnum
 */

/**
 * @typedef {Object} FileInformationProps
 * @property {Object} original
 * Object that describe original file information.
 * @property {string} original.name
 * Original file name.
 * - Ex: `myimage`
 * @property {string} original.extension
 * Original file extension without the dot.
 * - Ex: `jpg`
 * @property {string} original.filename
 * Original filename with extension.
 * - Ex: `myimage.jpg`
 * @property {Object} output
 * Object that describe output file information.
 * @property {string} output.name
 * Output file name.
 * - Ex: `result`
 * @property {string} output.extension
 * Output file extension without the dot.
 * - Ex: `jpg`
 * @property {string} output.filename
 * Output filename with extension.
 * - Ex: `result.jpg`
 */

/**
 * @typedef {'task.completed' | 'task.failed'} CallbackEventEnum
 * See more at `ILoveApi` webhook {@link https://www.iloveapi.com/docs/api-reference#webhooks event} attribute.
 */

/**
 * {@link https://ajv.js.org/ Ajv} schema that describe `ILoveApi` callback request body {@link https://www.iloveapi.com/docs/api-reference#webhooks event} attribute.
 */
export const CallbackEventEnumAjvSchema = {
	type: ['string'],
	enum: ['task.completed', 'task.failed']
};

/**
 * @typedef {Object} CallbackDataProps
 * See more at `ILoveApi` webhook {@link https://www.iloveapi.com/docs/api-reference#webhooks data} attribute.
 * @property {Object} task
 * See more at `ILoveApi` webhook {@link https://www.iloveapi.com/docs/api-reference#webhooks task} attribute.
 * @property {ToolEnum | undefined} task.tool
 * ILoveApi tool type.
 * @property {string | undefined} task.process_start
 * Date-like when process started.
 * - Ex: `2025-02-04 09:36:45`
 * @property {number | null | undefined} task.custom_int
 * Assigned `custom_int` value.
 * @property {string | null | undefined} task.custom_string
 * Assigned `custom_string` value.
 * @property {TaskStatusEnum | undefined} task.status
 * Task status.
 * @property {string | undefined} task.status_message
 * Task status message.
 * @property {string | undefined} task.timer
 * Process duration in string.
 * - Ex: `23.258`
 * @property {number | undefined} task.filesize
 * Original image file size in `bytes`.
 * @property {number | undefined} task.output_filesize
 * Processed image file size in `bytes`.
 * @property {number | undefined} task.output_filenumber
 * Total image file that already been processed.
 * When compressed in ZIP, this match to total files in ZIP archive.
 * @property {Array<string> | undefined} task.output_extensions
 * Processed image file extensions.
 * - Ex: `[\"jpg\"]`
 * @property {string | undefined} task.server
 * Task server.
 * - Ex: `api8g.iloveimg\\.com`
 * @property {string | undefined} task.task
 * Task id.
 * @property {string | undefined} task.file_number
 * Task total files in `string`.
 * @property {string | undefined} task.download_filename
 * This match to `output_filename` on process options when its provided,
 * otherwise match to its own processed `filename` attributes.
 */

/**
 * {@link https://ajv.js.org/ Ajv} schema that describe `ILoveApi` callback request body {@link https://www.iloveapi.com/docs/api-reference#webhooks data} attribute.
 */
export const CallbackDataPropsAjvSchema = {
	type: 'object',
	properties: {
		task: {
			type: 'object',
			properties: {
				tool: { type: 'string' },
				process_start: { type: 'string' },
				custom_int: { type: 'number', nullable: true },
				custom_string: { type: 'string', nullable: true },
				status: { type: 'string' },
				status_message: { type: 'string' },
				timer: { type: 'string' },
				filesize: { type: 'number' },
				output_filesize: { type: 'number' },
				output_filenumber: { type: 'number' },
				output_extensions: {
					type: 'array',
					items: { type: 'string' }
				},
				server: { type: 'string' },
				task: { type: 'string' },
				file_number: { type: 'string' },
				download_filename: { type: 'string' }
			}
		}
	}
};

/**
 * @typedef {Object} CallbackRequestBodyProps
 * See more at `ILoveApi` {@link https://www.iloveapi.com/docs/api-reference#webhooks webhook}.
 * @property {CallbackEventEnum | undefined} event
 * See more at `ILoveApi` webhook {@link https://www.iloveapi.com/docs/api-reference#webhooks event} attribute.
 * @property {CallbackDataProps | undefined} data
 * See more at `ILoveApi` webhook {@link https://www.iloveapi.com/docs/api-reference#webhooks data} attribute.
 */

/**
 * {@link https://ajv.js.org/ Ajv} schema that describe `ILoveApi` callback request body.
 */
export const CallbackRequestBodyPropsAjvSchema = {
	type: 'object',
	required: ['event'],
	properties: {
		event: CallbackEventEnumAjvSchema,
		data: CallbackDataPropsAjvSchema
	}
};

/**
 * @typedef {Object} TaskCreationResult
 * @property {string | null} server
 * Assigned `ILoveApi` server, `null` when not provided.
 * - Ex: `api8g.iloveimg.com`
 * @property {string} task_id
 * Assigned task id from `ILoveApi` server.
 * @property {Array<{server_filename:string, filename:string}>} files
 * Uploaded files for this task.
 */
