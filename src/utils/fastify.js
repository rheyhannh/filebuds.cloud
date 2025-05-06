import * as Fastify from 'fastify'; // eslint-disable-line
import * as FastifyTypes from '../schemas/fastify.js'; // eslint-disable-line
import { STATUS_CODES } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'path';
import config from '../config/global.js';

const { APP_SECRET_KEY } = config;

/**
 * Returns the filename and directory name from the given `import.meta.url`.
 * This utility is helpful for ES module projects to mimic {@link https://nodejs.org/docs/latest/api/modules.html#__filename __filename} and {@link https://nodejs.org/docs/latest/api/globals.html#__dirname __dirname} from CommonJS.
 *
 * @param {string} metaUrl - The `import.meta.url` value from the calling module.
 * @example
 * import { getFilenameAndDirname } from '@utils/paths.js';
 *
 * const { __filename, __dirname } = getFilenameAndDirname(import.meta.url);
 * console.log(__filename); // Outputs the full path of the file
 * console.log(__dirname);  // Outputs the directory path
 */
export const getFilenameAndDirname = (metaUrl) => {
	const x = {
		/** The full path of the current file */
		__filename: fileURLToPath(metaUrl),
		/** The directory of the current file. */
		__dirname: path.dirname(fileURLToPath(metaUrl))
	};

	return x;
};

/**
 * Middleware to validate API requests based on API key or origin domain.
 * This function verifies if the request is authorized by checking:
 * - If the API key provided in `apikey` header or query param matches the expected key.
 * - If the request's origin or referer is from an allowed domain.
 *
 * When one of these condition meet, request is allowed to proceed.
 * @param {import('fastify').FastifyRequest} request The incoming request object from Fastify.
 * @param {Array<string>} allowedDomains List of allowed domains for origin validation.
 * @returns {boolean} `true` if the request is valid, otherwise `false`.
 */
export const isValidRequest = (request, allowedDomains) => {
	// Retrieve API key from headers or query params.
	const apiKey = request.headers?.apikey || request.query?.apikey;

	// Validate API key.
	if (apiKey === APP_SECRET_KEY) return true;

	// Reject requests when 'allowedDomains' is empty array or not an array.
	if (!Array.isArray(allowedDomains) || !allowedDomains.length) {
		return false;
	}

	// Retrieve origin from headers.
	const origin = request.headers?.origin || request.headers?.referer;

	// Reject requests when origin or referer not provided.
	if (!origin) return false;

	try {
		const { hostname } = new URL(origin);

		// Validate hostname against the allowed domains list
		return allowedDomains.some((domain) =>
			domain.startsWith('.') ? hostname.endsWith(domain) : hostname === domain
		);
	} catch {
		return false; // Invalid URL format in origin header
	}
};

/**
 * Handles synchronous and asynchronous function execution, returning a structured Fastify response.
 * @param {() => Promise<any> | () => any} handler Function to execute (can be synchronous or asynchronous).
 * @param {Fastify.FastifyReply} reply Fastify reply object.
 * @param {Object} [options={}] Optional configuration.
 * @param {FastifyTypes.SuccessBodyResponse} [options.successCustomPayload={}] Object allowing custom fields in the success payloads.
 * @param {FastifyTypes.ErrorBodyResponse} [options.errorCustomPayload={}] Object allowing custom fields in the error payloads.
 * @returns {Promise<Fastify.FastifyReply>} A Fastify response with a structured format.
 * @example
 * ```js
 * import { tryCatch } from './utils.js';
 * import { doSomething, doSomethingAsync } from './services.js';
 *
 * // Handle POST /myroute requests.
 * fastify.post(
 * 	'/myroute',
 * 	async (request, reply) => {
 * 		const doAsync = false;
 *
 * 		// Since tryCatch returning the fastify.reply response,
 * 		// you can return it directly without using await.
 * 		if (doAsync) {
 * 			return tryCatch(() => doSomethingAsync(), reply);
 * 		}
 *
 * 		return tryCatch(() => doSomething(), reply);
 * 	}
 * )
 * ```
 */
