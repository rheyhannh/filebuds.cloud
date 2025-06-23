import Fastify from 'fastify';
import path from 'path';
import envVariablesSchema from './schemas/envVariables.js';
import telegraf from './routes/telegraf.js';
import iloveapi from './routes/iloveapi.js';
import config from './config/global.js';
import logger from './utils/logger.js';
import { getFilenameAndDirname } from './utils/fastify.js';

const { IS_PRODUCTION } = config;
const { __dirname } = getFilenameAndDirname(import.meta.url);

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

	fastify.register(import('@fastify/static'), {
		root: path.join(__dirname, 'public'),
		prefix: '/public/'
	});

	fastify.register(iloveapi);

	if (IS_PRODUCTION) {
		fastify.register(telegraf);
	}

	return fastify;
}

export default buildFastify;
