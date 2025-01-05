import path from 'path';
import { getFilenameAndDirname } from './utils/paths.js';

import envVariablesSchema from './schemas/envVariables.js';

import Fastify from 'fastify';
import apiRoute from './routes/apiRoute.js';

const { __dirname } = getFilenameAndDirname(import.meta.url);

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

fastify.register(apiRoute);

export default fastify;
