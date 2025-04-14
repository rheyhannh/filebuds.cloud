import { describe, it } from 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import * as _SupabaseService from '../../src/services/supabase.js';
import * as _TaskQueue from '../../src/queues/task.js';
import * as _BotMiddleware from '../../src/middlewares/bot.js';
import * as _BotUtil from '../../src/utils/bot.js';
import * as Telegraf from 'telegraf'; // eslint-disable-line
import * as TelegrafTypes from 'telegraf/types'; // eslint-disable-line
import * as SupabaseTypes from '../../src/schemas/supabase.js'; // eslint-disable-line

const BotMiddleware = _BotMiddleware.default;
const BotUtil = _BotUtil.default;
const SupabaseService = _SupabaseService.default;
const TaskQueue = _TaskQueue.default;

/**
 * @typedef {_BotMiddleware.CallbackQueryStateProps & _BotMiddleware.PhotoMessageStateProps & _BotMiddleware.DocumentMessageStateProps} ContextStateProps
 */

describe('[Integration] Telegram Bot Middlewares', () => {
	let ctx =
		/** @type {Omit<Telegraf.Context<TelegrafTypes.Update>, 'state'> & {state: ContextStateProps}} */ (
			undefined
		);
	let next = /** @type {{handler:() => Promise<void>}} */ (undefined);

	let nextSpy = /** @type {import('sinon').SinonSpy<typeof next.handler>} */ (
		undefined
	);
	let answerCbQuerySpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.answerCbQuery>} */ (
			undefined
		);
	let deleteMessageSpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.deleteMessage>} */ (
			undefined
		);
	let editMessageTextSpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.editMessageText>} */ (
			undefined
		);
	let replySpy = /** @type {import('sinon').SinonSpy<typeof ctx.reply>} */ (
		undefined
	);
	let replyWithPhotoSpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.replyWithPhoto>} */ (
			undefined
		);
	let replyWithDocumentSpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.replyWithDocument>} */ (
			undefined
		);
	let getFileLinkSpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.telegram.getFileLink>} */ (
			undefined
		);

	beforeEach(() => {
		ctx = {
			answerCbQuery: async () => {},
			deleteMessage: async () => {},
			editMessageText: async () => {},
			reply: async () => {},
			replyWithPhoto: async () => {},
			replyWithDocument: async () => {},
			telegram: {
				getFileLink: async () => {}
			}
		};

		next = {
			handler: async () => {}
		};

		answerCbQuerySpy = sinon.spy(ctx, 'answerCbQuery');
		deleteMessageSpy = sinon.spy(ctx, 'deleteMessage');
		editMessageTextSpy = sinon.spy(ctx, 'editMessageText');
		replySpy = sinon.spy(ctx, 'reply');
		replyWithPhotoSpy = sinon.spy(ctx, 'replyWithPhoto');
		replyWithDocumentSpy = sinon.spy(ctx, 'replyWithDocument');
		getFileLinkSpy = sinon.spy(ctx.telegram, 'getFileLink');
		nextSpy = sinon.spy(next, 'handler');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('initCallbackQueryState()', () => {
		it('should handle the error if callback query data are not provided', async () => {
			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'Filebuds engga bisa memproses permintaanmu. Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
					{
						show_alert: true,
						cache_time: 10
					}
				)
			).to.be.true;
		});

		it('should handle the error if callback query data are not string', async () => {
			const setup = [
				{ data: [] },
				{ data: null },
				{ data: undefined },
				{ data: 123 },
				{ data: {} }
			];

			for (const x of setup) {
				ctx.callbackQuery = x;

				await BotMiddleware.initCallbackQueryState(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu. Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle the error if callback query types are not recognized', async () => {
			const setup = [
				{ data: JSON.stringify({ foo: 'bar' }) },
				{ data: JSON.stringify({ type: 'image' }) },
				{ data: JSON.stringify({ task: 'upscaleimage' }) }
			];

			for (const x of setup) {
				ctx.callbackQuery = x;

				await BotMiddleware.initCallbackQueryState(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu. Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle the error if chat.id are not provided on context', async () => {
			const setup = [
				{
					data: JSON.stringify({
						jid: '59a30b5bd956191b5f174534ac9e171c3c84daf7'
					})
				},
				{ data: JSON.stringify({ task: 'upscaleimage', type: 'image' }) }
			];

			for (const x of setup) {
				ctx.callbackQuery = x;

				await BotMiddleware.initCallbackQueryState(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu. Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle job_track callback query', async () => {
			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 256;
			ctx.callbackQuery = {
				data: JSON.stringify({
					jid: '59a30b5bd956191b5f174534ac9e171c3c84daf7'
				})
			};

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(ctx.state).to.be.deep.equal({
				type: 'job_track',
				tg_user_id: ctx.chat.id,
				message_id: ctx.msgId,
				jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
				response: {}
			});
			expect(nextSpy.calledOnce).to.be.true;
		});

		it('should handle task_init callback query', async () => {
			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 256;
			ctx.callbackQuery = {
				data: JSON.stringify({ task: 'upscaleimage', type: 'image' })
			};

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(ctx.state).to.be.deep.equal({
				type: 'task_init',
				tg_user_id: ctx.chat.id,
				message_id: ctx.msgId,
				tool: 'upscaleimage',
				fileType: 'image',
				response: {}
			});
			expect(nextSpy.calledOnce).to.be.true;
		});
	});

	describe('validateCallbackQueryExpiry()', () => {
		it('should handle the error if callback query message date are not provided', async () => {
			const setup = [
				{
					type: 'job_track',
					tg_user_id: 185150,
					message_id: 211,
					jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
					response: {}
				},
				{
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: 'upscaleimage',
					fileType: 'image',
					response: {}
				}
			];

			for (const x of setup) {
				ctx.state = x;

				await BotMiddleware.validateCallbackQueryExpiry(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, ${x.type === 'job_track' ? 'resimu gagal diperbarui' : 'kamu perlu mengirim ulang file yang ingin diproses'}😔`,
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should gracefully ignore the error from deleteMessage() when message date less than 45 hours', async () => {
			const setup = [
				{
					type: 'job_track',
					tg_user_id: 185150,
					message_id: 211,
					jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
					response: {}
				},
				{
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: 'upscaleimage',
					fileType: 'image',
					response: {}
				}
			];

			deleteMessageSpy.restore();
			deleteMessageSpy = sinon
				.stub(ctx, 'deleteMessage')
				.rejects(new Error('Simulating Error'));

			for (const x of setup) {
				ctx.state = x;
				ctx.callbackQuery = {
					message: {
						date: Math.floor(Date.now() / 1000) - 86460, // 86460: 24 hours 1 minute
						message_id: x.message_id
					}
				};

				await BotMiddleware.validateCallbackQueryExpiry(ctx, next.handler);

				// Expect to Delete Message
				expect(deleteMessageSpy.calledOnce).to.be.true;
				// Expect to Rejects Callback Query
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔',
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;

				deleteMessageSpy.resetHistory();
				answerCbQuerySpy.resetHistory();
			}
		});

		it('should rejects callback query and delete message when message date less than 45 hours', async () => {
			const setup = [
				{
					type: 'job_track',
					tg_user_id: 185150,
					message_id: 211,
					jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
					response: {}
				},
				{
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: 'upscaleimage',
					fileType: 'image',
					response: {}
				}
			];

			for (const x of setup) {
				ctx.state = x;
				ctx.callbackQuery = {
					message: {
						date: Math.floor(Date.now() / 1000) - 86460, // 86460: 24 hours 1 minute
						message_id: x.message_id
					}
				};

				await BotMiddleware.validateCallbackQueryExpiry(ctx, next.handler);

				// Expect to Rejects Callback Query
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔',
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;
				// Expect to Delete Message
				expect(deleteMessageSpy.calledOnce).to.be.true;

				answerCbQuerySpy.resetHistory();
				deleteMessageSpy.resetHistory();
			}
		});

		it('should only rejects callback query when message date more than 45 hours', async () => {
			const setup = [
				{
					type: 'job_track',
					tg_user_id: 185150,
					message_id: 211,
					jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
					response: {}
				},
				{
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: 'upscaleimage',
					fileType: 'image',
					response: {}
				}
			];

			for (const x of setup) {
				ctx.state = x;
				ctx.callbackQuery = {
					message: {
						date: Math.floor(Date.now() / 1000) - 162060, // 162060: 45 hours 1 minute
						message_id: x.message_id
					}
				};

				await BotMiddleware.validateCallbackQueryExpiry(ctx, next.handler);

				// Expect to Rejects Callback Query
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔',
						{
							show_alert: true,
							cache_time: 10
						}
					)
				).to.be.true;
				// Expect to Not Delete Message
				expect(deleteMessageSpy.calledOnceWithExactly(x.message_id)).to.be
					.false;

				answerCbQuerySpy.resetHistory();
				deleteMessageSpy.resetHistory();
			}
		});

		it('should handle callback query when message date less than 24 hours', async () => {
			const setup = [
				{
					type: 'job_track',
					tg_user_id: 185150,
					message_id: 211,
					jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
					response: {}
				},
				{
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: 'upscaleimage',
					fileType: 'image',
					response: {}
				}
			];

			for (const x of setup) {
				ctx.state = x;
				ctx.callbackQuery = {
					message: {
						date: Math.floor(Date.now() / 1000) - 86340, // 86340: 23 hours 59 minute
						message_id: x.message_id
					}
				};

				await BotMiddleware.validateCallbackQueryExpiry(ctx, next.handler);

				// Expect to assign 'isMessageDeleteable' state
				expect(ctx.state.isMessageDeleteable).to.be.true;
				// Expect to call next chained middleware
				expect(nextSpy.calledOnce).to.be.true;

				nextSpy.resetHistory();
			}
		});
	});

	describe('validateCallbackQueryMedia()', () => {
		it('should immediately call next chained middleware when callback query are job tracking', async () => {
			ctx.state = {
				type: 'job_track',
				tg_user_id: 185150,
				message_id: 211,
				jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
				response: {}
			};

			await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

			expect(nextSpy.calledOnce).to.be.true;
		});

		it('should handle the error if file_size are not provided', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [{}]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: null
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [{}]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: null
							}
						}
					}
				}
			];

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`,
						{ show_alert: true, cache_time: 10 }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle the error if file_size are not an number', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: {}
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: {}
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: {}
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: '123215'
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: '21311'
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: '325152'
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: []
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: []
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: []
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: true
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: false
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: true
							}
						}
					}
				}
			];

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`,
						{ show_alert: true, cache_time: 10 }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle the error if file_size more than 10MB', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 65321123
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: 12485555
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 10485761
							}
						}
					}
				}
			];

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(ctx.state.response.message).to.be.equal(
					'Filebuds engga bisa memproses permintaanmu karena ukuran file ini lebih dari 10MB⛔'
				);
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Filebuds engga bisa memproses permintaanmu karena ukuran file ini lebih dari 10MB⛔',
						{ show_alert: true, cache_time: 10 }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle the error if checkFileSize() throw an Error', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 4322125
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: 624555
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 10485759
							}
						}
					}
				}
			];

			let checkFileSizeStub = sinon
				.stub(BotUtil, 'checkFileSize')
				.throws(new Error('Simulating Error'));

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(checkFileSizeStub.calledOnce).to.be.true;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`,
						{ show_alert: true, cache_time: 10 }
					)
				).to.be.true;

				checkFileSizeStub.resetHistory();
				answerCbQuerySpy.resetHistory();
			}

			checkFileSizeStub.restore();
		});

		it('should handle the error if file_id are not provided', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 4322125
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: 624555
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 10485759
							}
						}
					}
				}
			];

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`,
						{ show_alert: true, cache_time: 10 }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		it('should handle the error if telegram.getFileLink() throw an Error', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 4322125,
								file_id: '67a8688c27342477fa6ae2d23db90803a05e153d'
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: 624555,
									file_id: 'f6fb65073f0d964330a890357450ff49b142da34'
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 10485759,
								file_id: '1b7ea16a841887127ec4252a8ab1bdb1c33c655b'
							}
						}
					}
				}
			];

			getFileLinkSpy.restore();
			getFileLinkSpy = sinon
				.stub(ctx.telegram, 'getFileLink')
				.rejects(new Error('Simulating Error'));

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(getFileLinkSpy.calledOnce).to.be.true;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`,
						{ show_alert: true, cache_time: 10 }
					)
				).to.be.true;

				getFileLinkSpy.resetHistory();
				answerCbQuerySpy.resetHistory();
			}

			getFileLinkSpy.restore();
		});

		it('should handle callback query when media are valid', async () => {
			const setup = [
				{
					state: {
						type: 'task_init',
						tg_user_id: 185150,
						message_id: 211,
						tool: 'upscaleimage',
						fileType: 'doc/image',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 4322125,
								file_id: '67a8688c27342477fa6ae2d23db90803a05e153d'
							}
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 195150,
						message_id: 123,
						tool: 'removebackgroundimage',
						fileType: 'image',
						response: {}
					},
					callbackQuery: {
						message: {
							photo: [
								{
									file_size: 624555,
									file_id: 'f6fb65073f0d964330a890357450ff49b142da34'
								}
							]
						}
					}
				},
				{
					state: {
						type: 'task_init',
						tg_user_id: 155150,
						message_id: 62,
						tool: 'compresspdf',
						fileType: 'pdf',
						response: {}
					},
					callbackQuery: {
						message: {
							document: {
								file_size: 10485759,
								file_id: '1b7ea16a841887127ec4252a8ab1bdb1c33c655b'
							}
						}
					}
				}
			];

			getFileLinkSpy.restore();
			getFileLinkSpy = sinon
				.stub(ctx.telegram, 'getFileLink')
				.resolves('https://api.mocked.org/media/files.jpg');

			for (const x of setup) {
				ctx.state = x.state;
				ctx.callbackQuery = x.callbackQuery;

				await BotMiddleware.validateCallbackQueryMedia(ctx, next.handler);

				expect(getFileLinkSpy.calledOnce).to.be.true;
				expect(ctx.state.fileLink).to.be.equal(
					'https://api.mocked.org/media/files.jpg'
				);
				expect(nextSpy.calledOnce).to.be.true;

				getFileLinkSpy.resetHistory();
				nextSpy.resetHistory();
			}

			getFileLinkSpy.restore();
		});
	});

	describe('handleCallbackQuery()', () => {
		describe('job_track', () => {
			const state = {
				type: 'job_track',
				tg_user_id: 185150,
				message_id: 211,
				jobId: '59a30b5bd956191b5f174534ac9e171c3c84daf7',
				response: {}
			};

			let addTaskJobSpy =
				/** @type {import('sinon').SinonSpy<typeof TaskQueue.addTaskJob>} */ (
					undefined
				);

			beforeEach(() => {
				ctx.state = state;
				addTaskJobSpy = sinon.spy(TaskQueue, 'addTaskJob');
			});

			afterEach(() => {
				addTaskJobSpy.resetHistory();
			});

			after(() => {
				addTaskJobSpy.restore();
			});

			it('should handle the error when getJobLog throw an Error', async () => {
				let getJobLogStub = sinon
					.stub(SupabaseService, 'getJobLog')
					.rejects(new Error('Simulating Error'));

				await BotMiddleware.handleCallbackQuery(ctx);

				// Expect to not add any job by calling addTaskJob()
				expect(addTaskJobSpy.notCalled).to.be.true;
				expect(
					getJobLogStub.calledWithExactly({
						job_id: ctx.state.jobId,
						tg_user_id: ctx.state.tg_user_id
					})
				).to.be.true;
				expect(
					answerCbQuerySpy.calledWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Resimu gagal diperbarui, silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				getJobLogStub.restore();
			});

			it('should handle when getJobLog return undefined or an empty array', async () => {
				const setup = [undefined, []];

				for (const x of setup) {
					let getJobLogStub = sinon
						.stub(SupabaseService, 'getJobLog')
						.resolves(x);

					await BotMiddleware.handleCallbackQuery(ctx);

					// Expect to not add any job by calling addTaskJob()
					expect(addTaskJobSpy.notCalled).to.be.true;
					expect(
						getJobLogStub.calledWithExactly({
							job_id: ctx.state.jobId,
							tg_user_id: ctx.state.tg_user_id
						})
					).to.be.true;
					expect(
						answerCbQuerySpy.calledWithExactly('Resimu berhasil diperbarui✅')
					).to.be.true;

					addTaskJobSpy.resetHistory();
					getJobLogStub.restore();
				}
			});

			it('should update job tracking message when getJobLog return valid values', async () => {
				const setup =
					/** @type {Array<{jobLogs:Array<SupabaseTypes.JobLogEntry>, generated:ReturnType<typeof BotUtil.generateJobTrackingMessage>}>} */ ([
						{
							jobLogs: [
								{
									job_id: '66305678bf5810e1df83a66d0422da394c361450',
									tool: 'removebackgroundimage',
									task_worker_state: 'failed',
									downloader_worker_state: 'completed'
								}
							],
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 66305678bf5810e1df83a66d0422da394c361450` +
									`\nTipe: removebackgroundimage` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						},
						{
							jobLogs: [
								{
									job_id: '5c50a19837e911ab699ba45ccf61da3846dd2278',
									tool: 'upscaleimage',
									task_worker_state: 'completed',
									downloader_worker_state: 'failed'
								}
							],
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 5c50a19837e911ab699ba45ccf61da3846dd2278` +
									`\nTipe: upscaleimage` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						},
						{
							jobLogs: [
								{
									job_id: '2ecb1e8ada27fabafe97f6454b39813550f6bd7f',
									tool: 'removebackgroundimage',
									task_worker_state: 'failed'
								}
							],
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 2ecb1e8ada27fabafe97f6454b39813550f6bd7f` +
									`\nTipe: removebackgroundimage` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						},
						{
							jobLogs: [
								{
									job_id: '13e2ed344a00edb95ba483b5de0e6bb1a4c27d04',
									tool: 'convertimage',
									downloader_worker_state: 'failed'
								}
							],
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 13e2ed344a00edb95ba483b5de0e6bb1a4c27d04` +
									`\nTipe: convertimage` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						},
						{
							jobLogs: [
								{
									job_id: '4a567076b362a48eb57561a9f1759101b447e94a',
									tool: 'upscaleimage',
									task_worker_state: 'completed'
								}
							],
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 4a567076b362a48eb57561a9f1759101b447e94a` +
									`\nTipe: upscaleimage` +
									`\nStatus (3/4): Segera Dikirim🚚` +
									`\nKeterangan: Permintaanmu telah diproses, hasilnya akan segera dikirim ke chat ini.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: '4a567076b362a48eb57561a9f1759101b447e94a'
													})
												}
											]
										]
									}
								}
							}
						},
						{
							jobLogs: [
								{
									job_id: '3a7425e145ae636601417f26aac9e6e230167e9e',
									tool: 'convertimage',
									task_worker_state: 'completed',
									downloader_worker_state: 'completed'
								}
							],
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 3a7425e145ae636601417f26aac9e6e230167e9e` +
									`\nTipe: convertimage` +
									`\nStatus (4/4): Selesai✅` +
									`\nKeterangan: Yeay! Permintaanmu telah berhasil diselesaikan. Terima kasih telah menggunakan Filebuds🚀`,
								extra: {}
							}
						}
					]);

				for (const x of setup) {
					let getJobLogStub = sinon
						.stub(SupabaseService, 'getJobLog')
						.resolves(x.jobLogs);

					let generateJobTrackingMessageSpy = sinon.spy(
						BotUtil,
						'generateJobTrackingMessage'
					);

					await BotMiddleware.handleCallbackQuery(ctx);

					// Expect to not add any job by calling addTaskJob()
					expect(addTaskJobSpy.notCalled).to.be.true;
					expect(
						getJobLogStub.calledWithExactly({
							job_id: ctx.state.jobId,
							tg_user_id: ctx.state.tg_user_id
						})
					).to.be.true;
					expect(generateJobTrackingMessageSpy.calledWithExactly(x.jobLogs[0]))
						.to.be.true;
					expect(
						editMessageTextSpy.calledWithExactly(
							x.generated.text,
							x.generated.extra
						)
					).to.be.true;
					expect(
						answerCbQuerySpy.calledWithExactly('Resimu berhasil diperbarui✅')
					).to.be.true;

					addTaskJobSpy.resetHistory();
					getJobLogStub.restore();
					generateJobTrackingMessageSpy.restore();
					editMessageTextSpy.resetHistory();
				}
			});
		});

		describe('task_init', () => {
			let getJobLogSpy =
				/** @type {import('sinon').SinonSpy<typeof SupabaseService.getJobLog>} */ (
					undefined
				);

			before(() => {
				getJobLogSpy = sinon.spy(SupabaseService, 'getJobLog');
			});

			afterEach(() => {
				getJobLogSpy.resetHistory();
			});

			after(() => {
				getJobLogSpy.restore();
			});

			it('should handle the error when addTaskJob throw an Error', async () => {
				let addTaskJobStub = sinon
					.stub(TaskQueue, 'addTaskJob')
					.rejects(new Error('Simulating Error'));

				ctx.state = {
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: 'upscaleimage',
					fileType: 'doc/image',
					fileLink: 'https://api.mocked.org/media/files.jpg',
					response: {}
				};

				await BotMiddleware.handleCallbackQuery(ctx);

				// Expect to not track job log by calling getJobLog()
				expect(getJobLogSpy.notCalled).to.be.true;
				expect(
					addTaskJobStub.calledWithExactly({
						telegramUserId: ctx.state.tg_user_id,
						messageId: ctx.state.message_id,
						tool: ctx.state.tool,
						toolOptions: {},
						fileType: ctx.state.fileType,
						fileLink: ctx.state.fileLink
					})
				).to.be.true;
				expect(
					answerCbQuerySpy.calledWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Permintaanmu gagal diproses, silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				addTaskJobStub.restore();
			});

			it('should handle unsuccessful task initialization', async () => {
				const setup =
					/** @type {Array<{state:_BotMiddleware.CallbackQueryStateProps, generated:ReturnType<typeof BotUtil.generateJobTrackingMessage>}>} */ ([
						{
							state: {
								type: 'task_init',
								tg_user_id: 185150,
								message_id: 211,
								tool: 'upscaleimage',
								fileType: 'doc/image',
								fileLink: 'https://api.mocked.org/document/lorem.jpg',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: -` +
									`\nTipe: upscaleimage` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						},
						{
							state: {
								type: 'task_init',
								tg_user_id: 155150,
								message_id: 231,
								tool: 'removebackgroundimage',
								fileType: 'image',
								fileLink: 'https://api.mocked.org/media/ipsum.png',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: -` +
									`\nTipe: removebackgroundimage` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						},
						{
							state: {
								type: 'task_init',
								tg_user_id: 125150,
								message_id: 962,
								tool: 'compresspdf',
								fileType: 'pdf',
								fileLink: 'https://api.mocked.org/document/dolor.pdf',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: -` +
									`\nTipe: compresspdf` +
									`\nStatus (-1): Gagal❌` +
									`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
								extra: {}
							}
						}
					]);

				let addTaskJobStub = sinon
					.stub(TaskQueue, 'addTaskJob')
					.resolves({ ok: false });

				let generateJobTrackingMessageSpy = sinon.spy(
					BotUtil,
					'generateJobTrackingMessage'
				);

				for (const x of setup) {
					ctx.state = x.state;

					await BotMiddleware.handleCallbackQuery(ctx);

					// Expect to not track job log by calling getJobLog()
					expect(getJobLogSpy.notCalled).to.be.true;
					expect(
						addTaskJobStub.calledWithExactly({
							telegramUserId: ctx.state.tg_user_id,
							messageId: ctx.state.message_id,
							tool: ctx.state.tool,
							toolOptions: {},
							fileType: ctx.state.fileType,
							fileLink: ctx.state.fileLink
						})
					).to.be.true;
					expect(
						generateJobTrackingMessageSpy.calledWithExactly(
							null,
							'-',
							ctx.state.tool
						)
					).to.be.true;
					expect(
						replySpy.calledWithExactly(x.generated.text, x.generated.extra)
					).to.be.true;

					getJobLogSpy.resetHistory();
					addTaskJobStub.resetHistory();
					generateJobTrackingMessageSpy.resetHistory();
					replySpy.resetHistory();
				}

				addTaskJobStub.restore();
				generateJobTrackingMessageSpy.restore();
			});

			it('should handle successful task initialization when isWaiting are true', async () => {
				const setup =
					/** @type {Array<{state:_BotMiddleware.CallbackQueryStateProps, generated:ReturnType<typeof BotUtil.generateJobTrackingMessage>}>} */ ([
						{
							state: {
								type: 'task_init',
								tg_user_id: 185150,
								message_id: 211,
								tool: 'upscaleimage',
								fileType: 'doc/image',
								fileLink: 'https://api.mocked.org/document/lorem.jpg',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: d5f8817abf1140344742a16ed12ba197d1eed4b1` +
									`\nTipe: upscaleimage` +
									`\nStatus (1/4): Antrian⏳` +
									`\nKeterangan: Server Filebuds sedang sibuk, permintaanmu masuk dalam antrian. Proses ini mungkin akan memakan waktu lebih lama dari biasanya.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: 'd5f8817abf1140344742a16ed12ba197d1eed4b1'
													})
												}
											]
										]
									}
								}
							}
						},
						{
							state: {
								type: 'task_init',
								tg_user_id: 155150,
								message_id: 231,
								tool: 'removebackgroundimage',
								fileType: 'image',
								fileLink: 'https://api.mocked.org/media/ipsum.png',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: d5f8817abf1140344742a16ed12ba197d1eed4b1` +
									`\nTipe: removebackgroundimage` +
									`\nStatus (1/4): Antrian⏳` +
									`\nKeterangan: Server Filebuds sedang sibuk, permintaanmu masuk dalam antrian. Proses ini mungkin akan memakan waktu lebih lama dari biasanya.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: 'd5f8817abf1140344742a16ed12ba197d1eed4b1'
													})
												}
											]
										]
									}
								}
							}
						},
						{
							state: {
								type: 'task_init',
								tg_user_id: 125150,
								message_id: 962,
								tool: 'compresspdf',
								fileType: 'pdf',
								fileLink: 'https://api.mocked.org/document/dolor.pdf',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: d5f8817abf1140344742a16ed12ba197d1eed4b1` +
									`\nTipe: compresspdf` +
									`\nStatus (1/4): Antrian⏳` +
									`\nKeterangan: Server Filebuds sedang sibuk, permintaanmu masuk dalam antrian. Proses ini mungkin akan memakan waktu lebih lama dari biasanya.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: 'd5f8817abf1140344742a16ed12ba197d1eed4b1'
													})
												}
											]
										]
									}
								}
							}
						}
					]);

				let addTaskJobStub = sinon.stub(TaskQueue, 'addTaskJob').resolves({
					ok: true,
					isWaiting: true,
					jid: 'd5f8817abf1140344742a16ed12ba197d1eed4b1'
				});

				let generateJobTrackingMessageSpy = sinon.spy(
					BotUtil,
					'generateJobTrackingMessage'
				);

				for (const x of setup) {
					ctx.state = x.state;

					await BotMiddleware.handleCallbackQuery(ctx);

					// Expect to not track job log by calling getJobLog()
					expect(getJobLogSpy.notCalled).to.be.true;
					expect(
						addTaskJobStub.calledWithExactly({
							telegramUserId: ctx.state.tg_user_id,
							messageId: ctx.state.message_id,
							tool: ctx.state.tool,
							toolOptions: {},
							fileType: ctx.state.fileType,
							fileLink: ctx.state.fileLink
						})
					).to.be.true;
					expect(
						generateJobTrackingMessageSpy.calledWithExactly(
							null,
							'd5f8817abf1140344742a16ed12ba197d1eed4b1',
							ctx.state.tool,
							'1',
							true,
							true
						)
					).to.be.true;
					expect(
						replySpy.calledWithExactly(x.generated.text, x.generated.extra)
					).to.be.true;

					getJobLogSpy.resetHistory();
					addTaskJobStub.resetHistory();
					generateJobTrackingMessageSpy.resetHistory();
					replySpy.resetHistory();
				}

				addTaskJobStub.restore();
				generateJobTrackingMessageSpy.restore();
			});

			it('should handle successful task initialization when isWaiting are false', async () => {
				const setup =
					/** @type {Array<{state:_BotMiddleware.CallbackQueryStateProps, generated:ReturnType<typeof BotUtil.generateJobTrackingMessage>}>} */ ([
						{
							state: {
								type: 'task_init',
								tg_user_id: 185150,
								message_id: 211,
								tool: 'upscaleimage',
								fileType: 'doc/image',
								fileLink: 'https://api.mocked.org/document/lorem.jpg',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 3ca29fdcf629c9add724a3245a9d38374ec70ecf` +
									`\nTipe: upscaleimage` +
									`\nStatus (2/4): Sedang Diproses⚡` +
									`\nKeterangan: Permintaanmu sedang dalam tahap pemrosesan.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: '3ca29fdcf629c9add724a3245a9d38374ec70ecf'
													})
												}
											]
										]
									}
								}
							}
						},
						{
							state: {
								type: 'task_init',
								tg_user_id: 155150,
								message_id: 231,
								tool: 'removebackgroundimage',
								fileType: 'image',
								fileLink: 'https://api.mocked.org/media/ipsum.png',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 3ca29fdcf629c9add724a3245a9d38374ec70ecf` +
									`\nTipe: removebackgroundimage` +
									`\nStatus (2/4): Sedang Diproses⚡` +
									`\nKeterangan: Permintaanmu sedang dalam tahap pemrosesan.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: '3ca29fdcf629c9add724a3245a9d38374ec70ecf'
													})
												}
											]
										]
									}
								}
							}
						},
						{
							state: {
								type: 'task_init',
								tg_user_id: 125150,
								message_id: 962,
								tool: 'compresspdf',
								fileType: 'pdf',
								fileLink: 'https://api.mocked.org/document/dolor.pdf',
								response: {}
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 3ca29fdcf629c9add724a3245a9d38374ec70ecf` +
									`\nTipe: compresspdf` +
									`\nStatus (2/4): Sedang Diproses⚡` +
									`\nKeterangan: Permintaanmu sedang dalam tahap pemrosesan.` +
									`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
								extra: {
									reply_markup: {
										inline_keyboard: [
											[
												{
													text: 'Perbarui Resi 🔄',
													callback_data: JSON.stringify({
														jid: '3ca29fdcf629c9add724a3245a9d38374ec70ecf'
													})
												}
											]
										]
									}
								}
							}
						}
					]);

				let addTaskJobStub = sinon.stub(TaskQueue, 'addTaskJob').resolves({
					ok: true,
					isWaiting: false,
					jid: '3ca29fdcf629c9add724a3245a9d38374ec70ecf'
				});

				let generateJobTrackingMessageSpy = sinon.spy(
					BotUtil,
					'generateJobTrackingMessage'
				);

				for (const x of setup) {
					ctx.state = x.state;

					await BotMiddleware.handleCallbackQuery(ctx);

					// Expect to not track job log by calling getJobLog()
					expect(getJobLogSpy.notCalled).to.be.true;
					expect(
						addTaskJobStub.calledWithExactly({
							telegramUserId: ctx.state.tg_user_id,
							messageId: ctx.state.message_id,
							tool: ctx.state.tool,
							toolOptions: {},
							fileType: ctx.state.fileType,
							fileLink: ctx.state.fileLink
						})
					).to.be.true;
					expect(
						generateJobTrackingMessageSpy.calledWithExactly(
							null,
							'3ca29fdcf629c9add724a3245a9d38374ec70ecf',
							ctx.state.tool,
							'2',
							true,
							true
						)
					).to.be.true;
					expect(
						replySpy.calledWithExactly(x.generated.text, x.generated.extra)
					).to.be.true;

					getJobLogSpy.resetHistory();
					addTaskJobStub.resetHistory();
					generateJobTrackingMessageSpy.resetHistory();
					replySpy.resetHistory();
				}

				addTaskJobStub.restore();
				generateJobTrackingMessageSpy.restore();
			});
		});
	});

	describe('validatePhotoMessageMedia()', () => {
		it('should handle the error if file_size are not provided', async () => {
			const setup = [
				{ photo: [{ file_id: 'lorem', file_size: undefined }] },
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425 },
						{ file_id: 'dolor', file_size: 3267323 },
						{ file_id: 'sit', file_size: null }
					]
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241 },
						{ file_id: 'consectetur' }
					]
				}
			];

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(
					replySpy.calledWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
					)
				).to.be.true;

				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle the error if file_size are not an number', async () => {
			const setup = [
				{ photo: [{ file_id: 'lorem', file_size: '923152' }] },
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425 },
						{ file_id: 'dolor', file_size: 3267323 },
						{ file_id: 'sit', file_size: {} }
					]
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241 },
						{ file_id: 'consectetur', file_size: [] }
					]
				},
				{ photo: [{ file_id: 'lorem', file_size: true }] }
			];

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(
					replySpy.calledWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
					)
				).to.be.true;

				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle the error if file_size more than 5MB', async () => {
			const setup = [
				{ photo: [{ file_id: 'lorem', file_size: 10444321 }] },
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425 },
						{ file_id: 'dolor', file_size: 3267323 },
						{ file_id: 'sit', file_size: 15435365 }
					]
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241 },
						{ file_id: 'consectetur', file_size: 7245321 }
					]
				},
				{ photo: [{ file_id: 'lorem', file_size: 5242881 }] }
			];

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				expect(ctx.state.response.message).to.be.equal(
					'Filebuds engga bisa menerima gambar yang kamu kirim karena ukurannya lebih dari 5MB⛔'
				);
				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(replySpy.calledWithExactly(ctx.state.response.message)).to.be
					.true;

				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle the error if checkFileSize() throw an Error', async () => {
			const setup = [
				{ photo: [{ file_id: 'lorem', file_size: 10444321 }] },
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425 },
						{ file_id: 'dolor', file_size: 3267323 },
						{ file_id: 'sit', file_size: 15435365 }
					]
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241 },
						{ file_id: 'consectetur', file_size: 7245321 }
					]
				},
				{ photo: [{ file_id: 'lorem', file_size: 5242881 }] }
			];

			let checkFileSizeStub = sinon
				.stub(BotUtil, 'checkFileSize')
				.throws(new Error('Simulating Error'));

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				expect(checkFileSizeStub.calledOnce).to.be.true;
				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(
					replySpy.calledWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
					)
				).to.be.true;

				checkFileSizeStub.resetHistory();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}

			checkFileSizeStub.restore();
		});

		it('should gracefully ignore the error from deleteMessage() when error occurs', async () => {
			deleteMessageSpy.restore();
			deleteMessageSpy = sinon
				.stub(ctx, 'deleteMessage')
				.rejects(new Error('Simulating Error'));

			await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

			expect(deleteMessageSpy.calledOnce).to.be.true;
			expect(
				replySpy.calledWithExactly(
					`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
				)
			).to.be.true;

			deleteMessageSpy.restore();
		});

		it('should handle the messages when media are valid', async () => {
			const setup = [
				{ photo: [{ file_id: 'lorem', file_size: 4444321 }] },
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425 },
						{ file_id: 'dolor', file_size: 3267323 },
						{ file_id: 'sit', file_size: 2435365 }
					]
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241 },
						{ file_id: 'consectetur', file_size: 245321 }
					]
				},
				{ photo: [{ file_id: 'lorem', file_size: 5242880 }] }
			];

			let checkFileSizeSpy = sinon.spy(BotUtil, 'checkFileSize');

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				expect(checkFileSizeSpy.calledOnce).to.be.true;
				expect(checkFileSizeSpy.firstCall.returnValue).to.be.true;
				expect(ctx.state.fileId).to.be.equal(
					x.photo[x.photo.length - 1].file_id
				);
				expect(nextSpy.calledOnce).to.be.true;

				checkFileSizeSpy.resetHistory();
				nextSpy.resetHistory();
			}

			checkFileSizeSpy.restore();
		});
	});

	describe('handlePhotoMessage()', () => {
		it('should handle the photo messages by replying an inline keyboard button', async () => {
			let generateInlineKeyboardSpy = sinon.spy(
				BotUtil,
				'generateInlineKeyboard'
			);

			ctx.state = { fileId: '8799c44fb12881c75563fec0650da5c2b6b55530' };
			ctx.message = { message_id: 325 };

			await BotMiddleware.handlePhotoMessage(ctx);

			expect(generateInlineKeyboardSpy.calledWithExactly('image', true)).to.be
				.true;
			expect(
				replyWithPhotoSpy.calledWithExactly(ctx.state.fileId, {
					caption:
						'Mau diapain gambar ini❓' +
						`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
					protect_content: true,
					reply_parameters: {
						message_id: ctx.message.message_id
					},
					reply_markup: {
						inline_keyboard: generateInlineKeyboardSpy.firstCall.returnValue
					}
				})
			).to.be.true;

			generateInlineKeyboardSpy.restore();
		});
	});

	describe('validateDocumentMessageMedia()', () => {
		it('should handle the error if file_size are not provided', async () => {
			const setup = [
				{ document: { file_id: 'lorem' } },
				{ document: { file_id: 'ipsum', file_size: undefined } },
				{ document: { file_id: 'dolor', file_size: null } }
			];

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(
					replySpy.calledWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
					)
				).to.be.true;

				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle the error if file_size are not an number', async () => {
			const setup = [
				{ document: { file_id: 'lorem', file_size: '25321' } },
				{ document: { file_id: 'ipsum', file_size: {} } },
				{ document: { file_id: 'dolor', file_size: [] } },
				{ document: { file_id: 'sit', file_size: true } }
			];

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(
					replySpy.calledWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
					)
				).to.be.true;

				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle the error if file_size more than 5MB', async () => {
			const setup = [
				{ document: { file_id: 'lorem', file_size: 10444321 } },
				{ document: { file_id: 'ipsum', file_size: 15435365 } },
				{ document: { file_id: 'dolor', file_size: 7245321 } },
				{ document: { file_id: 'sit', file_size: 5242881 } }
			];

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(ctx.state.response.message).to.be.equal(
					'Filebuds engga bisa menerima file yang kamu kirim karena ukurannya lebih dari 5MB⛔'
				);
				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(replySpy.calledWithExactly(ctx.state.response.message)).to.be
					.true;

				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle the error if checkFileSize() throw an Error', async () => {
			const setup = [
				{ document: { file_id: 'lorem', file_size: 10444321 } },
				{ document: { file_id: 'ipsum', file_size: 15435365 } },
				{ document: { file_id: 'dolor', file_size: 7245321 } },
				{ document: { file_id: 'sit', file_size: 5242881 } }
			];

			let checkFileSizeStub = sinon
				.stub(BotUtil, 'checkFileSize')
				.throws(new Error('Simulating Error'));

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(checkFileSizeStub.calledOnce).to.be.true;
				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(
					replySpy.calledWithExactly(
						`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
					)
				).to.be.true;

				checkFileSizeStub.resetHistory();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}

			checkFileSizeStub.restore();
		});

		it('should handle the error if file mime type are not supported', async () => {
			const setup = [
				{
					document: {
						file_id: 'lorem',
						file_size: 2124321
					}
				},
				{
					document: {
						file_id: 'ipsum',
						file_size: 3252321,
						mime_type: null
					}
				},
				{
					document: {
						file_id: 'dolor',
						file_size: 4444321,
						mime_type: undefined
					}
				},
				{
					document: {
						file_id: 'sit',
						file_size: 4444321,
						mime_type: 'text/html'
					}
				},
				{
					document: {
						file_id: 'amet',
						file_size: 2435365,
						mime_type: 'text/plain'
					}
				},
				{
					document: {
						file_id: 'consectetur',
						file_size: 245321,
						mime_type: 'text/javascript'
					}
				},
				{
					document: {
						file_id: 'adipiscing',
						file_size: 5242880,
						mime_type: 'audio/ogg'
					}
				}
			];

			let checkMimeTypeSpy = sinon.spy(BotUtil, 'checkMimeType');

			for (const x of setup) {
				ctx.message = x;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(checkMimeTypeSpy.firstCall.returnValue).to.be.deep.equal({
					isImage: false,
					isPdf: false
				});
				expect(ctx.state.response.message).to.be.equal(
					'Filebuds engga bisa menerima file yang kamu kirim karena formatnya tidak didukung⛔. ' +
						'Pastikan file yang kamu kirimkan adalah gambar (.jpg, .png, .jpeg) atau PDF (.pdf).'
				);
				expect(deleteMessageSpy.calledOnce).to.be.true;
				expect(replySpy.calledWithExactly(ctx.state.response.message)).to.be
					.true;

				checkMimeTypeSpy.resetHistory();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}

			checkMimeTypeSpy.restore();
		});

		it('should gracefully ignore the error from deleteMessage() when error occurs', async () => {
			deleteMessageSpy.restore();
			deleteMessageSpy = sinon
				.stub(ctx, 'deleteMessage')
				.rejects(new Error('Simulating Error'));

			await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

			expect(deleteMessageSpy.calledOnce).to.be.true;
			expect(
				replySpy.calledWithExactly(
					`Duh! Ada yang salah diserver Filebuds. Mohon maaf, kamu perlu mengirim ulang file yang ingin diproses😔`
				)
			).to.be.true;

			deleteMessageSpy.restore();
		});

		it('shoud handle the messages when media are valid', async () => {
			const setup = [
				{
					message: {
						document: {
							file_id: 'lorem',
							file_size: 3252321,
							mime_type: 'image/jpeg'
						}
					},
					checkMimeType: {
						isImage: true,
						isPdf: false
					}
				},
				{
					message: {
						document: {
							file_id: 'ipsum',
							file_size: 4444321,
							mime_type: 'application/pdf'
						}
					},
					checkMimeType: {
						isImage: false,
						isPdf: true
					}
				},
				{
					message: {
						document: {
							file_id: 'dolor',
							file_size: 4444321,
							mime_type: 'image/png'
						}
					},
					checkMimeType: {
						isImage: true,
						isPdf: false
					}
				},
				{
					message: {
						document: {
							file_id: 'sit',
							file_size: 2435365,
							mime_type: 'image/png'
						}
					},
					checkMimeType: {
						isImage: true,
						isPdf: false
					}
				},
				{
					message: {
						document: {
							file_id: 'amet',
							file_size: 245321,
							mime_type: 'application/pdf'
						}
					},
					checkMimeType: {
						isImage: false,
						isPdf: true
					}
				},
				{
					message: {
						document: {
							file_id: 'consectetur',
							file_size: 5242880,
							mime_type: 'application/pdf'
						}
					},
					checkMimeType: {
						isImage: false,
						isPdf: true
					}
				}
			];

			let checkFileSizeSpy = sinon.spy(BotUtil, 'checkFileSize');
			let checkMimeTypeSpy = sinon.spy(BotUtil, 'checkMimeType');

			for (const x of setup) {
				ctx.message = x.message;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(checkFileSizeSpy.calledOnce).to.be.true;
				expect(checkFileSizeSpy.firstCall.returnValue).to.be.true;
				expect(checkMimeTypeSpy.calledOnce).to.be.true;
				expect(checkMimeTypeSpy.firstCall.returnValue).to.be.deep.equal(
					x.checkMimeType
				);
				expect(ctx.state).to.be.deep.equal({
					fileId: x.message.document.file_id,
					isImage: x.checkMimeType.isImage,
					isPdf: x.checkMimeType.isPdf
				});
				expect(nextSpy.calledOnce).to.be.true;

				checkFileSizeSpy.resetHistory();
				checkMimeTypeSpy.resetHistory();
				nextSpy.resetHistory();
			}

			checkFileSizeSpy.restore();
			checkMimeTypeSpy.restore();
		});
	});

	describe('handleDocumentMessage()', () => {
		it('should handle the image document messages by replying an inline keyboard button', async () => {
			let generateInlineKeyboardSpy = sinon.spy(
				BotUtil,
				'generateInlineKeyboard'
			);

			ctx.state = {
				fileId: '6974a9d3e67f328d0fb770e849e35a26e6d7178a',
				isImage: true,
				isPdf: false
			};
			ctx.message = { message_id: 222 };

			await BotMiddleware.handleDocumentMessage(ctx);

			expect(generateInlineKeyboardSpy.calledWithExactly('doc/image', true)).to
				.be.true;
			expect(
				replyWithDocumentSpy.calledOnceWithExactly(ctx.state.fileId, {
					caption:
						'Mau diapain gambar ini❓' +
						`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
					protect_content: true,
					reply_parameters: {
						message_id: ctx.message.message_id
					},
					reply_markup: {
						inline_keyboard: generateInlineKeyboardSpy.firstCall.returnValue
					}
				})
			).to.be.true;

			generateInlineKeyboardSpy.restore();
		});

		it('should handle the PDF document messages by replying an inline keyboard button', async () => {
			let generateInlineKeyboardSpy = sinon.spy(
				BotUtil,
				'generateInlineKeyboard'
			);

			ctx.state = {
				fileId: '8f74b6b70ba831c38f466712fdecb363c9100b25',
				isImage: false,
				isPdf: true
			};
			ctx.message = { message_id: 132 };

			await BotMiddleware.handleDocumentMessage(ctx);

			expect(
				generateInlineKeyboardSpy.calledWithExactly('pdf', true, ['merge'])
			).to.be.true;
			expect(
				replyWithDocumentSpy.calledOnceWithExactly(ctx.state.fileId, {
					caption:
						'Mau diapain PDF ini❓' +
						`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
					protect_content: true,
					reply_parameters: {
						message_id: ctx.message.message_id
					},
					reply_markup: {
						inline_keyboard: generateInlineKeyboardSpy.firstCall.returnValue
					}
				})
			).to.be.true;

			generateInlineKeyboardSpy.restore();
		});
	});
});
