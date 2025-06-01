import config from '../config/global.js';
import SharedCreditManager from '../libs/sharedCreditManager.js';
import RateLimiter from '../libs/rateLimiter.js';
import * as _TTLCache from '../config/ttlcache.js';
import * as _TaskQueue from '../queues/task.js';
import * as _SupabaseService from '../services/supabase.js';
import * as _BotUtils from '../utils/bot.js';
import * as _MiscUtils from '../utils/misc.js';
import * as Telegraf from 'telegraf'; // eslint-disable-line
import * as TelegrafTypes from 'telegraf/types'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line
import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line
import * as TaskQueueTypes from '../queues/task.js'; // eslint-disable-line
import * as SupabaseTypes from '../schemas/supabase.js'; // eslint-disable-line

/**
 * @typedef {Object} BaseStateProps
 * @property {Object} response
 * An optional response object containing details about the result of an operation.
 * It can be used to pass relevant information to the next middleware in the chain.
 * @property {string | undefined} response.message
 * A message that can be used to inform the user about the result of an operation.
 * It serves as a fallback message in case of an error or as a success message when necessary.
 * This allows the next middleware in the chain to notify the user accordingly.
 */

/**
 * @typedef BaseCallbackQueryStateProps
 * @property {'job_track' | 'task_init'} type
 * Callback query type.
 * @property {number} tg_user_id
 * Telegram user ID that trigger callback query.
 * @property {number} message_id
 * Specific message ID that contain callback query.
 * @property {string | undefined} jobId
 * Job id, only available on `job_track` callback query type.
 * @property {ILoveApiTypes.ToolEnum | undefined} tool
 * Tool type, only available on `task_init` callback query type.
 * @property {number | undefined} toolPrice
 * Credit cost of the task, based on the price of the tool being used, only available on `task_init` callback query type.
 * @property {TelegramBotTypes.FileTypeEnum | undefined} fileType
 * File type, only available on `task_init` callback query type.
 * @property {TaskQueueTypes.TaskJobPayload['fileLink'] | undefined} fileLink
 * Public file URL(s) string to be processed, only available on `task_init` callback query type.
 * @property {SupabaseTypes.BaseJobLogProps['payment_method'] | undefined} paymentMethod
 * Represent the {@link SupabaseTypes.BaseJobLogProps.payment_method payment method} used to pay for the task,
 * only available on `task_init` callback query type.
 * @property {boolean | undefined} isUserCreditAvailable
 * Indicates whether user has enough credit to process the task, only available on `task_init` callback query type.
 * @property {boolean | undefined} isSharedCreditAvailable
 * Indicates whether shared credit is available to process the task, only available on `task_init` callback query type.
 * @property {boolean} isMessageDeleteable
 * Indicates whether the message can be deleted.
 * This is `true` if the message age is less than 45 hours.
 * (Telegram allows deleting messages only within 48 hours,
 * with a 3-hour offset as a preventive measure.)
 */

/**
 * @typedef {BaseStateProps & BaseCallbackQueryStateProps} CallbackQueryStateProps
 * Represent callback query state stored on `ctx.state` that only available on event `callback_query`.
 */

/**
 * @typedef {Object} CallbackQueryDataProps
 * Represent the structure of Telegram callback query data, which is stringified using `JSON.stringify()`.
 * @property {string | undefined} jid
 * Filebuds job ID in SHA-1 hash format, used to track job progress.
 * @property {_TTLCache.CachedMessageId | undefined} mid
 * Cached message ID, in {@link _TTLCache.CachedMessageId this} format, used to track uploaded files for specific tools.
 * @property {'clear_job_tracking_rl' | 'clear_task_init_rl' | 'clear_all_rl'} event
 * Specifies the type of administrative event to perform. Accepted values are:
 *
 * - `clear_job_tracking_rl`: Clears all entries in the job tracking rate limiter.
 *   This resets the rate limit state for all users attempting to track jobs.
 * - `clear_task_init_rl`: Clears all entries in the task initialization rate limiter.
 *   This resets the rate limit state for all users attempting to initiate a new task.
 * - `clear_all_rl`: Clears all entries in both the job tracking and task initialization rate limiters.
 *   This fully resets rate limiting states, allowing all users to bypass any previously applied limits.
 * @property {ILoveApiTypes.ToolEnum | undefined} task
 * Type of tool from `ILoveApi` services.
 * @property {TelegramBotTypes.FileTypeEnum | undefined} type
 * File type, indicating whether the related task uses PDF or image files.
 */

/**
 * @typedef {Object} BasePhotoMessageStateProps
 * @property {string} fileId
 * Telegram photo file identifier, which can be used to download or reuse the file.
 */

/**
 * @typedef {BaseStateProps & BasePhotoMessageStateProps} PhotoMessageStateProps
 * Represent photo message state stored on `ctx.state` that only available on event `message('photo')`.
 */

/**
 * @typedef {Object} BaseDocumentMessageStateProps
 * @property {string} fileId
 * Telegram document file identifier, which can be used to download or reuse the file.
 * @property {boolean} isImage
 * Boolean indicating whether the document is an image.
 * @property {boolean} isPdf
 * Boolean indicating whether the document is a PDF.
 */

