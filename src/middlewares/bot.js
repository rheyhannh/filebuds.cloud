import config from '../config/global.js';
import * as _TaskQueue from '../queues/task.js';
import * as _SupabaseService from '../services/supabase.js';
import * as _BotUtils from '../utils/bot.js';
import * as Telegraf from 'telegraf'; // eslint-disable-line
import * as TelegrafTypes from 'telegraf/types'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line
import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line
import * as TaskQueueTypes from '../queues/task.js'; // eslint-disable-line

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
 * @property {TelegramBotTypes.FileTypeEnum | undefined} fileType
 * File type, only available on `task_init` callback query type.
 * @property {TaskQueueTypes.TaskJobPayload['fileLink'] | undefined} fileLink
 * Public file URL(s) string to be processed, only available on `task_init` callback query type.
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

const TaskQueue = _TaskQueue.default;
const SupabaseService = _SupabaseService.default;
const BotUtils = _BotUtils.default;

const initCallbackQueryState =
	/** @type {Telegraf.MiddlewareFn<Telegraf.Context<TelegrafTypes.Update.CallbackQueryUpdate>>>} */ (
		async (ctx, next) => {
			try {
				const {
					jid,
					task: tool,
					type: fileType
				} = /** @type {{jid:string | undefined, task:ILoveApiTypes.ToolEnum | undefined, type:TelegramBotTypes.FileTypeEnum | undefined}} */ (
					JSON.parse(ctx.callbackQuery.data)
				);

				if (jid) {
					ctx.state = {
						type: 'job_track',
						tg_user_id: ctx.chat.id,
						message_id: ctx.msgId,
						jobId: jid,
						response: {}
					};

					await next();
					return;
				}

				if (tool && fileType) {
					ctx.state = {
						type: 'task_init',
						tg_user_id: ctx.chat.id,
						message_id: ctx.msgId,
						tool,
						fileType,
						response: {}
					};

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
			const { type, fileType } = /** @type {CallbackQueryStateProps} */ (
				ctx.state
			);

			if (type === 'job_track') {
				// No need to validate media for job track queries
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
			const { type, tg_user_id, message_id, jobId, tool, fileType, fileLink } =
				/** @type {CallbackQueryStateProps} */ (ctx.state);

			if (type === 'job_track') {
				try {
					let replyMsg;
					const jobLog = await SupabaseService.getJobLog({
						job_id: jobId,
						tg_user_id
					});

					if (Array.isArray(jobLog) && jobLog.length) {
						replyMsg = BotUtils.generateJobTrackingMessage(jobLog[0]);
						await ctx.editMessageText(replyMsg.text, replyMsg.extra);
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
						toolOptions: {},
						fileType,
						fileLink
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
				const { file_id, file_size } = photos[photos.length - 1];

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

				ctx.state = {
					fileId: file_id
				};

				await next();
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
					`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
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
				const { file_id, file_size, mime_type } = ctx.message.document;

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

				ctx.state = {
					fileId: file_id,
					isImage,
					isPdf
				};

				await next();
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
						inline_keyboard: [
							[
								{
									text: 'Compress 📦 (10)',
									callback_data: BotUtils.generateCallbackData(
										'pdf',
										'compress'
									)
								}
							]
						]
					}
				});
				return;
			}
		}
	);

export default {
	/**
	 * Middleware to init callback query states.
	 * - Rejects unknown callback query types.
	 * - Stores {@link CallbackQueryStateProps states} on `ctx.state` to be used in next chained middleware.
	 */
	initCallbackQueryState,
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
	 */
	validateDocumentMessageMedia,
	/**
	 * Middleware to handle document messages.
	 * - Reply document messages with an inline keyboard button to allow users select a tool.
	 */
	handleDocumentMessage
};
