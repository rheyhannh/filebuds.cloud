import Fastify from 'fastify';
import path from 'path';
import envVariablesSchema from './schemas/envVariables.js';
import telegrafRoute from './routes/telegrafRoute.js';
import iloveapiRoute from './routes/iloveapiRoute.js';
import config from './config/env.js';
import { getFilenameAndDirname } from './utils/fastify.util.js';

const { IS_PRODUCTION } = config;
const { __dirname } = getFilenameAndDirname(import.meta.url);

function buildFastify() {
	const fastify = /** @type {import('fastify').FastifyInstance} */ (
		Fastify({
			logger: {
				transport: {
					target: 'pino-pretty',
					options: {
						translateTime: 'HH:MM:ss Z',
						ignore: 'pid,hostname'
					}
				}
			}
		})
	);

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
		fastify.register(telegrafRoute);
		fastify.register(iloveapiRoute);
	}

	return fastify;
}

export default buildFastify;
