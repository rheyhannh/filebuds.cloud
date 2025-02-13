import * as TaskSchema from '../schema/Task.js';

/**
 * Validates tool options for the `process` method.
 * @param {import('../schema/Tool.js').ToolTypesInfered} tool - Tool type.
 * @param {TaskSchema.TaskProcessToolOptionsInfered} options - Tool options.
 * @returns {Promise<TaskSchema.TaskProcessConvertImageOptionsInfered | TaskSchema.TaskProcessUpscaleImageOptionsInfered | TaskSchema.TaskProcessWatermarkImageOptionsInfered>} Validated tool options.
 * @throws {import('zod').ZodError} If the tool options are invalid.
 */
async function validateProcessToolOptions(tool, options) {
	const toolValidators = {
		convertimage: TaskSchema.TaskProcessConvertImageOptions.parseAsync,
		// No options for this tool, immediately resolve empty object
		removebackgroundimage: () => Promise.resolve({}),
		upscaleimage: TaskSchema.TaskProcessUpscaleImageOptions.parseAsync,
		watermarkimage: TaskSchema.TaskProcessWatermarkImageOptions.parseAsync
	};

	const validator = toolValidators[tool];
	if (!validator) {
		throw new Error(`Unsupported tool: ${tool}`);
	}

	return validator(options?.[tool]);
}

// We need to export with this behaviour to make sinon working in testing environment
export default {
	validateProcessToolOptions
};
