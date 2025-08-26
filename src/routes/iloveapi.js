import logger from '../utils/logger.js';
import * as Schema from '../schemas/iloveapi.js';
import * as Utils from '../utils/fastify.js';
import * as _DownloaderQueue from '../queues/downloader.js';

const DownloaderQueue = _DownloaderQueue.default;

/**
 * Encapsulates the `/iloveapi/*` routes
 * @param {import('fastify').FastifyInstance} fastify
 * Fastify instance
 * @param {Object} options
 * Plugin options, refer to {@link https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options plugin options}
 */
async function routes(fastify) {
	fastify.post(
		'/iloveapi',
		{
			schema: {
				body: Schema.CallbackRequestBodyPropsAjvSchema
			},
			attachValidation: true
		},
		/**
		 * Route handler for POST `/iloveapi` endpoint
		 * @param {import('fastify').FastifyRequest<{Body:Schema.CallbackRequestBodyProps}>} request
		 * @param {import('fastify').FastifyReply} reply
		 */
		async (request, reply) => {
			if (request.validationError) {
				logger.debug({
					headers: request?.headers || null,
					body: request?.body || null,
					validation: {
						name: request.validationError.name,
						message: request.validationError.message
					}
				});
				logger.warn("Received invalid request at '/iloveapi'");

				return Utils.sendErrorResponse(reply, 400, {
					name: request.validationError.name,
					message: request.validationError.message
				});
			}

			if (Utils.isValidRequest(request)) {
				logger.debug({
					headers: request?.headers || null,
					body: request?.body || null
				});
				logger.info("Received downloader job request at '/iloveapi'");

				return Utils.tryCatch(
					() => DownloaderQueue.addDownloaderJob(request.body),
					reply
				);
			}

			logger.debug({
				headers: request?.headers || null,
				body: request?.body || null
			});
			logger.warn("Received unauthorized request at '/iloveapi'");

			return Utils.sendErrorResponse(reply, 401, "Invalid or missing 'apikey'");
		}
	);
}

export default routes;
