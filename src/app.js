import Fastify from 'fastify';
import path from 'path';
import envVariablesSchema from './schemas/envVariables.js';
import telegraf from './routes/telegraf.js';
import iloveapi from './routes/iloveapi.js';
import config from './config/global.js';
import { getFilenameAndDirname } from './utils/fastify.js';

const { IS_PRODUCTION } = config;
const { __dirname } = getFilenameAndDirname(import.meta.url);

/**
 * Use the appropriate logger options depending on the running environment (`NODE_ENV`).
 */
const fastifyLoggerByEnv =
	/** @type {Record<'development' | 'test' | 'production', import('fastify').FastifyServerOptions['logger']>}  */ ({
		development: {
			transport: {
				target: 'pino-pretty',
				options: {
					translateTime: 'HH:MM:ss Z',
					ignore: 'pid,hostname'
				}
			}
		},
		test: false,
		production: true
	});

/**
 * Fastify server options.
 */
const FASTIFY_OPTIONS = /** @type {import('fastify').FastifyServerOptions} */ ({
	logger: fastifyLoggerByEnv[process.env.NODE_ENV] ?? true
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

	if (IS_PRODUCTION) {
		fastify.register(telegraf);
		fastify.register(iloveapi);
	}

	return fastify;
}

export default buildFastify;
