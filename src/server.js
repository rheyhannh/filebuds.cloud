import 'dotenv/config';
import fastify from './app.js';

fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, function (err, address) {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});