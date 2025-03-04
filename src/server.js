import buildFastify from './app.js';
import config from '../src/config/global.js';

const fastify = buildFastify();
const { PORT, HOST } = config;

const start = async () => {
	try {
		fastify.listen({ port: PORT, host: HOST });
	} catch (error) {
		fastify.log.error(error);
		process.exit(1);
	}
};

start();