/**
 * @typedef {BaseStateProps & BaseDocumentMessageStateProps} DocumentMessageStateProps
 * Represent document message state stored on `ctx.state` that only available on event `message('document')`.
 */

const { IS_PRODUCTION, IS_TEST } = config;

// TODO: Find way to store tools price and allowing real-time updates.
const TOOLS_PRICE = /** @type {Record<ILoveApiTypes.ToolEnum, number>} */ ({
	upscaleimage: 20,
	removebackgroundimage: 10,
	imagepdf: 10,
	merge: 5,
	compress: 10,
	pdfjpg: 10
});

// TODO: Find way to store admin id's and allowing real-time updates.
const ADMIN_IDS = /** @type {Array<number>} */ ([1185191684]);

const TaskQueue = _TaskQueue.default;
const SupabaseService = _SupabaseService.default;
const BotUtils = _BotUtils.default;
const MiscUtils = _MiscUtils.default;
const TTLCache = _TTLCache.default;

const CallbackQueryJobTrackingRateLimiter =
	/** @type {InstanceType<typeof RateLimiter<string,number>>} */ (
		new RateLimiter({
			ttl: 30 * 1000,
			max: IS_TEST ? 3 : 150,
			maxAttempt: IS_TEST ? 2 : 10
		})
	);

const CallbackQueryTaskInitRateLimiter =
	/** @type {InstanceType<typeof RateLimiter<string,number>>} */ (
		new RateLimiter({
			ttl: 60 * 1000,
			max: IS_TEST ? 3 : 150,
			maxAttempt: 2
		})
	);

const initCallbackQueryState =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			try {
				const {
					jid,
					mid,
					task: tool,
					type: fileType
				} = /** @type {CallbackQueryDataProps} */ (
					JSON.parse(ctx.callbackQuery.data)
				);

				// Handle job_track callback query.
				if (jid) {
					ctx.state = /** @type {CallbackQueryStateProps} */ ({
						type: 'job_track',
						tg_user_id: ctx.chat.id,
						message_id: ctx.msgId,
						jobId: jid,
						response: {}
					});

					await next();
					return;
				}

				// Handle cached message task_init callback query.
				if (mid) {
					const data = TTLCache.userMessageUploadCache.get(mid);
					const dataTtl = TTLCache.userMessageUploadCache.getRemainingTTL(mid);

					if (data && dataTtl > 0) {
						if (data.files.length < 2) {
							await ctx.answerCbQuery(
								'Untuk memproses permintaanmu, setidaknya ada 2 file yang dikirim untuk diproses.',
								{ show_alert: true }
							);
							return;
						}

						ctx.state = /** @type {CallbackQueryStateProps} */ ({
							type: 'task_init',
							tg_user_id: ctx.chat.id,
							message_id: ctx.msgId,
							tool: data.tool,
							toolPrice: TOOLS_PRICE[data.tool],
							fileType: data.fileType,
							fileLink: data.files.map((file) => file.fileLink),
							response: {}
						});

						await next();
						return;
					} else {
						await ctx.answerCbQuery(
							'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔. ' +
								'Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
							{ show_alert: true, cache_time: IS_PRODUCTION ? 86400 : 10 }
						);
						return;
					}
				}

				// Handle task_init callback query.
				if (tool && fileType) {
					ctx.state = /** @type {CallbackQueryStateProps} */ ({
						type: 'task_init',
						tg_user_id: ctx.chat.id,
						message_id: ctx.msgId,
						tool,
						toolPrice: TOOLS_PRICE[tool],
						fileType,
						response: {}
					});

					await next();
					return;
				}

				// Reject unknown callback query types by throwing an Error
				throw new Error('Unknown callback query types');
			} catch (error) {
				if (!IS_TEST) {
					console.error('Failed to init callback query state:', error.message);
				}

				await ctx.answerCbQuery(
					'Filebuds engga bisa memproses permintaanmu. Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
					{ show_alert: true, cache_time: IS_PRODUCTION ? 86400 : 10 }
				);
			}
		}
	);

const checkUsersCreditCallbackQueryHandler =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			try {
				const { type } = /** @type {CallbackQueryStateProps} */ (ctx.state);

				if (type === 'job_track') {
					// No need to check users credit for job track queries.
					await next();
				} else if (type === 'task_init') {
					// TODO: When user credit or 'pulsa' feature exist, this should check users credit.
					ctx.state.isUserCreditAvailable = false;
					await next();
				} else {
					throw new Error('Unknown callback query types');
				}
			} catch (error) {
				if (!IS_TEST) {
					console.error(
						'Failed to check users credit when handling callback query:',
						error.message
					);
				}

				await ctx.answerCbQuery(
					'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
					{ show_alert: true }
				);
			}
		}
	);

