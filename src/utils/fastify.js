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
