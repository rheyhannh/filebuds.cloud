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
				return Utils.sendErrorResponse(reply, 400, {
					name: request.validationError.name,
					message: request.validationError.message
				});
			}

			if (Utils.isValidRequest(request)) {
				return Utils.tryCatch(
					() => DownloaderQueue.addDownloaderJob(request.body),
					reply
				);
			}

			return Utils.sendErrorResponse(reply, 401, "Invalid or missing 'apikey'");
		}
	);
}

export default routes;
