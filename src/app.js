import Fastify from 'fastify';
import envVariablesSchema from './schemas/envVariables.js';
import telegraf from './routes/telegraf.js';
import iloveapi from './routes/iloveapi.js';
import config from './config/global.js';
import logger from './utils/logger.js';

const { IS_PRODUCTION } = config;

/**
 * Fastify server options.
 */
const FASTIFY_OPTIONS = /** @type {import('fastify').FastifyServerOptions} */ ({
	loggerInstance: logger,
	disableRequestLogging: true
});

function buildFastify() {
	const fastify = Fastify(FASTIFY_OPTIONS);

	fastify.register(import('@fastify/env'), {
		confKey: 'config',
		schema: envVariablesSchema,
		data: process.env,
		dotenv: true
	});

	fastify.register(iloveapi);

	if (IS_PRODUCTION) {
		fastify.register(telegraf);
	}

	return fastify;
}

export default buildFastify;
