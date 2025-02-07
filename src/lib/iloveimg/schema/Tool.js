import { z } from 'zod';

/**
 * @typedef {z.infer<typeof ToolTypes>} ToolTypesInfered
 */
export const ToolTypes = z.enum([
	'convertimage',
	'removebackgroundimage',
	'upscaleimage',
	'watermarkimage'
]);
