import botInstance from '../bot.js';
import config from '../config/env.js';

const { TELEGRAF_WEBHOOK_PATH } = config;
const { webhook } = await botInstance();

/**
 * Encapsulates the `/telegraf/*` routes
 * @param {import('fastify').FastifyInstance} fastify
 * Fastify instance
 * @param {Object} options
 * Plugin options, refer to {@link https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options plugin options}
 */
async function routes(fastify) {
	fastify.post(TELEGRAF_WEBHOOK_PATH, webhook);
}

export default routes;
