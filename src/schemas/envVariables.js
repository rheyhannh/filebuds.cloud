/**
 * Environment variables schema that used for validation
 */
const schema =
	/** @type {import('@fastify/env').FastifyEnvOptions['schema']} */ ({
		type: 'object',
		required: [
			'ILOVEAPI_PUBLIC_KEY',
			'TELEGRAF_BOT_TOKEN',
			'SB_URL',
			'SB_REST_URL',
			'SB_ANON_KEY',
			'SB_SERVICE_KEY',
			'APP_SECRET_KEY',
			'APP_DOMAIN'
		],
		properties: {
			ILOVEAPI_PUBLIC_KEY: { type: 'string' },
			ILOVEAPI_SECRET_KEY: { type: 'string' },
			PORT: { type: 'number' },
			HOST: { type: 'string' },
			TELEGRAF_BOT_TOKEN: { type: 'string' },
			TELEGRAF_WEBHOOK_DOMAIN: { type: 'string' },
			TELEGRAF_WEBHOOK_PATH: { type: 'string' },
			TELEGRAF_WEBHOOK_SECRET_TOKEN: { type: 'string' },
			SB_URL: { type: 'string' },
			SB_REST_URL: { type: 'string' },
			SB_ANON_KEY: { type: 'string' },
			SB_SERVICE_KEY: { type: 'string' },
			REDIS_URL: { type: 'string' },
			REDIS_HOST: { type: 'string' },
			REDIS_PORT: { type: 'string' },
			APP_SECRET_KEY: { type: 'string' },
			APP_DOMAIN: { type: 'string' },
			APP_API_SUBDOMAIN: { type: 'string' },
			LOGTAIL_URL: { type: 'string' },
			LOGTAIL_TOKEN: { type: 'string' }
		}
	});

export default schema;
