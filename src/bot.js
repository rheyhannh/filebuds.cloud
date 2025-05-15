import { Telegraf, Composer } from 'telegraf';
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

	bot.command('subsidi', async (ctx) => {
		await ctx.reply(
			'Setiap hari, Filebuds menyediakan akses gratis untuk semua pengguna lewat subsidi.' +
				'\n- Jumlahnya terbatas dan berlaku siapa cepat, dia dapat⏳' +
				'\n- Kalau subsidi hari ini sudah habis, kamu bisa pakai /pulsa untuk akses fast track⚡'
		);
	});

	bot.command('pulsa', async (ctx) => {
		await ctx.reply(
			'Pulsa di Filebuds adalah kredit yang bisa kamu gunakan untuk memproses file gambar atau PDF dengan cepat. ' +
				'Layaknya pulsa HP, kamu bisa isi ulang lewat /isipulsa dan cek sisa pulsa dengan /cekpulsa.' +
				'\n\nDengan menggunakan pulsa :' +
				'\n- Aksesmu pakai fast track sehingga lebih cepat dibanding pengguna gratis⚡' +
				'\n- Tidak ada batasan jumlah file yang bisa diproses, selama pulsamu masih tersedia🚀'
		);
	});

	bot.command('isipulsa', async (ctx) => {
		await ctx.reply(
			'Saat ini fitur pulsa belum tersedia. ' +
				'Tapi tenang, kamu masih bisa pakai semua fitur Filebuds lewat akses gratis dari /subsidi setiap harinya. ' +
				'Yuk manfaatkan sebelum kuotanya habis🤑'
		);
	});

	bot.command('cekpulsa', async (ctx) => {
		await ctx.reply(
			'Saat ini fitur pulsa belum tersedia. ' +
				'Tapi tenang, kamu masih bisa pakai semua fitur Filebuds lewat akses gratis dari /subsidi setiap harinya. ' +
				'Yuk manfaatkan sebelum kuotanya habis🤑'
		);
	});

	bot.on(
		'callback_query',
		Composer.compose([
			Middleware.initCallbackQueryState,
			Middleware.checkUsersCreditCallbackQueryHandler,
			Middleware.checkSharedCreditCallbackQueryHandler,
			Middleware.checkCallbackQueryLimit,
			Middleware.validateCallbackQueryExpiry,
			Middleware.validateCallbackQueryMedia,
			Middleware.handleCallbackQuery
		])
	);

	bot.on(
		message('photo'),
		Composer.compose([
			Middleware.validatePhotoMessageMedia,
			Middleware.handlePhotoMessage
		])
	);

	bot.on(
		message('document'),
		Composer.compose([
			Middleware.validateDocumentMessageMedia,
			Middleware.handleDocumentMessage
		])
	);

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
