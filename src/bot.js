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

	bot.command('initDailyCredits', Middleware.initDailyCredits);

	bot.command('getRateLimiterStates', Middleware.getRateLimiterStates);

	bot.command(
		'setJobTrackingRateLimiterMaxAttempt',
		Middleware.setJobTrackingRateLimiterMaxAttempt
	);

	bot.command(
		'setTaskInitRateLimiterMaxAttempt',
		Middleware.setTaskInitRateLimiterMaxAttempt
	);

	bot.command('getSharedCreditStates', Middleware.getSharedCreditStates);

	bot.command(
		'mergepdf',
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;

					logger.info(`Received "mergepdf" command from ${user} [${userId}]`);
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving "mergepdf" command'
					);
				} finally {
					await next();
				}
			},
			async (ctx) => {
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
			}
		])
	);

	bot.command(
		'bulkimage',
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;

					logger.info(`Received "bulkimage" command from ${user} [${userId}]`);
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving "bulkimage" command'
					);
				} finally {
					await next();
				}
			},
			async (ctx) => {
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
			}
		])
	);

	bot.command(
		'subsidi',
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;

					logger.info(`Received "subsidi" command from ${user} [${userId}]`);
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving "subsidi" command'
					);
				} finally {
					await next();
				}
			},
			async (ctx) => {
				await ctx.reply(
					'Setiap hari, Filebuds menyediakan akses gratis untuk semua pengguna lewat subsidi.' +
						'\n- Jumlahnya terbatas dan berlaku siapa cepat, dia dapat⏳' +
						'\n- Kalau subsidi hari ini sudah habis, kamu bisa pakai /pulsa untuk akses fast track⚡'
				);
			}
		])
	);

	bot.command(
		'pulsa',
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;

					logger.info(`Received "pulsa" command from ${user} [${userId}]`);
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving "pulsa" command'
					);
				} finally {
					await next();
				}
			},
			async (ctx) => {
				await ctx.reply(
					'Pulsa di Filebuds adalah kredit yang bisa kamu gunakan untuk memproses file gambar atau PDF dengan cepat. ' +
						'Layaknya pulsa HP, kamu bisa isi ulang lewat /isipulsa dan cek sisa pulsa dengan /cekpulsa.' +
						'\n\nDengan menggunakan pulsa :' +
						'\n- Aksesmu pakai fast track sehingga lebih cepat dibanding pengguna gratis⚡' +
						'\n- Tidak ada batasan jumlah file yang bisa diproses, selama pulsamu masih tersedia🚀'
				);
			}
		])
	);

	bot.command(
		'isipulsa',
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;

					logger.info(`Received "isipulsa" command from ${user} [${userId}]`);
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving "isipulsa" command'
					);
				} finally {
					await next();
				}
			},
			async (ctx) => {
				await ctx.reply(
					'Saat ini fitur pulsa belum tersedia. ' +
						'Tapi tenang, kamu masih bisa pakai semua fitur Filebuds lewat akses gratis dari /subsidi setiap harinya. ' +
						'Yuk manfaatkan sebelum kuotanya habis🤑'
				);
			}
		])
	);

	bot.command(
		'cekpulsa',
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;

					logger.info(`Received "cekpulsa" command from ${user} [${userId}]`);
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving "cekpulsa" command'
					);
				} finally {
					await next();
				}
			},
			async (ctx) => {
				await ctx.reply(
					'Saat ini fitur pulsa belum tersedia. ' +
						'Tapi tenang, kamu masih bisa pakai semua fitur Filebuds lewat akses gratis dari /subsidi setiap harinya. ' +
						'Yuk manfaatkan sebelum kuotanya habis🤑'
				);
			}
		])
	);

	bot.on(
		'callback_query',
		Composer.compose([
			Middleware.initCallbackQueryState,
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const {
						type,
						jobId,
						tool,
						toolPrice,
						tg_user_id: userId
					} = /** @type {_Middleware.CallbackQueryStateProps} */ (
						ctx.state || {}
					);

					switch (type) {
						case 'job_track':
							logger.info(
								`Received job_track [${jobId}] from ${user} [${userId}]`
							);
							break;

						case 'task_init':
							logger.info(
								`Received task_init (${tool}) from ${user} [${userId}], costing ${toolPrice} credits`
							);
							break;
					}
				} catch (error) {
					logger.error(
						error,
						'Error logging event while receiving callback queries'
					);
				} finally {
					await next();
				}
			},
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
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;
					const replyMsgId = ctx.message?.reply_to_message?.message_id;
					const photos = ctx.message.photo;
					const { file_unique_id } = photos[photos.length - 1];

					if (replyMsgId) {
						const mid = `${userId}${replyMsgId}`;
						logger.info(
							`Received photo [${file_unique_id}] from ${user} [${userId}] to update cached message [${mid}]`
						);
					} else {
						logger.info(
							`Received photo [${file_unique_id}] from ${user} [${userId}] to select tools`
						);
					}
				} catch (error) {
					logger.error(error, 'Error logging event while receiving photos');
				} finally {
					await next();
				}
			},
			Middleware.validatePhotoMessageMedia,
			Middleware.handlePhotoMessage
		])
	);

	bot.on(
		message('document'),
		Composer.compose([
			// TODO: Refactor.
			async (ctx, next) => {
				try {
					const user = Utils.getUserFromContext(ctx);
					const userId = ctx.chat.id;
					const replyMsgId = ctx.message?.reply_to_message?.message_id;
					const { file_unique_id } = ctx.message.document;

					if (replyMsgId) {
						const mid = `${userId}${replyMsgId}`;
						logger.info(
							`Received document [${file_unique_id}] from ${user} [${userId}] to update cached message [${mid}]`
						);
					} else {
						logger.info(
							`Received document [${file_unique_id}] from ${user} [${userId}] to select tools`
						);
					}
				} catch (error) {
					logger.error(error, 'Error logging event while receiving documents');
				} finally {
					await next();
				}
			},
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
