/**
 * Handle error by sending proper response
 * @param {import('fastify').FastifyReply} reply Http reply instance or also knowed as response
 * @param {Error} error An error instance(s)
 * @see {@link https://fastify.dev/docs/latest/Reference/Reply/#reply Fastify Reply} 
 */
const handleError = (reply, error) => {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Internal Server Error';

    reply.status(statusCode).send({
        error: true,
        message
    })
}

export default handleError;