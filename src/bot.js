import { Telegraf, Composer } from 'telegraf';
import { message } from 'telegraf/filters';
import config from './config/global.js';
import logger from './utils/logger.js';
import * as _TTLCache from './config/ttlcache.js';
import * as _Middleware from './middlewares/bot.js';
import * as _Utils from './utils/bot.js';

const Middleware = _Middleware.default;
const Utils = _Utils.default;
const TTLCache = _TTLCache.default;

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
		IS_PRODUCTION,
		IS_TEST
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

	bot.command(
		'initDailyCredits',
		Composer.compose([
			async (ctx, next) => {
				const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

				if (!IS_TEST) {
					logger.info(
						{ context_id: contextId },
						`Received "initDailyCredits" command`
					);
					logger.debug(
						{
							context_id: contextId,
							message: ctx?.message || null
						},
						`Captured message details [${contextId}]`
					);
				}

				await next();
			},
			Middleware.initDailyCredits
		])
	);

	bot.command(
		'getRateLimiterStates',
		Composer.compose([
			async (ctx, next) => {
				const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

				if (!IS_TEST) {
					logger.info(
						{ context_id: contextId },
						`Received "getRateLimiterStates" command`
					);
					logger.debug(
						{
							context_id: contextId,
							message: ctx?.message || null
						},
						`Captured message details [${contextId}]`
					);
				}

				await next();
			},
			Middleware.getRateLimiterStates
		])
	);

	bot.command(
		'setJobTrackingRateLimiterMaxAttempt',
		Composer.compose([
			async (ctx, next) => {
				const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

				if (!IS_TEST) {
					logger.info(
						{ context_id: contextId },
						`Received "setJobTrackingRateLimiterMaxAttempt" command`
					);
					logger.debug(
						{
							context_id: contextId,
							message: ctx?.message || null
						},
						`Captured message details [${contextId}]`
					);
				}

				await next();
			},
			Middleware.setJobTrackingRateLimiterMaxAttempt
		])
	);

	bot.command(
		'setTaskInitRateLimiterMaxAttempt',
		Composer.compose([
			async (ctx, next) => {
				const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

				if (!IS_TEST) {
					logger.info(
						{ context_id: contextId },
						`Received "setTaskInitRateLimiterMaxAttempt" command`
					);
					logger.debug(
						{
							context_id: contextId,
							message: ctx?.message || null
						},
						`Captured message details [${contextId}]`
					);
				}

				await next();
			},
			Middleware.setTaskInitRateLimiterMaxAttempt
		])
	);

	bot.command(
		'getSharedCreditStates',
		Composer.compose([
			async (ctx, next) => {
				const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

				if (!IS_TEST) {
					logger.info(
						{ context_id: contextId },
						`Received "getSharedCreditStates" command`
					);
					logger.debug(
						{
							context_id: contextId,
							message: ctx?.message || null
						},
						`Captured message details [${contextId}]`
					);
				}

				await next();
			},
			Middleware.getSharedCreditStates
		])
	);

	bot.command('mergepdf', async (ctx) => {
		const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

		if (!IS_TEST) {
			logger.info({ context_id: contextId }, `Received "mergepdf" command`);
		}

		const replyMsg = await ctx.reply(
			'Silahkan kirim file PDF yang ingin diproses dengan membalas pesan ini. ' +
				'Pastikan setiap file berformat PDF dan ukurannya tidak lebih dari 5MB. ' +
				'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar.' +
				`\n\n🚧 Kamu dapat mengirim file sampai 1 hari kedepan.`
		);

		/**
		 * Unique identifier of cached message, see {@link _TTLCache.CachedMessageId}
		 */
		const mid = `${ctx.chat.id}${replyMsg.message_id}`;
		TTLCache.userMessageUploadCache.set(mid, {
			userId: ctx.chat.id,
			messageId: replyMsg.message_id,
			tool: 'merge',
			fileType: 'pdf',
			files: []
		});

		if (!IS_TEST) {
			logger.debug(
				{ context_id: contextId },
				`Created cached message [mid:${mid}]`
			);
		}
	});

	bot.command('bulkimage', async (ctx) => {
		const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

		if (!IS_TEST) {
			logger.info({ context_id: contextId }, `Received "bulkimage" command`);
		}

		const replyMsg = await ctx.reply(
			'Silahkan kirim file yang ingin diproses dengan membalas pesan ini. ' +
				'Pastikan setiap file berformat (.jpg, .png, .jpeg) dan ukurannya tidak lebih dari 5MB. ' +
				'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar.' +
				`\n\n🚧 Kamu dapat mengirim file sampai 1 hari kedepan.`
		);

		/**
		 * Unique identifier of cached message, see {@link _TTLCache.CachedMessageId}
		 */
		const mid = `${ctx.chat.id}${replyMsg.message_id}`;
		TTLCache.userMessageUploadCache.set(mid, {
			userId: ctx.chat.id,
			messageId: replyMsg.message_id,
			tool: 'merge',
			fileType: 'image',
			files: []
		});

		if (!IS_TEST) {
			logger.debug(
				{ context_id: contextId },
				`Created cached message [mid:${mid}]`
			);
		}
	});

	bot.command('subsidi', async (ctx) => {
		const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

		if (!IS_TEST) {
			logger.info({ context_id: contextId }, `Received "subsidi" command`);
		}

		await ctx.reply(
			'Setiap hari, Filebuds menyediakan akses gratis untuk semua pengguna lewat subsidi.' +
				'\n- Jumlahnya terbatas dan berlaku siapa cepat, dia dapat⏳' +
				'\n- Kalau subsidi hari ini sudah habis, kamu bisa pakai /pulsa untuk akses fast track⚡'
		);
	});

	bot.command('pulsa', async (ctx) => {
		const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

		if (!IS_TEST) {
			logger.info({ context_id: contextId }, `Received "pulsa" command`);
		}

		await ctx.reply(
			'Pulsa di Filebuds adalah kredit yang bisa kamu gunakan untuk memproses file gambar atau PDF dengan cepat. ' +
				'Layaknya pulsa HP, kamu bisa isi ulang lewat /isipulsa dan cek sisa pulsa dengan /cekpulsa.' +
				'\n\nDengan menggunakan pulsa :' +
				'\n- Aksesmu pakai fast track sehingga lebih cepat dibanding pengguna gratis⚡' +
				'\n- Tidak ada batasan jumlah file yang bisa diproses, selama pulsamu masih tersedia🚀'
		);
	});

	bot.command('isipulsa', async (ctx) => {
		const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

		if (!IS_TEST) {
			logger.info({ context_id: contextId }, `Received "isipulsa" command`);
		}

		await ctx.reply(
			'Saat ini fitur pulsa belum tersedia. ' +
				'Tapi tenang, kamu masih bisa pakai semua fitur Filebuds lewat akses gratis dari /subsidi setiap harinya. ' +
				'Yuk manfaatkan sebelum kuotanya habis🤑'
		);
	});

	bot.command('cekpulsa', async (ctx) => {
		const contextId = `msg:${ctx?.chat?.id || 'unknown'}${ctx?.msgId || 'unknown'}`;

		if (!IS_TEST) {
			logger.info({ context_id: contextId }, `Received "cekpulsa" command`);
		}

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

	bot.catch((error, ctx) => {
		let contextId = 'unknown:unknown';
		const isCallbackQuery = ctx?.callbackQuery?.id;
		const isMessage = ctx?.message?.chat?.id && ctx?.msgId;

		if (isCallbackQuery) {
			contextId = `cbq:${ctx.callbackQuery.id}`;
		}
		if (isMessage) {
			contextId = `msg:${ctx.message.chat.id}${ctx.msgId}`;
		}

		logger.fatal(
			{ context_id: contextId, error },
			'Unhandled error occurred in Telegram bot'
		);
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
