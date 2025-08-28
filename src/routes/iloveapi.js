import config from '../config/global.js';
import logger from '../utils/logger.js';
import * as Schema from '../schemas/iloveapi.js';
import * as Utils from '../utils/fastify.js';
import * as _DownloaderQueue from '../queues/downloader.js';

const { IS_TEST } = config;
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
			const contextId = `req:${request?.id || 'unknown'}`;

			if (request.validationError) {
				if (!IS_TEST) {
					logger.warn(`Received invalid request [${contextId}]`);
					logger.debug(
						{
							context_id: contextId,
							headers: request?.headers || null,
							body: request?.body || null,
							validation: {
								name: request.validationError.name,
								message: request.validationError.message
							}
						},
						`Captured request details [${contextId}]`
					);
				}

				return Utils.sendErrorResponse(reply, 400, {
					name: request.validationError.name,
					message: request.validationError.message
				});
			}

			if (Utils.isValidRequest(request)) {
				if (!IS_TEST) {
					logger.info(
						{
							context_id: `jid:${request?.body?.data?.task?.custom_string || 'unknown'}`
						},
						`Received downloader job request [${contextId}]`
					);
					logger.debug(
						{
							context_id: `jid:${request?.body?.data?.task?.custom_string || 'unknown'}`,
							headers: request?.headers || null,
							body: request?.body || null
						},
						`Captured request details [${contextId}]`
					);
				}

				return Utils.tryCatch(
					() => DownloaderQueue.addDownloaderJob(request.body),
					reply
				);
			}

			if (!IS_TEST) {
				logger.warn(`Received unauthorized request [${contextId}]`);
				logger.debug(
					{
						context_id: contextId,
						headers: request?.headers || null,
						body: request?.body || null
					},
					`Captured request details [${contextId}]`
				);
			}

			return Utils.sendErrorResponse(reply, 401, "Invalid or missing 'apikey'");
		}
	);
}

export default routes;
