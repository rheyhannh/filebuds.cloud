import * as pdfService from '../services/pdfService.js';
import handleError from '../utils/errorHandler.js';

/**
 * Controller to handle convertion of image to PDF
 * @param {import('fastify').FastifyRequest} request 
 * Request instance, refer to {@link https://fastify.dev/docs/latest/Reference/Request/ fastify Request}
 * @param {import('fastify').FastifyReply} reply 
 * Response instance , refer to fastify {@link https://fastify.dev/docs/latest/Reference/Reply/ fastify Reply}
 */
export const imageToPdfHandler = async (request, reply) => {
    try {
        const convertedImage = await pdfService.imageToPdf(request.body.imageUrl);
        return reply.send(convertedImage);
    } catch (error) {
        handleError(reply, error);
    }
}