const checkSharedCreditCallbackQueryHandler =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			try {
				const { type, toolPrice, isUserCreditAvailable } =
					/** @type {CallbackQueryStateProps} */ (ctx.state);

				if (type === 'job_track') {
					// No need to check shared credit for job track queries.
					await next();
				} else if (type === 'task_init') {
					if (isUserCreditAvailable) {
						// No need to check shared credit when user credit is available.
						ctx.state.paymentMethod = 'user_credit';
						await next();
						return;
					}

					if (await SharedCreditManager.consumeCredits(toolPrice)) {
						ctx.state.isSharedCreditAvailable = true;
						ctx.state.paymentMethod = 'shared_credit';
						await next();
						return;
					}

					// HACK: Caching callback query messages is problematic when user credit or 'pulsa' features are exist because:
					// - After users top up their individual credits, they must wait for the cache_time to expire before they can retry the callback query.
					await ctx.answerCbQuery(
						'Duh! Kuota harian Filebuds sudah habis⏳. Silahkan coba lagi besok atau pastiin /pulsa kamu cukup untuk pakai fast track⚡',
						{ show_alert: true, cache_time: 30 }
					);
				} else {
					throw new Error('Unknown callback query types');
				}
			} catch (error) {
				if (!IS_TEST) {
					console.error(
						'Failed to check shared credit when handling callback query:',
						error.message
					);
				}

				await ctx.answerCbQuery(
					'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
					{ show_alert: true }
				);
			}
		}
	);

const checkCallbackQueryLimit =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			try {
				let isCallbackQueryAllowed = false;
				const { type, tg_user_id, toolPrice, paymentMethod } =
					/** @type {CallbackQueryStateProps} */ (ctx.state);

				if (type === 'job_track') {
					isCallbackQueryAllowed = CallbackQueryJobTrackingRateLimiter.attempt(
						`${tg_user_id}`
					);
					if (!isCallbackQueryAllowed) {
						const remainingTtl =
							CallbackQueryJobTrackingRateLimiter.getRemainingTTL(
								`${tg_user_id}`
							);
						const cache_time =
							remainingTtl < 2500 ? 3 : Math.floor(remainingTtl / 1000);

						await ctx.answerCbQuery(
							'Duh! Filebuds lagi sibuk atau akses kamu sedang dibatasi. Silahkan coba lagi dalam beberapa saat⏳',
							{ show_alert: true, cache_time }
						);
						return;
					}
				} else if (type === 'task_init') {
					const isFastTrack = paymentMethod === 'user_credit';

					isCallbackQueryAllowed =
						CallbackQueryTaskInitRateLimiter.attempt(`${tg_user_id}`) ||
						isFastTrack;

					if (!isCallbackQueryAllowed) {
						const remainingTtl =
							CallbackQueryTaskInitRateLimiter.getRemainingTTL(`${tg_user_id}`);
						const cache_time =
							remainingTtl < 4500 ? 5 : Math.floor(remainingTtl / 1000);

						if (!isFastTrack) {
							await SharedCreditManager.refundCredits(toolPrice);
						}

						await ctx.answerCbQuery(
							'Duh! Filebuds lagi sibuk atau akses kamu sedang dibatasi. Silahkan coba lagi dalam beberapa saat⏳. Biar akses kamu engga dibatasin, pastikan /pulsa kamu cukup untuk pakai fast track⚡',
							{ show_alert: true, cache_time }
						);
						return;
					}
				} else {
					throw new Error('Unknown callback query types');
				}

				await next();
			} catch (error) {
				if (!IS_TEST) {
					console.error(
						'Failed to check callback query rate limit:',
						error.message
					);
				}

				await ctx.answerCbQuery(
					'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
					{ show_alert: true }
				);
			}
		}
	);

const validateCallbackQueryExpiry =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			const nowSecond = Math.floor(Date.now() / 1000);
			const msgDateSecond = ctx.callbackQuery?.message?.date;
			const { type } = /** @type {CallbackQueryStateProps} */ (ctx.state);

			if (!msgDateSecond) {
				if (!IS_TEST) {
					console.warn('Callback query message date is unavailable.');
				}

				await ctx.answerCbQuery(
					`Duh! Ada yang salah diserver Filebuds. Mohon maaf, ${type === 'job_track' ? 'resimu gagal diperbarui' : 'kamu perlu mengirim ulang file yang ingin diproses'}😔`,
					{ show_alert: true, cache_time: IS_PRODUCTION ? 86400 : 10 }
				);
				return;
			}

			const secondsSinceMsg = nowSecond - msgDateSecond;
			const shouldRejectQuery = secondsSinceMsg > 86400; // 24 hours
			const deleteQueryMessageAllowed = secondsSinceMsg < 162000; // 45 hours

			if (shouldRejectQuery) {
				if (deleteQueryMessageAllowed) {
					await ctx.deleteMessage().catch((error) => {
						// Gracefully catch and ignore any error.
						if (!IS_TEST) {
							console.error('Failed to delete message:', error.message);
						}
					});
				}
				await ctx.answerCbQuery(
					'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔',
					{ show_alert: true, cache_time: IS_PRODUCTION ? 86400 : 10 }
				);
				return;
			}

			ctx.state.isMessageDeleteable = deleteQueryMessageAllowed;

			await next();
		}
	);

