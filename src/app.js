import path from 'path';
import { getFilenameAndDirname } from './utils/paths.js';

import envVariablesSchema from './schemas/envVariables.js';

import Fastify from 'fastify';
import apiRoute from './routes/apiRoute.js';

const { __dirname } = getFilenameAndDirname(import.meta.url);

function buildFastify() {
	const app = /** @type {import('fastify').FastifyInstance} */ (
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

	app.register(import('@fastify/env'), {
		confKey: 'config',
		schema: envVariablesSchema,
		data: process.env,
		dotenv: true
	});

	app.register(import('@fastify/static'), {
		root: path.join(__dirname, 'public'),
		prefix: '/public/'
	});

	app.register(apiRoute);

	return app;
}

export default buildFastify;
