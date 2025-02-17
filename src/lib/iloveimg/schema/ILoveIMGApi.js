import { z } from 'zod';
import { ToolTypes } from './Tool.js';
import { TaskStatusTypes } from './Task.js';

/**
 * @typedef {z.infer<typeof ListTasksOptions>} ListTasksOptionsInfered
 */
export const ListTasksOptions = z.object({
	/** Results are offered paginated in 50 results per page. */
	page: z.number().optional(),
	/** Filter tasks by tool type. */
	tool: ToolTypes.optional(),
	/** Filter tasks by task status type. */
	status: TaskStatusTypes.optional(),
	/** Filter tasks by `custom_int`. */
	custom_int: z.number().optional(),
	/**
	 * Enables or disables debug mode, default are `false`. When set to `true`,
	 * - No credits will be deducted from your project.
	 * - No actual processing will occur, `ILoveApi` only return response from your request details.
	 * - The returned data may differ from standard response.
	 */
	debug: z.boolean().optional()
});

/**
 * @typedef {z.infer<typeof ListTasksReturnType>} ListTasksReturnTypeInfered
 */
export const ListTasksReturnType = z.object({
	/**
	 * Task status.
	 */
	status: TaskStatusTypes,
	/**
	 * Task status message.
	 */
	status_message: z.string(),
	/**
	 * Tool type.
	 */
	tool: ToolTypes,
	/**
	 * Date-like when process started.
	 * - Ex: `2025-02-04 09:36:45`
	 */
	process_start: z.string(),
	/**
	 * Assigned `custom_int` value. This attribute are `nullable`.
	 */
	custom_int: z.number().nullable(),
	/**
	 * Assigned `custom_string` value. This attribute are `nullable`.
	 */
	custom_string: z.string().nullable(),
	/**
	 * Process duration in string.
	 * - Ex: `23.258`
	 */
	timer: z.string(),
	/**
	 * Original image file size in `bytes`.
	 */
	filesize: z.number(),
	/**
	 * Processed image file size in `bytes`.
	 */
	output_filesize: z.number(),
	/**
	 * Total image file that already been processed.
	 * When compressed in ZIP, this match to total files in ZIP archive.
	 */
	output_filenumber: z.number(),
	/**
	 * Processed image file extensions.
	 * - Ex: `[\"jpg\"]`
	 */
	output_extensions: z.string(),
	/**
	 * Task server.
	 * - Ex: `api8g.ilovepdf.com`
	 */
	server: z.string(),
	/**
	 * Task id.
	 */
	task_id: z.string(),
	/**
	 * Task total files in `string`.
	 */
	file_number: z.string(),
	/**
	 * An instruction to make request on worker server.
	 * - Ex: `Make request on worker server: api8g.ilovepdf.com`
	 */
	download_filename: z.string()
});
