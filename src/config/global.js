import 'dotenv/config';

const global = {
	/**
	 * `@default` `4000`
	 *
	 * Fastify or application server port.
	 */
	PORT: process.env.PORT || 4000,
	/**
	 * `@default` `'0.0.0.0'`
	 *
	 * Fastify or application server host.
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
	 * ILoveApi fixed server URL.
	 * - e.g. `api.ilovepdf.com`
	 */
	ILOVEIMG_API_URL: 'api.ilovepdf.com',
	/**
	 * ILoveApi URL protocol.
	 * - e.g. `https`
	 */
	ILOVEIMG_API_URL_PROTOCOL: 'https',
	/**
	 * ILoveApi version.
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
	 * Telegram bot token that can be obtained from Telegram `BotFather`.
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
	 * Note that this only available when using webhook instead polling.
	 * More on {@link https://telegraf.js.org/interfaces/Telegraf.LaunchOptions.html#webhook.__type.secretToken Telegraf Docs}.
	 */
	TELEGRAF_WEBHOOK_SECRET_TOKEN: process.env.TELEGRAF_WEBHOOK_SECRET_TOKEN,
	/**
	 * `@required`
	 *
	 * Supabase URL associated with the project.
	 * - e.g. `https://myprojectid.supabase.co`
	 */
	SB_URL: process.env.SB_URL,
	/**
	 * `@required`
	 *
	 * Supabase REST URL associated with the project.
	 * - e.g. `https://myprojectid.supabase.co/rest/v1`
	 */
	SB_REST_URL: process.env.SB_REST_URL,
	/**
	 * `@required`
	 *
	 * Supabase anon key associated with the project.
	 */
	SB_ANON_KEY: process.env.SB_ANON_KEY,
	/**
	 * `@required`
	 *
	 * Supabase service key associated with the project.
	 */
	SB_SERVICE_KEY: process.env.SB_SERVICE_KEY,
	/**
	 * `@optional`
	 *
	 * Redis connection URL.
	 * If provided, it will be used as the primary method to connect to Redis.
	 * - e.g. `redis://user:password@127.0.0.1:6379/0`
	 */
	REDIS_URL: process.env.REDIS_URL,
	/**
	 * `@default` `127.0.0.1`
	 *
	 * Redis server hostname.
	 * Used as an alternative to `REDIS_URL` if no URL is provided.
	 */
	REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
	/**
	 * `@default` `6379`
	 *
	 * Redis server port number.
	 * Must be a valid positive integer (string numbers are also accepted).
	 * Used only if `REDIS_URL` is not provided.
	 */
	REDIS_PORT: process.env.REDIS_PORT || 6379,
	/**
	 * `@required`
	 *
	 * Your application secret key.
	 */
	APP_SECRET_KEY: process.env.APP_SECRET_KEY,
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
	APP_API_SUBDOMAIN: process.env.APP_API_SUBDOMAIN,
	/**
	 * `@optional`
	 *
	 * Logtail endpoint URL used for sending log events.
	 * Must be provided along with `LOGTAIL_TOKEN` to enable Logtail logging on production.
	 * - e.g. `https://loremipsum.eu-nbg-2.betterstackdata.com`
	 */
	LOGTAIL_URL: process.env.LOGTAIL_URL,
	/**
	 * `@optional`
	 *
	 * Logtail API token for authentication.
	 * Must be provided along with `LOGTAIL_URL` to enable Logtail logging on production.
	 */
	LOGTAIL_TOKEN: process.env.LOGTAIL_TOKEN
};

export default global;
