import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import config from './config/global.js';
import * as _Middleware from './middlewares/bot.js';
import * as _Utils from './utils/bot.js';

const Middleware = _Middleware.default;
const Utils = _Utils.default;

/**
 * @typedef {Object} buildTelegramBotReturnType
 * @property {InstanceType<typeof Telegraf>} bot
 * Telegraf bot instance.
 * @property {ReturnType<Telegraf['createWebhook']> | undefined} webhook
 * Telegraf bot webhook.
 */

/**
 * Initializes and configures the Telegram bot using `Telegraf`.
 * - In `production`, the bot is set up with a webhook.
 * - In `development`, the bot uses polling.
 *
 * @throws {Error} Throws an error if required configuration values are missing.
 * @returns {Promise<buildTelegramBotReturnType>} Resolves with the bot instance and optional webhook function.
 */
export async function buildTelegramBot() {
	const {
		TELEGRAF_BOT_TOKEN,
		TELEGRAF_WEBHOOK_DOMAIN,
		TELEGRAF_WEBHOOK_PATH,
		TELEGRAF_WEBHOOK_SECRET_TOKEN,
		IS_PRODUCTION
	} = config;

	if (!TELEGRAF_BOT_TOKEN || typeof TELEGRAF_BOT_TOKEN !== 'string') {
		throw new Error('Missing or invalid Telegram bot token.');
	}

	if (
		IS_PRODUCTION &&
		(!TELEGRAF_WEBHOOK_DOMAIN || typeof TELEGRAF_WEBHOOK_DOMAIN !== 'string')
	) {
		throw new Error('Webhook domain is required in production environment.');
	}

	const bot = new Telegraf(TELEGRAF_BOT_TOKEN);
	const webhook = IS_PRODUCTION
		? await bot.createWebhook({
				domain: TELEGRAF_WEBHOOK_DOMAIN,
				path: TELEGRAF_WEBHOOK_PATH,
				secret_token: TELEGRAF_WEBHOOK_SECRET_TOKEN,
				drop_pending_updates: true
			})
		: undefined;

	bot.command('test', async (ctx) => {
		await ctx.reply('Test command.', {
			reply_markup: {
				inline_keyboard: [
					...Utils.generateInlineKeyboard('doc/image', true),
					[
						{
							text: 'Tracker',
							callback_data: JSON.stringify({
								jid: '95b15262c13b831b0112166bd934e1d97b1ce469'
							})
						},
						{
							text: 'Unknown',
							callback_data: JSON.stringify({
								foo: 'bar'
							})
						}
					]
				]
			}
		});
	});

	bot.on('callback_query', Middleware.initCallbackQueryState);
	bot.on('callback_query', Middleware.checkUsersCreditCallbackQueryHandler);
	bot.on('callback_query', Middleware.checkSharedCreditCallbackQueryHandler);
	bot.on('callback_query', Middleware.checkCallbackQueryLimit);
	bot.on('callback_query', Middleware.validateCallbackQueryExpiry);
	bot.on('callback_query', Middleware.validateCallbackQueryMedia);
	bot.on('callback_query', Middleware.handleCallbackQuery);

	bot.on(message('photo'), Middleware.validatePhotoMessageMedia);
	bot.on(message('photo'), Middleware.handlePhotoMessage);

	bot.on(message('document'), Middleware.validateDocumentMessageMedia);
	bot.on(message('document'), Middleware.handleDocumentMessage);

	bot.catch((error) => {
		console.error('Catched error:', error);
	});

	if (!IS_PRODUCTION) {
		bot.launch({
			dropPendingUpdates: true
		});
	}

	return { bot, webhook };
}

const { bot, webhook } = await buildTelegramBot();

export { bot, webhook };