export const tryCatch = async (handler, reply, options = {}) => {
	try {
		const result = handler instanceof Function ? await handler() : handler;

		let { statusCode, statusText, ...rest } =
			options?.successCustomPayload ?? {};

		statusCode = Number.isInteger(options?.successCustomPayload?.statusCode)
			? options?.successCustomPayload.statusCode
			: 200;
		statusText =
			options?.successCustomPayload?.statusText ||
			STATUS_CODES[statusCode] ||
			'OK';

		return reply.status(statusCode).send({
			ok: true,
			statusCode,
			statusText,
			data: result,
			...rest
		});
	} catch (error) {
		let { statusCode, statusText, ...rest } = options?.errorCustomPayload ?? {};

		statusCode = Number.isInteger(options?.errorCustomPayload?.statusCode)
			? options?.errorCustomPayload.statusCode
			: error?.status || error?.response?.status || 500;
		statusText =
			options?.errorCustomPayload?.statusText ||
			STATUS_CODES[statusCode] ||
			error?.statusText ||
			error?.response?.statusText ||
			'Internal Server Error';

		return reply.status(statusCode).send({
			ok: false,
			statusCode,
			statusText,
			error: {
				name: error?.name || 'Error',
				message: error?.message || 'Something Went Wrong'
			},
			...rest
		});
	}
};

/**
 * Sends a structured success response using Fastify.
 * @param {Fastify.FastifyReply} reply Fastify reply object.
 * @param {number} [statusCode=200] HTTP success status code (default: `200`).
 * @param {any} [data={}] Response payload (default: `{}`).
 * @returns {Fastify.FastifyReply} Fastify reply instance.
 * @example
 * ```js
 * import { sendSuccessResponse } from './utils.js';
 * import { getUsers } from './services.js';
 *
 * // Handle GET /user requests.
 * fastify.get(
 * 	'/user',
 * 	async (request, reply) => {
 * 		const user = await getUsers(request.body.id);
 *
 * 		return sendSuccessResponse(reply, 200, user);
 * 	}
 * )
 * ```
 */
export const sendSuccessResponse = (reply, statusCode = 200, data = {}) => {
	const resolvedStatusCode = STATUS_CODES[statusCode] ? statusCode : 200;
	const statusText = STATUS_CODES[resolvedStatusCode] || 'OK';

	return reply.status(resolvedStatusCode).send({
		ok: true,
		statusCode: resolvedStatusCode,
		statusText,
		data
	});
};

/**
 * Sends a structured error response using Fastify.
 * @param {Fastify.FastifyReply} reply Fastify reply object.
 * @param {number} [statusCode=500] HTTP error status code (default: `500`).
 * @param {Record<'name' | 'message', string> | string} [error={ name: 'Error', message: 'Something Went Wrong' }] Error details that can be object containing `name` and `message` properties or a string as error message.
 * @returns {Fastify.FastifyReply} Fastify reply instance.
 * @example
 * ```js
 * import { sendSuccessResponse, sendErrorResponse } from './utils.js';
 * import { getUsers } from './services.js';
 *
 * // Handle GET /user requests.
 * fastify.get(
 * 	'/user',
 * 	async (request, reply) => {
 * 		const user = await getUsers(request.body.id);
 *
 * 		if (!user.length) {
 * 			return sendErrorResponse(reply, 404, 'User not found');
 * 		}
 *
 * 		return sendSuccessResponse(reply, 200, user);
 * 	}
 * )
 * ```
 */
export const sendErrorResponse = (
	reply,
	statusCode = 500,
	error = { name: 'Error', message: 'Something Went Wrong' }
) => {
	const resolvedStatusCode = STATUS_CODES[statusCode] ? statusCode : 500;
	const statusText =
		STATUS_CODES[resolvedStatusCode] || 'Internal Server Error';

	let _error = { name: 'Error', message: 'Something Went Wrong' };
	if (typeof error === 'string') {
		_error.message = error;
	} else if (typeof error === 'object') {
		_error = {
			name: error?.name || 'Error',
			message: error?.message || 'Something Went Wrong'
		};
	}

	return reply.status(resolvedStatusCode).send({
		ok: false,
		statusCode: resolvedStatusCode,
		statusText,
		error: _error
	});
};
