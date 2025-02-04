import 'dotenv/config';

export default {
	/**
	 * `@default` `4000`
	 *
	 * Fastify or application server port
	 */
	PORT: process.env.PORT || 4000,
	/**
	 * `@default` `'0.0.0.0'`
	 *
	 * Fastify or application server host
	 */
	HOST: process.env.HOST || '0.0.0.0',
	/**
	 * Boolean whether application run on `development` environment.
	 * ```js
	 * process.env.NODE_ENV === 'development'
	 * ```
	 */
	IS_DEV: process.env.NODE_ENV === 'development',
	/**
	 * Boolean whether application run on `test` environment.
	 * ```js
	 * process.env.NODE_ENV === 'test'
	 * ```
	 */
	IS_TEST: process.env.NODE_ENV === 'test',
	/**
	 * Boolean whether application run on `production` environment.
	 * ```js
	 * process.env.NODE_ENV === 'production'
	 * ```
	 */
	IS_PRODUCTION: process.env.NODE_ENV === 'production',
	/**
	 * `@required`
	 *
	 * ILoveApi project public key to get authentication token from ILoveApi server or
	 * create `self-signed` authentication token when project secret key exist.
	 * This value can be obtained from {@link https://www.iloveapi.com/user/projects here}.
	 */
	ILOVEAPI_PUBLIC_KEY: process.env.ILOVEAPI_PUBLIC_KEY,
	/**
	 * `@optional`
	 *
	 * ILoveApi project secret key that cant be exposed. When this exist, your application can create `self-signed` authentication token
	 * for requests made to ILoveApi. This value can be obtained from {@link https://www.iloveapi.com/user/projects here}.
	 */
	ILOVEAPI_SECRET_KEY: process.env.ILOVEAPI_SECRET_KEY || '',
	/**
	 * ILoveApi URL that should match to JWT `iss` on authentication token
	 * - e.g. `api.ilovepdf.com`
	 */
	ILOVEIMG_API_URL: 'api.ilovepdf.com',
	/**
	 * ILoveApi URL protocol
	 * - e.g. `https`
	 */
	ILOVEIMG_API_URL_PROTOCOL: 'https',
	/**
	 * ILoveApi version
	 * - e.g. `v1`
	 */
	ILOVEIMG_API_VERSION: 'v1',
	/**
	 * `@default` `process.env.APP_DOMAIN`
	 *
	 * JWT `iss` attribute on ILoveApi self-signed authentication token. See example below,
	 * ```js
	 * // When APP_API_SUBDOMAIN exist
	 * process.env.APP_API_SUBDOMAIN = 'api'
	 * process.env.APP_DOMAIN = 'myapps.com'
	 * // JWT iss resolve to api.myapps.com
	 *
	 * // When APP_API_SUBDOMAIN not exist
	 * process.env.APP_API_SUBDOMAIN = undefined
	 * // JWT iss resolve to myapps.com
	 * ```
	 */
	ILOVEIMG_SELF_JWT_ISS: process.env.APP_API_SUBDOMAIN
		? `${process.env.APP_API_SUBDOMAIN}.${process.env.APP_DOMAIN}`
		: process.env.APP_DOMAIN,
	/**
	 * `@required`
	 *
	 * Telegram bot token that can be obtained from Telegram `BotFather`
	 */
	TELEGRAF_BOT_TOKEN: process.env.TELEGRAF_BOT_TOKEN,
	/**
	 * `@default` `process.env.APP_DOMAIN`
	 *
	 * Telegram bot webhook domain name that include root and tlds such as `myapps.com` where Telegraf will send.
	 */
	TELEGRAF_WEBHOOK_DOMAIN:
		process.env.TELEGRAF_WEBHOOK_DOMAIN || process.env.APP_DOMAIN,
	/**
	 * `@default` `'/telegraf'`
	 *
	 * Telegram bot webhook path where Telegraf will send.
	 */
	TELEGRAF_WEBHOOK_PATH: process.env.TELEGRAF_WEBHOOK_PATH || '/telegraf',
	/**
	 * `@optional`
	 *
	 * When exist, Telegraf will add `X-Telegram-Bot-Api-Secret-Token` header in webhook request using this value. Useful to ensure that the request comes from a webhook set by you.
	 * Note that this only available when webhook are available and host your local bot server.
	 * More on {@link https://telegraf.js.org/interfaces/Telegraf.LaunchOptions.html#webhook.__type.secretToken Telegraf Docs}.
	 */
	TELEGRAF_WEBHOOK_SECRET_TOKEN: process.env.TELEGRAF_WEBHOOK_SECRET_TOKEN,
	/**
	 * `@required`
	 *
	 * Your application domain name that include root and tlds such as `myapps.com` that used for,
	 * - Creating webhook for telegram bot using `Telegraf`
	 * - JWT `iss` attribute on ILoveApi self-signed authentication token
	 *
	 * When you working on local development, you can assign this with random domain name
	 */
	APP_DOMAIN: process.env.APP_DOMAIN,
	/**
	 * `@optional`
	 *
	 * Your application API subdomain such `api` for `api.myapps.com` that used for,
	 * - JWT `iss` attribute on ILoveApi self-signed authentication token while fallback to `APP_DOMAIN`
	 */
	APP_API_SUBDOMAIN: process.env.APP_API_SUBDOMAIN
};
