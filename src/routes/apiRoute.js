import * as pdfController from '../controllers/pdfController.js';

/**
 * Encapsulates the `/api/*` routes
 * @param {import('fastify').FastifyInstance} fastify  
 * Fastify instance
 * @param {Object} options 
 * Plugin options, refer to {@link https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options plugin options}
 */
async function routes(fastify, options) {
    fastify.get('/api', async (request, reply) => {
        return { message: 'Hello world from /api' }
    });

    fastify.post(
        '/api/img-to-pdf',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['imageUrl'],
                    properties: {
                        imageUrl: { type: 'string' }
                    }
                }
            }
        },
        pdfController.imageToPdfHandler
    )
}

export default routes;