const validateCallbackQueryMedia =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			/**
			 * Maximum allowed processed file size in bytes.
			 * - Default: `10485760` (10MB)
			 */
			const maxProcessedFileSize = 10 * 1024 * 1024;
			const { type, fileType, fileLink } =
				/** @type {CallbackQueryStateProps} */ (ctx.state);

			if (type === 'job_track' || fileLink) {
				// No need to validate media for job track queries or cached message (fileLink exist).
				await next();
				return;
			}

			// Validate media size and resolve fileLink
			try {
				var file_id;
				var file_size;

				const isDocument = fileType.split('/')[0] === 'doc';
				const isImage = fileType.includes('image');

				if (isImage) {
					if (isDocument) {
						file_id = ctx.callbackQuery?.message?.document?.file_id;
						file_size = ctx.callbackQuery?.message?.document?.file_size;

						if (typeof file_size !== 'number') {
							throw new Error('Cannot check file size, invalid file_size');
						}

						if (!BotUtils.checkFileSize(file_size, maxProcessedFileSize)) {
							ctx.state.response.message =
								'Filebuds engga bisa memproses permintaanmu karena ukuran file ini lebih dari 10MB⛔';
							throw new Error(
								'Media file size exceeds the maximum allowed size'
							);
						}
					} else {
						const images = ctx.callbackQuery?.message?.photo;
						const image = images[images.length - 1];
						file_id = image?.file_id;
						file_size = image?.file_size;

						if (typeof file_size !== 'number') {
							throw new Error('Cannot check file size, invalid file_size');
						}

						if (!BotUtils.checkFileSize(file_size, maxProcessedFileSize)) {
							ctx.state.response.message =
								'Filebuds engga bisa memproses permintaanmu karena ukuran file ini lebih dari 10MB⛔';
							throw new Error(
								'Media file size exceeds the maximum allowed size'
							);
						}
					}
				} else {
					file_id = ctx.callbackQuery?.message?.document?.file_id;
					file_size = ctx.callbackQuery?.message?.document?.file_size;

					if (typeof file_size !== 'number') {
						throw new Error('Cannot check file size, invalid file_size');
					}

					if (!BotUtils.checkFileSize(file_size, maxProcessedFileSize)) {
						ctx.state.response.message =
							'Filebuds engga bisa memproses permintaanmu karena ukuran file ini lebih dari 10MB⛔';
						throw new Error('Media file size exceeds the maximum allowed size');
					}
				}

				if (file_id) {
					const link = await ctx.telegram.getFileLink(file_id);
					ctx.state.fileLink = link.toString();

					await next();
					return;
				}

				// Throw an Error when fileLink are not resolved
				throw new Error('Cannot resolve fileLink, invalid file_id');
			} catch (error) {
				const answerCbQueryMsg =
					ctx.state?.response?.message ||
					`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`;

				if (!IS_TEST) {
					console.error(
						'Failed to validate callback query media:',
						error.message
					);
				}

				await ctx.answerCbQuery(answerCbQueryMsg, {
					show_alert: true,
					cache_time: IS_PRODUCTION ? 86400 : 10
				});
				return;
			}
		}
	);

const handleCallbackQuery =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx) => {
			const {
				type,
				tg_user_id,
				message_id,
				jobId,
				tool,
				toolPrice,
				fileType,
				fileLink,
				paymentMethod
			} = /** @type {CallbackQueryStateProps} */ (ctx.state);

			if (type === 'job_track') {
				try {
					let replyMsg;

					const jobLog = await SupabaseService.getJobLog({
						job_id: jobId,
						tg_user_id
					});

					if (Array.isArray(jobLog) && jobLog.length) {
						replyMsg = BotUtils.generateJobTrackingMessage(jobLog[0]);

						// Only update Job Tracking Message when job logs are changes from previous state.
						const shouldUpdateMessage =
							ctx?.callbackQuery?.message?.text !== replyMsg.text;
						if (shouldUpdateMessage) {
							await ctx.editMessageText(replyMsg.text, replyMsg.extra);
						}
					}

					await ctx.answerCbQuery('Resimu berhasil diperbarui✅');
					return;
				} catch (error) {
					if (!IS_TEST) {
						console.error(
							'Failed to process job tracking callback query:',
							error.message
						);
					}

					await ctx.answerCbQuery(
						'Duh! Ada yang salah diserver Filebuds. Resimu gagal diperbarui, silahkan coba lagi🔄',
						{ show_alert: true }
					);
					return;
				}
			}

			if (type === 'task_init') {
				try {
					let replyMsg;

					const { ok, isWaiting, jid } = await TaskQueue.addTaskJob({
						telegramUserId: tg_user_id,
						messageId: message_id,
						tool,
						toolPrice,
						toolOptions: {},
						fileType,
						fileLink,
						paymentMethod
					});

					if (ok) {
						if (isWaiting) {
							replyMsg = BotUtils.generateJobTrackingMessage(
								null,
								jid,
								tool,
								'1',
								true,
								true
							);
							await ctx.reply(replyMsg.text, replyMsg.extra);
						} else {
							replyMsg = BotUtils.generateJobTrackingMessage(
								null,
								jid,
								tool,
								'2',
								true,
								true
							);
							await ctx.reply(replyMsg.text, replyMsg.extra);
						}
					} else {
						replyMsg = BotUtils.generateJobTrackingMessage(null, '-', tool);
						await ctx.reply(replyMsg.text, replyMsg.extra);
					}
				} catch (error) {
					if (!IS_TEST) {
						console.error(
							'Failed to process task initialization callback query:',
							error.message
						);
					}

					await ctx.answerCbQuery(
						'Duh! Ada yang salah diserver Filebuds. Permintaanmu gagal diproses, silahkan coba lagi🔄',
						{ show_alert: true }
					);
					return;
				}
			}

			// Gracefully answer callback query even callback type are not recognized.
			// Should log ctx.state to further debugging.
			await ctx.answerCbQuery();
		}
	);

