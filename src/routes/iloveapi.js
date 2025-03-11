import * as Schema from '../schemas/iloveapi.js';
import * as Utils from '../utils/fastify.js';

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
				if (request.body?.event === 'task.failed') {
					// const { custom_int: userId, custom_string: jobId } =
					// 	request.body?.data?.task ?? {};

					// (bullmq:downloaderQueue) Publish downloader(task.failed) job to queue that do:
					// 1. Add server/user credit back.
					// 2. (telegram-bot) Update telegram job tracking message (if possible)
					// 3. (telegram-bot) Send user message 'Duh ada yang salah diserver kita! Tapi tenang aja pulsa kamu engga berkurang. Coba lagi deh sekarang. Kalau masih gagal, tunggu sebentar dan coba lagi nanti.'
					// [POST_JOBS] Update supabase downloader worker job log.
					return Utils.sendSuccessResponse(reply);
				} else if (request.body?.event === 'task.completed') {
					// const {
					// 	custom_int: userId,
					// 	custom_string: jobId,
					// 	task: taskId,
					// 	server: taskServer
					// } = request.body?.data?.task ?? {};

					// (bullmq:downloaderQueue) Publish downloader(task.completed) job to queue that do:
					// 1. Download processed task file using ILoveIMGService.getProcessedTaskResult()
					// 2. (telegram-bot) Update telegram job tracking message (if possible)
					// 3. (telegram-bot) Send document using bot.sendDocument(userId, {source: axios.response.data})
					// [POST_JOBS] Update supabase downloader worker job log.
					return Utils.sendSuccessResponse(reply);
				} else {
					// [EDGE CASE] Handle unknown event.
					// Its possibly occurs when Fastify Ajv Schema validation failed.
					// NEXT: Log requests to Supabase.
					console.warn(
						'ILoveApi webhook received unknown event:',
						request.body?.event
					);
					return Utils.sendErrorResponse(
						reply,
						400,
						"Invalid request body on 'event' properties."
					);
				}
			}

			return Utils.sendErrorResponse(reply, 401, "Invalid or missing 'apikey'");
		}
	);
}

export default routes;
