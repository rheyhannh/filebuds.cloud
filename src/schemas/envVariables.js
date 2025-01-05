/**
 * Environment variables schema that used for validation
 */
const schema =
	/** @type {import('@fastify/env').FastifyEnvOptions['schema']} */ ({
		type: 'object',
		required: ['ILOVEAPI_PUBLIC_KEY', 'ILOVEAPI_SECRET_KEY'],
		properties: {
			ILOVEAPI_PUBLIC_KEY: { type: 'string' },
			ILOVEAPI_SECRET_KEY: { type: 'string' }
		}
	});

export default schema;