const validatePhotoMessageMedia =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.MessageUpdate<TelegrafTypes.Message.PhotoMessage>>>} */ (
		async (ctx, next) => {
			/**
			 * Maximum allowed uploaded file size in bytes.
			 * - Default: `5242880` (5MB)
			 */
			const maxUploadedFileSize = 5 * 1024 * 1024;

			try {
				const photos = ctx.message.photo;

				// Select highest resolution photo.
				const { file_id, file_size, file_unique_id } =
					photos[photos.length - 1];

				if (typeof file_size !== 'number') {
					throw new Error('Cannot check file size, invalid file_size');
				}

				if (!BotUtils.checkFileSize(file_size, maxUploadedFileSize)) {
					ctx.state = {
						response: {
							message:
								'Filebuds engga bisa menerima gambar yang kamu kirim karena ukurannya lebih dari 5MB⛔'
						}
					};
					throw new Error('Media file size exceeds the maximum allowed size');
				}

				if (ctx.message?.reply_to_message?.message_id) {
					/**
					 * Unique identifier of cached message, see {@link _TTLCache.CachedMessageId}
					 */
					const mid = `${ctx.chat.id}${ctx.message.reply_to_message.message_id}`;

					await TTLCache.withLock(mid, async () => {
						const data = TTLCache.userMessageUploadCache.get(mid);
						const dataTtl =
							TTLCache.userMessageUploadCache.getRemainingTTL(mid);

						// Ignore message when cached document message (data) are unavailable or expired.
						// This can happen when user replied to a message that not cached,
						// or user replied to a cached message that already expired (more than 1 day).
						if (!data || dataTtl <= 0) return;

						const isValidImage = data.fileType !== 'pdf';

						// When sended file type match to cached document message (data), update the cache with the new file.
						if (isValidImage) {
							const fileURL = await ctx.telegram.getFileLink(file_id);
							const updatedFiles = /** @type {typeof data.files} */ ([
								...data.files,
								{ fileName: file_unique_id, fileLink: fileURL.toString() }
							]);
							const updatedFilesName = updatedFiles.map(
								(file) => file.fileName
							);

							TTLCache.userMessageUploadCache.set(
								mid,
								{ ...data, files: updatedFiles },
								{ noUpdateTTL: true }
							);

							// Ensure cached message files are updated.
							const isCacheUpdated = MiscUtils.areArraysEqualByIndex(
								TTLCache.userMessageUploadCache.get(mid).files,
								updatedFiles,
								true
							);

							if (!isCacheUpdated) {
								// [Edge Case] Failed to update the cached message files.
								// This could be due to memory issues or unexpected exceptions
								// that prevent `TTLCache.userMessageUploadCache.set` from succeeding.
								ctx.state = {
									response: {
										message: `Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
									}
								};
								throw new Error('Failed to update the cached message files');
							}

							await ctx.telegram.editMessageText(
								ctx.chat.id,
								ctx.message.reply_to_message.message_id,
								undefined,
								'Silahkan kirim file yang ingin diproses dengan membalas pesan ini. ' +
									'Pastikan setiap file berformat (.jpg, .png, .jpeg) dan ukurannya tidak lebih dari 5MB. ' +
									'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar. \n\n' +
									updatedFilesName
										.map((item, index) => `${index + 1}: ${item}`)
										.join('\n') +
									`\n\n🚧 Kamu dapat mengirim file ${updatedFiles.length < 2 ? '' : 'dan menggunakan opsi dibawah '}sampai 1 hari kedepan.`,
								{
									reply_markup:
										updatedFiles.length < 2
											? undefined
											: {
													inline_keyboard: [
														[
															{
																text: 'Gabungin 📚 (5)',
																callback_data: JSON.stringify({ mid })
															}
														]
													]
												}
								}
							);

							return;
						}
					});
				} else {
					ctx.state = {
						fileId: file_id
					};

					await next();
				}
			} catch (error) {
				if (!IS_TEST) {
					console.error(
						'Failed to validate photo message media:',
						error.message
					);
				}

				await ctx.deleteMessage().catch((error) => {
					// Gracefully catch and ignore any error.
					if (!IS_TEST) {
						console.error('Failed to delete message:', error.message);
					}
				});

				const replyMsg =
					ctx.state?.response?.message ||
					`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`;

				await ctx.reply(replyMsg);
			}
		}
	);

const handlePhotoMessage =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.MessageUpdate<TelegrafTypes.Message.PhotoMessage>>>} */ (
		async (ctx) => {
			const { fileId } = /** @type {PhotoMessageStateProps} */ (ctx.state);

			await ctx.replyWithPhoto(fileId, {
				caption:
					'Mau diapain gambar ini❓' +
					`\n\n💡 Kamu bisa mengirim gambar sebagai dokumen atau mematikan kompresi file supaya kualitas gambarnya tetap bagus.` +
					`\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
				protect_content: true,
				reply_parameters: {
					message_id: ctx.message.message_id
				},
				reply_markup: {
					inline_keyboard: BotUtils.generateInlineKeyboard('image', true)
				}
			});
		}
	);

const validateDocumentMessageMedia =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.MessageUpdate<TelegrafTypes.Message.DocumentMessage>>>} */ (
		async (ctx, next) => {
			/**
			 * Maximum allowed uploaded file size in bytes.
			 * - Default: `5242880` (5MB)
			 */
			const maxUploadedFileSize = 5 * 1024 * 1024;

			try {
				const { file_id, file_size, file_name, mime_type } =
					ctx.message.document;

				if (typeof file_size !== 'number') {
					throw new Error('Cannot check file size, invalid file_size');
				}

				if (!BotUtils.checkFileSize(file_size, maxUploadedFileSize)) {
					ctx.state = {
						response: {
							message:
								'Filebuds engga bisa menerima file yang kamu kirim karena ukurannya lebih dari 5MB⛔'
						}
					};
					throw new Error('Media file size exceeds the maximum allowed size');
				}

				const { isImage, isPdf } = BotUtils.checkMimeType(mime_type);

				if (!isImage && !isPdf) {
					ctx.state = {
						response: {
							message:
								'Filebuds engga bisa menerima file yang kamu kirim karena formatnya tidak didukung⛔. ' +
								'Pastikan file yang kamu kirimkan adalah gambar (.jpg, .png, .jpeg) atau PDF (.pdf).'
						}
					};
					throw new Error('Media file mime type are not supported');
				}

				if (ctx.message?.reply_to_message?.message_id) {
					/**
					 * Unique identifier of cached message, see {@link _TTLCache.CachedMessageId}
					 */
					const mid = `${ctx.chat.id}${ctx.message.reply_to_message.message_id}`;

					await TTLCache.withLock(mid, async () => {
						const data = TTLCache.userMessageUploadCache.get(mid);
						const dataTtl =
							TTLCache.userMessageUploadCache.getRemainingTTL(mid);

						// Ignore message when cached document message (data) are unavailable or expired.
						// This can happen when user replied to a message that not cached,
						// or user replied to a cached message that already expired (more than 1 day).
						if (!data || dataTtl <= 0) return;

						const isValidPdf = data.fileType === 'pdf' && isPdf;
						const isValidImage = data.fileType !== 'pdf' && isImage;

						// When sended file type match to cached document message (data), update the cache with the new file.
						if (isValidPdf || isValidImage) {
							const fileURL = await ctx.telegram.getFileLink(file_id);
							const updatedFiles = /** @type {typeof data.files} */ ([
								...data.files,
								{ fileName: file_name, fileLink: fileURL.toString() }
							]);
							const updatedFilesName = updatedFiles.map(
								(file) => file.fileName
							);

							TTLCache.userMessageUploadCache.set(
								mid,
								{ ...data, files: updatedFiles },
								{ noUpdateTTL: true }
							);

							// Ensure cached message files are updated.
							const isCacheUpdated = MiscUtils.areArraysEqualByIndex(
								TTLCache.userMessageUploadCache.get(mid).files,
								updatedFiles,
								true
							);

							if (!isCacheUpdated) {
								// [Edge Case] Failed to update the cached message files.
								// This could be due to memory issues or unexpected exceptions
								// that prevent `TTLCache.userMessageUploadCache.set` from succeeding.
								ctx.state = {
									response: {
										message: `Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
									}
								};
								throw new Error('Failed to update the cached message files');
							}

							if (isValidPdf) {
								await ctx.telegram.editMessageText(
									ctx.chat.id,
									ctx.message.reply_to_message.message_id,
									undefined,
									'Silahkan kirim file PDF yang ingin diproses dengan membalas pesan ini. ' +
										'Pastikan setiap file berformat PDF dan ukurannya tidak lebih dari 5MB. ' +
										'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar. \n\n' +
										updatedFilesName
											.map((item, index) => `${index + 1}: ${item}`)
											.join('\n') +
										`\n\n🚧 Kamu dapat mengirim file ${updatedFiles.length < 2 ? '' : 'dan menggunakan opsi dibawah '}sampai 1 hari kedepan.`,
									{
										reply_markup:
											updatedFiles.length < 2
												? undefined
												: {
														inline_keyboard: [
															[
																{
																	text: 'Gabungin 📚 (5)',
																	callback_data: JSON.stringify({ mid })
																}
															]
														]
													}
									}
								);
							}

							if (isValidImage) {
								await ctx.telegram.editMessageText(
									ctx.chat.id,
									ctx.message.reply_to_message.message_id,
									undefined,
									'Silahkan kirim file yang ingin diproses dengan membalas pesan ini. ' +
										'Pastikan setiap file berformat (.jpg, .png, .jpeg) dan ukurannya tidak lebih dari 5MB. ' +
										'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar. \n\n' +
										updatedFilesName
											.map((item, index) => `${index + 1}: ${item}`)
											.join('\n') +
										`\n\n🚧 Kamu dapat mengirim file ${updatedFiles.length < 2 ? '' : 'dan menggunakan opsi dibawah '}sampai 1 hari kedepan.`,
									{
										reply_markup:
											updatedFiles.length < 2
												? undefined
												: {
														inline_keyboard: [
															[
																{
																	text: 'Gabungin 📚 (5)',
																	callback_data: JSON.stringify({ mid })
																}
															]
														]
													}
									}
								);
							}

							return;
						}
					});
				} else {
					ctx.state = {
						fileId: file_id,
						isImage,
						isPdf
					};

					await next();
				}
			} catch (error) {
				if (!IS_TEST) {
					console.error(
						'Failed to validate document message media:',
						error.message
					);
				}

				await ctx.deleteMessage().catch((error) => {
					// Gracefully catch and ignore any error.
					if (!IS_TEST) {
						console.error('Failed to delete message:', error.message);
					}
				});

				const replyMsg =
					ctx.state?.response?.message ||
					`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`;

				await ctx.reply(replyMsg);
			}
		}
	);

const handleDocumentMessage =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.MessageUpdate<TelegrafTypes.Message.DocumentMessage>>>} */ (
		async (ctx) => {
			const { fileId, isImage, isPdf } =
				/** @type {DocumentMessageStateProps} */ (ctx.state);

			if (isImage) {
				await ctx.replyWithDocument(fileId, {
					caption:
						'Mau diapain gambar ini❓' +
						`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
					protect_content: true,
					reply_parameters: {
						message_id: ctx.message.message_id
					},
					reply_markup: {
						inline_keyboard: BotUtils.generateInlineKeyboard('doc/image', true)
					}
				});
				return;
			}

			if (isPdf) {
				await ctx.replyWithDocument(fileId, {
					caption:
						'Mau diapain PDF ini❓' +
						`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
					protect_content: true,
					reply_parameters: {
						message_id: ctx.message.message_id
					},
					reply_markup: {
						inline_keyboard: BotUtils.generateInlineKeyboard('pdf', true, [
							'merge'
						])
					}
				});
				return;
			}
		}
	);

export default {
	/**
	 * A mapping of each tool to its credit cost.
	 * Used to determine how many credits are required to run a specific tool.
	 */
	TOOLS_PRICE,
	/**
	 * List of Telegram user IDs who are allowed to perform administrative actions.
	 */
	ADMIN_IDS,
	/**
	 * {@link RateLimiter RateLimiter} instance specifically used to limit the number of callback query `job_track` requests per user.
	 *
	 * - Allows up to `10` attempts per user within a `30-second` window.
	 * - Supports up to `150` users tracked simultaneously in the cache.
	 * - Helps prevent spamming or abuse by limiting the rate of callback queries.
	 */
	CallbackQueryJobTrackingRateLimiter,
	/**
	 * {@link RateLimiter RateLimiter} instance specifically used to limit the number of callback query `task_init` requests per user.
	 *
	 * - Allows up to `2` attempts per user within a `1-minute` window.
	 * - Supports up to `150` users tracked simultaneously in the cache.
	 * - Helps prevent spamming or abuse by limiting the rate of callback queries.
	 */
	CallbackQueryTaskInitRateLimiter,
	/**
	 * Middleware to init callback query states.
	 * - Rejects unknown callback query types.
	 * - Stores {@link CallbackQueryStateProps states} on `ctx.state` to be used in next chained middleware.
	 */
	initCallbackQueryState,
	/**
	 * Middleware to verify whether the user has enough individual credits
	 * based on the callback query type.
	 *
	 * #### Callback Query Types:
	 *
	 * **1. `job_track`:**
	 * - Skips credit checks and immediately proceeds to the next middleware
	 *   since this type does not consume any credits.
	 *
	 * **2. `task_init`:**
	 * - Checks if the user has sufficient credits to run the task.
	 * - If credits are sufficient:
	 *   - Sets {@link CallbackQueryStateProps.isUserCreditAvailable isUserCreditAvailable} state to `true`.
	 *   - Proceeds to the next middleware.
	 * - If credits are insufficient:
	 *   - Sets {@link CallbackQueryStateProps.isUserCreditAvailable isUserCreditAvailable} state to `false`.
	 *   - Still proceeds to the next middleware for shared credit fallback.
	 *
	 */
	checkUsersCreditCallbackQueryHandler,
	/**
	 * Middleware to verify whether shared credits can be used
	 * based on the callback query type and previous user credit check.
	 *
	 * #### Callback Query Types:
	 *
	 * **1. `job_track`:**
	 * - Skips credit checks and immediately proceeds to the next middleware
	 *   since this type does not consume any credits.
	 *
	 * **2. `task_init`:**
	 * - If the user has enough individual credits, skips shared credit check.
	 * - Otherwise:
	 *   - Checks if shared credits are available.
	 *   - If available:
	 *     - Sets {@link CallbackQueryStateProps.isSharedCreditAvailable isSharedCreditAvailable} state to `true`.
	 *     - Proceeds to the next middleware.
	 *   - If not available:
	 *     - Rejects the `task_init` callback query with a cached message.
	 *
	 */
	checkSharedCreditCallbackQueryHandler,
	/**
	 * Middleware to check the rate limit for a user's callback query based its type.
	 *
	 * #### Callback Query Types:
	 *
	 * **1. job_track:**
	 * - Rejects `job_track` callback query if the user has reached the {@link CallbackQueryJobTrackingRateLimiter access limit}.
	 *
	 * **2. task_init:**
	 * - Rejects `task_init` callback query if the user has reached the {@link CallbackQueryTaskInitRateLimiter access limit}.
	 * - However, if the user has enough credit to cover the request price,
	 * this rate limit check is bypassed, and the request is always allowed,
	 * even if the user has already hit the maximum limit in the cache.
	 *
	 */
	checkCallbackQueryLimit,
	/**
	 * Middleware to validate the expiry of a callback query messages.
	 * - Rejects queries for messages older than 24 hours.
	 * - Deletes messages if they are less than 45 hours old to prevent retry abuse.
	 * - Stores {@link CallbackQueryStateProps.isMessageDeleteable isMessageDeleteable} on `ctx.state` to be used in next chained middleware.
	 */
	validateCallbackQueryExpiry,
	/**
	 * Middleware to validate media of a callback query messages.
	 * - Rejects queries for media with size more than 10 MB.
	 * - Resolves and stores {@link CallbackQueryStateProps.fileLink fileLink} on `ctx.state` to be used in next chained middleware.
	 *
	 * When handling a cached message where {@link CallbackQueryStateProps states} already has a `fileLink`
	 * or the type is `job_track`, media validation is skipped and the next middleware
	 * in the chain is called immediately.
	 */
	validateCallbackQueryMedia,
	/**
	 * Middleware to handle callback queries.
	 *
	 * #### Callback Query Types:
	 *
	 * **1. job_track:**
	 * - Retrieves job log from `Supabase` database using provided job ID.
	 * - Updates text message to reflect latest job log status.
	 * - Answer callback query with an appropriate message based on the process outcome.
	 *
	 * **2. task_init:**
	 * - Publishes the job to `taskQueue` for processing.
	 * - Sends a text message containing the generated job tracking information.
	 * - Answer callback query with an appropriate message based on the process outcome.
	 */
	handleCallbackQuery,
	/**
	 * Middleware to validate media of a photo messages.
	 * - Rejects media when photo file size more than 5 MB.
	 * - Deletes message when media are rejected otherwise stores {@link PhotoMessageStateProps.fileId fileId} on `ctx.state` to be used in next chained middleware.
	 *
	 * When a message replies to a cached message, it acts as a file uploader for specific tools by:
	 * - Checking if the cached message still exists and hasn't expired (older than 1 day). If not available or expired, the message will be ignored.
	 * - Verifying if the uploaded file matches the expected MIME type based on the cached message. If it doesn't match, the message will be ignored.
	 * - Resolving the Telegram link for the uploaded file.
	 * - Updating the cached message by adding the Telegram file link to an array.
	 */
	validatePhotoMessageMedia,
	/**
	 * Middleware to handle photo messages.
	 * - Reply photo messages with an inline keyboard button to allow users select a tool.
	 */
	handlePhotoMessage,
	/**
	 * Middleware to validate media of a document messages.
	 * - Rejects media when document file size more than 5 MB or file mime type are not supported.
	 * - Deletes message when media are rejected otherwise stores {@link DocumentMessageStateProps.fileId fileId}, {@link DocumentMessageStateProps.isImage isImage}, {@link DocumentMessageStateProps.isPdf isPdf} on `ctx.state` to be used in next chained middleware.
	 *
	 * When a message replies to a cached message, it acts as a file uploader for specific tools by:
	 * - Checking if the cached message still exists and hasn't expired (older than 1 day). If not available or expired, the message will be ignored.
	 * - Verifying if the uploaded file matches the expected MIME type based on the cached message. If it doesn't match, the message will be ignored.
	 * - Resolving the Telegram link for the uploaded file.
	 * - Updating the cached message by adding the Telegram file link to an array.
	 */
	validateDocumentMessageMedia,
	/**
	 * Middleware to handle document messages.
	 * - Reply document messages with an inline keyboard button to allow users select a tool.
	 */
	handleDocumentMessage
};
