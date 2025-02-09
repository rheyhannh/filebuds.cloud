import * as TaskSchema from '../schema/Task.js';

/**
 * Extracts an error message from `ILoveApi` response data.
 *
 * @param {{message?:string, code?:number, status?:number, error?:{message?:string, code?:string}}} responseData The response data from `ILoveApi`.
 * @returns {string} The error message.
 */
function getErrorMessageFromResponse(responseData) {
	if (responseData.message && typeof responseData.message === 'string') {
		const code = responseData.code || -1;
		const status = responseData.status || -1;
		return `ILoveApi Error (status:${status}, code:${code}): ${responseData.message}`;
	} else if (
		responseData.error &&
		responseData.error.message &&
		typeof responseData.error.message === 'string'
	) {
		const code = responseData.error.code || -1;
		return `ILoveApi Error (code:${code}): ${responseData.error.message}`;
	} else {
		return 'ILoveApi Unexpected Error: Cant retrieve any information error from ILoveApi server.';
	}
}

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
	getErrorMessageFromResponse,
	validateProcessToolOptions
};
