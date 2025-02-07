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
	custom_int: z.number().optional()
});
