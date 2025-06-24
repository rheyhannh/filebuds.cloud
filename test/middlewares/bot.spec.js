import { describe, it } from 'mocha';
import sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import SharedCreditManager, {
	DAILY_SHARED_CREDIT_LIMIT
} from '../../src/libs/sharedCreditManager.js';
import * as _SupabaseService from '../../src/services/supabase.js';
import * as _TTLCache from '../../src/config/ttlcache.js';
import * as _TaskQueue from '../../src/queues/task.js';
import * as _BotMiddleware from '../../src/middlewares/bot.js';
import * as _BotUtil from '../../src/utils/bot.js';
import * as _MiscUtil from '../../src/utils/misc.js';
import * as Telegraf from 'telegraf'; // eslint-disable-line
import * as TelegrafTypes from 'telegraf/types'; // eslint-disable-line
import * as SupabaseTypes from '../../src/schemas/supabase.js'; // eslint-disable-line
import * as ILoveApiTypes from '../../src/schemas/iloveapi.js'; // eslint-disable-line

use(chaiAsPromised);
dayjs.extend(duration);

const BotMiddleware = _BotMiddleware.default;
const BotUtil = _BotUtil.default;
const MiscUtil = _MiscUtil.default;
const SupabaseService = _SupabaseService.default;
const TaskQueue = _TaskQueue.default;
const TTLCache = _TTLCache.default;

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
	let editMessageTextTGSpy =
		/** @type {import('sinon').SinonSpy<typeof ctx.telegram.editMessageText>} */ (
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
	let replyWithMarkdownV2Spy =
		/** @type {import('sinon').SinonSpy<typeof ctx.replyWithMarkdownV2>} */ (
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
			replyWithMarkdownV2: async () => {},
			telegram: {
				getFileLink: async () => {},
				editMessageText: async () => {}
			}
		};

		next = {
			handler: async () => {}
		};

		answerCbQuerySpy = sinon.spy(ctx, 'answerCbQuery');
		deleteMessageSpy = sinon.spy(ctx, 'deleteMessage');
		editMessageTextSpy = sinon.spy(ctx, 'editMessageText');
		editMessageTextTGSpy = sinon.spy(ctx.telegram, 'editMessageText');
		replySpy = sinon.spy(ctx, 'reply');
		replyWithPhotoSpy = sinon.spy(ctx, 'replyWithPhoto');
		replyWithDocumentSpy = sinon.spy(ctx, 'replyWithDocument');
		replyWithMarkdownV2Spy = sinon.spy(ctx, 'replyWithMarkdownV2');
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
			let toolUsed = /** @type {ILoveApiTypes.ToolEnum} */ ('upscaleimage');

			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 256;
			ctx.callbackQuery = {
				data: JSON.stringify({ task: toolUsed, type: 'image' })
			};

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(ctx.state).to.be.deep.equal({
				type: 'task_init',
				tg_user_id: ctx.chat.id,
				message_id: ctx.msgId,
				tool: toolUsed,
				toolPrice: BotMiddleware.TOOLS_PRICE[toolUsed],
				fileType: 'image',
				response: {}
			});
			expect(nextSpy.calledOnce).to.be.true;
		});

		it('should handle unexist cached message task_init callback query', async () => {
			TTLCache.userMessageUploadCache.clear();

			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 352;
			ctx.callbackQuery = {
				data: JSON.stringify({ mid: '185150352' })
			};

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔. ' +
						'Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
					{ show_alert: true, cache_time: 10 }
				)
			).to.be.true;

			answerCbQuerySpy.resetHistory();
		});

		it('should handle expired cached message task_init callback query', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150356', {
				userId: 185150,
				messageId: 356,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			expect(TTLCache.userMessageUploadCache.get('185150356')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 356,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 356;
			ctx.callbackQuery = {
				data: JSON.stringify({ mid: '185150356' })
			};

			// Wait 2.1s ensure cached message are expired.
			await new Promise((res) => setTimeout(res, 2100));
			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(TTLCache.userMessageUploadCache.get('185150356')).to.be.undefined;
			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'Filebuds engga bisa memproses permintaanmu karena perintah dipesan ini sudah lebih dari 1 hari⛔. ' +
						'Silahkan kirim file yang ingin diproses, atau gunakan /start untuk melihat panduan📖',
					{ show_alert: true, cache_time: 10 }
				)
			).to.be.true;

			answerCbQuerySpy.resetHistory();
		});

		it('should handle valid cached message task_init callback query when files less than 2', async () => {
			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('1851505', {
				userId: 185150,
				messageId: 5,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 5;
			ctx.callbackQuery = {
				data: JSON.stringify({ mid: '1851505' })
			};

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(TTLCache.userMessageUploadCache.get('1851505')).to.be.deep.equal({
				userId: 185150,
				messageId: 5,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'Untuk memproses permintaanmu, setidaknya ada 2 file yang dikirim untuk diproses.',
					{ show_alert: true }
				)
			).to.be.true;

			answerCbQuerySpy.resetHistory();
		});

		it('should handle valid cached message task_init callback query', async () => {
			let toolUsed = /** @type {ILoveApiTypes.ToolEnum} */ ('merge');

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('18515021', {
				userId: 185150,
				messageId: 21,
				tool: toolUsed,
				fileType: 'pdf',
				files: [
					{
						fileName: 'lorem.pdf',
						fileLink: 'https://telegram.com/documents/lorem.pdf'
					},
					{
						fileName: 'ipsum.pdf',
						fileLink: 'https://telegram.com/documents/ipsum.pdf'
					}
				]
			});

			ctx.chat = {
				id: 185150
			};
			ctx.msgId = 21;
			ctx.callbackQuery = {
				data: JSON.stringify({ mid: '18515021' })
			};

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(TTLCache.userMessageUploadCache.get('18515021')).to.be.deep.equal({
				userId: 185150,
				messageId: 21,
				tool: toolUsed,
				fileType: 'pdf',
				files: [
					{
						fileName: 'lorem.pdf',
						fileLink: 'https://telegram.com/documents/lorem.pdf'
					},
					{
						fileName: 'ipsum.pdf',
						fileLink: 'https://telegram.com/documents/ipsum.pdf'
					}
				]
			});
			expect(ctx.state).to.be.deep.equal({
				type: 'task_init',
				tg_user_id: ctx.chat.id,
				message_id: ctx.msgId,
				tool: toolUsed,
				toolPrice: BotMiddleware.TOOLS_PRICE[toolUsed],
				fileType: 'pdf',
				fileLink: [
					'https://telegram.com/documents/lorem.pdf',
					'https://telegram.com/documents/ipsum.pdf'
				],
				response: {}
			});
			expect(nextSpy.calledOnce).to.be.true;
		});

		it('should handle "clear_all_rl" administrative events', async () => {
			ctx.callbackQuery = {
				data: JSON.stringify({ event: 'clear_all_rl' })
			};

			BotMiddleware.CallbackQueryJobTrackingRateLimiter.attempt('235250');
			BotMiddleware.CallbackQueryJobTrackingRateLimiter.attempt('215255');
			BotMiddleware.CallbackQueryTaskInitRateLimiter.attempt('255200');

			let jobTrackingRateLimiterSpy = sinon.spy(
				BotMiddleware.CallbackQueryJobTrackingRateLimiter,
				'clear'
			);
			let taskInitRateLimiterSpy = sinon.spy(
				BotMiddleware.CallbackQueryTaskInitRateLimiter,
				'clear'
			);

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(jobTrackingRateLimiterSpy.calledOnce).to.be.true;
			expect(BotMiddleware.CallbackQueryJobTrackingRateLimiter.size).to.be.eq(
				0
			);
			expect(taskInitRateLimiterSpy.calledOnce).to.be.true;
			expect(BotMiddleware.CallbackQueryTaskInitRateLimiter.size).to.be.eq(0);
			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'All rate limiter successfully cleared✅'
				)
			).to.be.true;

			BotMiddleware.CallbackQueryJobTrackingRateLimiter.clear();
			BotMiddleware.CallbackQueryTaskInitRateLimiter.clear();

			jobTrackingRateLimiterSpy.restore();
			taskInitRateLimiterSpy.restore();
		});

		it('should handle "clear_job_tracking_rl" administrative events', async () => {
			ctx.callbackQuery = {
				data: JSON.stringify({ event: 'clear_job_tracking_rl' })
			};

			BotMiddleware.CallbackQueryJobTrackingRateLimiter.attempt('235250');
			BotMiddleware.CallbackQueryJobTrackingRateLimiter.attempt('215255');
			BotMiddleware.CallbackQueryJobTrackingRateLimiter.attempt('255200');

			let jobTrackingRateLimiterSpy = sinon.spy(
				BotMiddleware.CallbackQueryJobTrackingRateLimiter,
				'clear'
			);

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(jobTrackingRateLimiterSpy.calledOnce).to.be.true;
			expect(BotMiddleware.CallbackQueryJobTrackingRateLimiter.size).to.be.eq(
				0
			);
			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'Job tracking rate limiter successfully cleared✅'
				)
			).to.be.true;

			BotMiddleware.CallbackQueryJobTrackingRateLimiter.clear();

			jobTrackingRateLimiterSpy.restore();
		});

		it('should handle "clear_task_init_rl" administrative events', async () => {
			ctx.callbackQuery = {
				data: JSON.stringify({ event: 'clear_task_init_rl' })
			};

			BotMiddleware.CallbackQueryTaskInitRateLimiter.attempt('215255');
			BotMiddleware.CallbackQueryTaskInitRateLimiter.attempt('255200');

			let taskInitRateLimiterSpy = sinon.spy(
				BotMiddleware.CallbackQueryTaskInitRateLimiter,
				'clear'
			);

			await BotMiddleware.initCallbackQueryState(ctx, next.handler);

			expect(taskInitRateLimiterSpy.calledOnce).to.be.true;
			expect(BotMiddleware.CallbackQueryTaskInitRateLimiter.size).to.be.eq(0);
			expect(
				answerCbQuerySpy.calledOnceWithExactly(
					'Task initialization rate limiter successfully cleared✅'
				)
			).to.be.true;

			BotMiddleware.CallbackQueryTaskInitRateLimiter.clear();

			taskInitRateLimiterSpy.restore();
		});

		it('should handle unknown administrative events', async () => {
			const events = ['lorem_ipsum_dolor', true, [], {}, '55', 250];

			for (const event of events) {
				ctx.callbackQuery = {
					data: JSON.stringify({ event })
				};

				await BotMiddleware.initCallbackQueryState(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Unknown administrative event❌'
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});
	});

	describe('checkUsersCreditCallbackQueryHandler()', () => {
		it('should throw an Error and handle the error when callback query types invalid', async () => {
			const setup = [
				{ type: null },
				{ type: undefined },
				{ type: [] },
				{ type: {} },
				{ type: true },
				{ type: false },
				{ type: 32521 },
				{ type: 'unknown' }
			];

			for (const x of setup) {
				ctx.state = x;

				await BotMiddleware.checkUsersCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		describe('job_track', () => {
			it('should immediately call next chained middleware', async () => {
				ctx.state = {
					type: 'job_track'
				};

				await BotMiddleware.checkUsersCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(nextSpy.calledOnce).to.be.true;
				expect(ctx.state.isUserCreditAvailable).to.be.undefined;

				nextSpy.resetHistory();
			});
		});

		describe('task_init', () => {
			it('should handle when user credits sufficient', async () => {
				ctx.state = {
					type: 'task_init'
				};

				await BotMiddleware.checkUsersCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(ctx.state.isUserCreditAvailable).to.be.false;
				expect(nextSpy.calledOnce).to.be.true;

				nextSpy.resetHistory();
			});
		});
	});

	describe('checkSharedCreditCallbackQueryHandler()', () => {
		it('should throw an Error and handle the error when callback query types invalid', async () => {
			const setup = [
				{ type: null },
				{ type: undefined },
				{ type: [] },
				{ type: {} },
				{ type: true },
				{ type: false },
				{ type: 32521 },
				{ type: 'unknown' }
			];

			for (const x of setup) {
				ctx.state = x;

				await BotMiddleware.checkSharedCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		describe('job_track', () => {
			it('should immediately call next chained middleware', async () => {
				ctx.state = {
					type: 'job_track'
				};

				await BotMiddleware.checkSharedCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(nextSpy.calledOnce).to.be.true;
				expect(ctx.state.isSharedCreditAvailable).to.be.undefined;
				expect(ctx.state.paymentMethod).to.be.undefined;

				nextSpy.resetHistory();
			});
		});

		describe('task_init', () => {
			it('should handle when user credits sufficient', async () => {
				ctx.state = {
					type: 'task_init',
					tool: 'upscaleimage',
					toolPrice: 20,
					isUserCreditAvailable: true
				};

				await BotMiddleware.checkSharedCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(ctx.state.paymentMethod).to.be.equal('user_credit');
				expect(nextSpy.calledOnce).to.be.true;

				nextSpy.resetHistory();
			});

			it('should handle when shared credits sufficient', async () => {
				ctx.state = {
					type: 'task_init',
					tool: 'removebackgroundimage',
					toolPrice: 10,
					isUserCreditAvailable: false
				};

				let consumeCreditsStub = sinon
					.stub(SharedCreditManager, 'consumeCredits')
					.resolves(true);

				await BotMiddleware.checkSharedCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(await consumeCreditsStub.firstCall.returnValue).to.be.true;
				expect(ctx.state.isSharedCreditAvailable).to.be.true;
				expect(ctx.state.paymentMethod).to.be.equal('shared_credit');
				expect(nextSpy.calledOnce).to.be.true;

				consumeCreditsStub.restore();
				nextSpy.resetHistory();
			});

			it('should handle when shared credits insufficient', async () => {
				ctx.state = {
					type: 'task_init',
					tool: 'compress',
					toolPrice: 5,
					isUserCreditAvailable: false
				};

				let consumeCreditsStub = sinon
					.stub(SharedCreditManager, 'consumeCredits')
					.resolves(false);

				await BotMiddleware.checkSharedCreditCallbackQueryHandler(
					ctx,
					next.handler
				);

				expect(await consumeCreditsStub.firstCall.returnValue).to.be.false;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Kuota harian Filebuds sudah habis⏳. Silahkan coba lagi besok atau pastiin /pulsa kamu cukup untuk pakai fast track⚡',
						{ show_alert: true, cache_time: 30 }
					)
				).to.be.true;
				expect(nextSpy.notCalled).to.be.true;

				consumeCreditsStub.restore();
				answerCbQuerySpy.resetHistory();
				nextSpy.resetHistory();
			});
		});
	});

	describe('checkCallbackQueryLimit()', () => {
		it('should throw an Error and handle the error when callback query types invalid', async () => {
			const setup = [
				{
					type: null,
					tg_user_id: 185150
				},
				{
					type: undefined,
					tg_user_id: 185150
				},
				{
					type: [],
					tg_user_id: 185150
				},
				{
					type: {},
					tg_user_id: 185150
				},
				{
					type: true,
					tg_user_id: 185150
				},
				{
					type: false,
					tg_user_id: 185150
				},
				{
					type: 32521,
					tg_user_id: 185150
				},
				{
					type: 'unknown',
					tg_user_id: 185150
				}
			];

			for (const x of setup) {
				ctx.state = x;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				answerCbQuerySpy.resetHistory();
			}
		});

		describe('job_track', () => {
			it('should catch and handle errors properly if an exception is thrown', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryJobTrackingRateLimiter, 'attempt')
					.throws(new Error('Simulating Error'));

				const setup = { type: 'job_track', tg_user_id: 15150 };
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				attemptStub.restore();
				answerCbQuerySpy.resetHistory();
			});

			it('should reject the callback query if the user exceeds the rate limit', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryJobTrackingRateLimiter, 'attempt')
					.returns(false);
				const getRemainingTTLSpy = sinon.spy(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter,
					'getRemainingTTL'
				);

				const setup = { type: 'job_track', tg_user_id: 15150 };
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				const remainingTtl = getRemainingTTLSpy.firstCall.returnValue;
				const cache_time =
					remainingTtl < 2500 ? 3 : Math.floor(remainingTtl / 1000);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(getRemainingTTLSpy.calledOnceWithExactly(`${setup.tg_user_id}`))
					.to.be.true;
				expect(Number.isInteger(cache_time)).to.be.true;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Filebuds lagi sibuk atau akses kamu sedang dibatasi. Silahkan coba lagi dalam beberapa saat⏳',
						{ show_alert: true, cache_time }
					)
				).to.be.true;
				expect(nextSpy.notCalled).to.be.true;

				attemptStub.restore();
				answerCbQuerySpy.resetHistory();
			});

			it('should accept the callback query if the user is within the rate limit', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryJobTrackingRateLimiter, 'attempt')
					.returns(true);

				const setup = { type: 'job_track', tg_user_id: 15150 };
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(nextSpy.calledOnce).to.be.true;

				attemptStub.restore();
			});

			it('should rejects and accepts the callback query correctly in concurrent operations', async () => {
				// TODO: Add types and fullfill are possible properties.
				const setup = [
					{ type: 'job_track', tg_user_id: 185150 }, // Allow
					{ type: 'job_track', tg_user_id: 125150 }, // Allow
					{ type: 'job_track', tg_user_id: 185150 }, // Allow
					{ type: 'job_track', tg_user_id: 185150 }, // Reject
					{ type: 'job_track', tg_user_id: 135150 }, // Allow
					{ type: 'job_track', tg_user_id: 135150 }, // Allow
					{ type: 'job_track', tg_user_id: 135150 }, // Reject
					{ type: 'job_track', tg_user_id: 185150 }, // Reject
					{ type: 'job_track', tg_user_id: 125150 }, // Allow
					{ type: 'job_track', tg_user_id: 135150 } // Reject
				];

				const attemptSpy = sinon.spy(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter,
					'attempt'
				);
				const getRemainingTTLSpy = sinon.spy(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter,
					'getRemainingTTL'
				);

				// TODO: Store result as boolean in an array so we can check them in sequentially.
				await Promise.all(
					setup.map((state) =>
						BotMiddleware.checkCallbackQueryLimit(
							{ ...ctx, state },
							next.handler
						)
					)
				);

				expect(attemptSpy.callCount).to.be.equal(10);
				expect(getRemainingTTLSpy.callCount).to.be.equal(14);
				expect(answerCbQuerySpy.callCount).to.be.equal(4);
				expect(nextSpy.callCount).to.be.equal(6);

				getRemainingTTLSpy.resetHistory();
				attemptSpy.resetHistory();
			});
		});

		describe('task_init', () => {
			it('should catch and handle errors properly if an exception is thrown', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryTaskInitRateLimiter, 'attempt')
					.throws(new Error('Simulating Error'));

				const setup = { type: 'task_init', tg_user_id: 15150 };
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Ada yang salah diserver Filebuds. Silahkan coba lagi🔄',
						{ show_alert: true }
					)
				).to.be.true;

				attemptStub.restore();
				answerCbQuerySpy.resetHistory();
			});

			it('should reject the callback query and gracefully handle errors from refunding shared credits if the user exceeds the rate limit and using shared credits', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryTaskInitRateLimiter, 'attempt')
					.returns(false);
				const getRemainingTTLSpy = sinon.spy(
					BotMiddleware.CallbackQueryTaskInitRateLimiter,
					'getRemainingTTL'
				);
				const refundCreditsStub = sinon
					.stub(SharedCreditManager, 'refundCredits')
					.rejects(new Error('Simulating Error'));

				const setup = {
					type: 'task_init',
					tool: 'upscaleimage',
					toolPrice: BotMiddleware.TOOLS_PRICE['upscaleimage'],
					tg_user_id: 15150,
					paymentMethod: 'shared_credit'
				};
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				const remainingTtl = getRemainingTTLSpy.firstCall.returnValue;
				const cache_time =
					remainingTtl < 4500 ? 5 : Math.floor(remainingTtl / 1000);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(getRemainingTTLSpy.calledOnceWithExactly(`${setup.tg_user_id}`))
					.to.be.true;
				expect(Number.isInteger(cache_time)).to.be.true;
				expect(
					refundCreditsStub.calledOnceWithExactly(
						BotMiddleware.TOOLS_PRICE[setup.tool]
					)
				).to.be.true;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Filebuds lagi sibuk atau akses kamu sedang dibatasi. Silahkan coba lagi dalam beberapa saat⏳. Biar akses kamu engga dibatasin, pastikan /pulsa kamu cukup untuk pakai fast track⚡',
						{ show_alert: true, cache_time }
					)
				).to.be.true;
				expect(nextSpy.notCalled).to.be.true;

				attemptStub.restore();
				answerCbQuerySpy.resetHistory();
				refundCreditsStub.restore();
			});

			it('should reject the callback query and refunds shared credits if the user exceeds the rate limit and using shared credits', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryTaskInitRateLimiter, 'attempt')
					.returns(false);
				const getRemainingTTLSpy = sinon.spy(
					BotMiddleware.CallbackQueryTaskInitRateLimiter,
					'getRemainingTTL'
				);
				const refundCreditsStub = sinon
					.stub(SharedCreditManager, 'refundCredits')
					.resolves(undefined);

				const setup = {
					type: 'task_init',
					tool: 'upscaleimage',
					toolPrice: BotMiddleware.TOOLS_PRICE['upscaleimage'],
					tg_user_id: 15150,
					paymentMethod: 'shared_credit'
				};
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				const remainingTtl = getRemainingTTLSpy.firstCall.returnValue;
				const cache_time =
					remainingTtl < 4500 ? 5 : Math.floor(remainingTtl / 1000);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(getRemainingTTLSpy.calledOnceWithExactly(`${setup.tg_user_id}`))
					.to.be.true;
				expect(Number.isInteger(cache_time)).to.be.true;
				expect(
					refundCreditsStub.calledOnceWithExactly(
						BotMiddleware.TOOLS_PRICE[setup.tool]
					)
				).to.be.true;
				expect(await refundCreditsStub.firstCall.returnValue).to.be.undefined;
				expect(
					answerCbQuerySpy.calledOnceWithExactly(
						'Duh! Filebuds lagi sibuk atau akses kamu sedang dibatasi. Silahkan coba lagi dalam beberapa saat⏳. Biar akses kamu engga dibatasin, pastikan /pulsa kamu cukup untuk pakai fast track⚡',
						{ show_alert: true, cache_time }
					)
				).to.be.true;
				expect(nextSpy.notCalled).to.be.true;

				attemptStub.restore();
				answerCbQuerySpy.resetHistory();
				refundCreditsStub.restore();
			});

			it('should accept the callback query if the user is within the rate limit', async () => {
				const attemptStub = sinon
					.stub(BotMiddleware.CallbackQueryTaskInitRateLimiter, 'attempt')
					.returns(true);

				const setup = { type: 'task_init', tg_user_id: 15150 };
				ctx.state = setup;

				await BotMiddleware.checkCallbackQueryLimit(ctx, next.handler);

				expect(attemptStub.calledOnceWithExactly(`${setup.tg_user_id}`)).to.be
					.true;
				expect(nextSpy.calledOnce).to.be.true;

				attemptStub.restore();
			});

			it('should rejects and accepts the callback query correctly in concurrent operations', async () => {
				// TODO: Add types and fullfill are possible properties.
				// TODO: Add case where paymentMethod are 'user_credit'
				const setup = [
					{ type: 'task_init', tg_user_id: 185150 }, // Allow
					{ type: 'task_init', tg_user_id: 125150 }, // Allow
					{ type: 'task_init', tg_user_id: 185150 }, // Allow
					{ type: 'task_init', tg_user_id: 185150 }, // Reject
					{ type: 'task_init', tg_user_id: 135150 }, // Allow
					{ type: 'task_init', tg_user_id: 135150 }, // Allow
					{ type: 'task_init', tg_user_id: 135150 }, // Reject
					{ type: 'task_init', tg_user_id: 185150 }, // Reject
					{ type: 'task_init', tg_user_id: 125150 }, // Allow
					{ type: 'task_init', tg_user_id: 135150 } // Reject
				];

				const attemptSpy = sinon.spy(
					BotMiddleware.CallbackQueryTaskInitRateLimiter,
					'attempt'
				);
				const getRemainingTTLSpy = sinon.spy(
					BotMiddleware.CallbackQueryTaskInitRateLimiter,
					'getRemainingTTL'
				);

				// TODO: Store result as boolean in an array so we can check them in sequentially.
				await Promise.all(
					setup.map((state) =>
						BotMiddleware.checkCallbackQueryLimit(
							{ ...ctx, state },
							next.handler
						)
					)
				);

				expect(attemptSpy.callCount).to.be.equal(10);
				expect(getRemainingTTLSpy.callCount).to.be.equal(14);
				expect(answerCbQuerySpy.callCount).to.be.equal(4);
				expect(nextSpy.callCount).to.be.equal(6);

				getRemainingTTLSpy.resetHistory();
				attemptSpy.resetHistory();
			});
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

		it('should immediately call next chained middleware when callback query are cached message task init', async () => {
			ctx.state = {
				type: 'task_init',
				tg_user_id: 185150,
				message_id: 923,
				tool: 'merge',
				fileType: 'pdf',
				fileLink: [
					'https://telegram.com/documents/lorem.pdf',
					'https://telegram.com/documents/ipsum.pdf'
				],
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
						tool: 'compress',
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
				let toolUsed = /** @type {ILoveApiTypes.ToolEnum} */ ('upscaleimage');

				let addTaskJobStub = sinon
					.stub(TaskQueue, 'addTaskJob')
					.rejects(new Error('Simulating Error'));

				ctx.state = {
					type: 'task_init',
					tg_user_id: 185150,
					message_id: 211,
					tool: toolUsed,
					toolPrice: BotMiddleware.TOOLS_PRICE[toolUsed],
					fileType: 'doc/image',
					fileLink: 'https://api.mocked.org/media/files.jpg',
					paymentMethod: 'shared_credit',
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
						toolPrice: ctx.state.toolPrice,
						toolOptions: {},
						fileType: ctx.state.fileType,
						fileLink: ctx.state.fileLink,
						paymentMethod: ctx.state.paymentMethod
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
								toolPrice: BotMiddleware.TOOLS_PRICE['upscaleimage'],
								fileType: 'doc/image',
								fileLink: 'https://api.mocked.org/document/lorem.jpg',
								response: {},
								paymentMethod: 'user_credit'
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
								toolPrice: BotMiddleware.TOOLS_PRICE['removebackgroundimage'],
								fileType: 'image',
								fileLink: 'https://api.mocked.org/media/ipsum.png',
								response: {},
								paymentMethod: 'shared_credit'
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
								tool: 'compress',
								toolPrice: BotMiddleware.TOOLS_PRICE['compress'],
								fileType: 'pdf',
								fileLink: 'https://api.mocked.org/document/dolor.pdf',
								response: {},
								paymentMethod: 'shared_credit'
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: -` +
									`\nTipe: compress` +
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
							toolPrice: ctx.state.toolPrice,
							toolOptions: {},
							fileType: ctx.state.fileType,
							fileLink: ctx.state.fileLink,
							paymentMethod: ctx.state.paymentMethod
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
								toolPrice: BotMiddleware.TOOLS_PRICE['upscaleimage'],
								fileType: 'doc/image',
								fileLink: 'https://api.mocked.org/document/lorem.jpg',
								response: {},
								paymentMethod: 'shared_credit'
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
								toolPrice: BotMiddleware.TOOLS_PRICE['removebackgroundimage'],
								fileType: 'image',
								fileLink: 'https://api.mocked.org/media/ipsum.png',
								response: {},
								paymentMethod: 'user_credit'
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
								tool: 'compress',
								toolPrice: BotMiddleware.TOOLS_PRICE['compress'],
								fileType: 'pdf',
								fileLink: 'https://api.mocked.org/document/dolor.pdf',
								response: {},
								paymentMethod: 'shared_credit'
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: d5f8817abf1140344742a16ed12ba197d1eed4b1` +
									`\nTipe: compress` +
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
							toolPrice: ctx.state.toolPrice,
							toolOptions: {},
							fileType: ctx.state.fileType,
							fileLink: ctx.state.fileLink,
							paymentMethod: ctx.state.paymentMethod
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
								toolPrice: BotMiddleware.TOOLS_PRICE['upscaleimage'],
								fileType: 'doc/image',
								fileLink: 'https://api.mocked.org/document/lorem.jpg',
								response: {},
								paymentMethod: 'user_credit'
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
								toolPrice: BotMiddleware.TOOLS_PRICE['removebackgroundimage'],
								fileType: 'image',
								fileLink: 'https://api.mocked.org/media/ipsum.png',
								response: {},
								paymentMethod: 'shared_credit'
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
								tool: 'compress',
								toolPrice: BotMiddleware.TOOLS_PRICE['compress'],
								fileType: 'pdf',
								fileLink: 'https://api.mocked.org/document/dolor.pdf',
								response: {},
								paymentMethod: 'shared_credit'
							},
							generated: {
								text:
									'📝 Resi Filebuds' +
									`\n━━━━━━━━━━━━━━━━━` +
									`\nID: 3ca29fdcf629c9add724a3245a9d38374ec70ecf` +
									`\nTipe: compress` +
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
							toolPrice: ctx.state.toolPrice,
							toolOptions: {},
							fileType: ctx.state.fileType,
							fileLink: ctx.state.fileLink,
							paymentMethod: ctx.state.paymentMethod
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

		it('should ignore the messages when cached message are unavailable', async () => {
			TTLCache.userMessageUploadCache.clear();

			ctx.chat = {
				id: 185150
			};
			ctx.message = {
				photo: [
					{ file_id: 'ipsum', file_size: 253425 },
					{ file_id: 'dolor', file_size: 3267323 },
					{ file_id: 'sit', file_size: 2435365 }
				],
				reply_to_message: {
					message_id: 24
				}
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');

			await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

			expect(withLockSpy.calledOnceWith('18515024')).to.be.true;

			withLockSpy.restore();
		});

		it('should ignore the messages when cached message are expired', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('18515024', {
				userId: 185150,
				messageId: 24,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});

			expect(TTLCache.userMessageUploadCache.get('18515024')).to.be.deep.equal({
				userId: 185150,
				messageId: 24,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});

			ctx.chat = {
				id: 185150
			};
			ctx.message = {
				photo: [
					{ file_id: 'ipsum', file_size: 253425 },
					{ file_id: 'dolor', file_size: 3267323 },
					{ file_id: 'sit', file_size: 2435365 }
				],
				reply_to_message: {
					message_id: 24
				}
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');

			// Wait 2.1s to ensure cached message are expired.
			await new Promise((res) => setTimeout(res, 2100));
			await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

			expect(TTLCache.userMessageUploadCache.get('18515024')).to.be.undefined;
			expect(withLockSpy.calledOnceWith('18515024')).to.be.true;

			withLockSpy.restore();
		});

		it('should ignore the messages in sequentially when media and cached message fileType are invalid', async () => {
			const setup = [
				{
					photo: [{ file_id: 'lorem', file_size: 4444321 }],
					reply_to_message: { message_id: 23 }
				},
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425 },
						{ file_id: 'dolor', file_size: 3267323 },
						{ file_id: 'sit', file_size: 2435365 }
					],
					reply_to_message: { message_id: 23 }
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241 },
						{ file_id: 'consectetur', file_size: 245321 }
					],
					reply_to_message: { message_id: 23 }
				},
				{
					photo: [{ file_id: 'lorem', file_size: 5242880 }],
					reply_to_message: { message_id: 23 }
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('18515023', {
				userId: 185150,
				messageId: 23,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			expect(TTLCache.userMessageUploadCache.get('18515023')).to.be.deep.equal({
				userId: 185150,
				messageId: 23,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			for (const msg of setup) {
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				expect(withLockSpy.calledOnceWith('18515023')).to.be.true;
				expect(getFileLinkSpy.notCalled).to.be.true;
				expect(TTLCacheSetter.notCalled).to.be.true;
				expect(editMessageTextTGSpy.notCalled).to.be.true;
				expect(deleteMessageSpy.notCalled).to.be.true;
				expect(replySpy.notCalled).to.be.true;

				withLockSpy.restore();
				TTLCacheSetter.restore();
				editMessageTextTGSpy.resetHistory();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}

			const final = TTLCache.userMessageUploadCache.get('18515023');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 23,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
		});

		it('should ignore the messages in parallel when media and cached message fileType are invalid', async () => {
			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150555', {
				userId: 185150,
				messageId: 555,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			expect(TTLCache.userMessageUploadCache.get('185150555')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 555,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [{ file_id: 'lorem', file_size: 4444321 }],
						reply_to_message: { message_id: 555 }
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'ipsum', file_size: 253425 },
							{ file_id: 'dolor', file_size: 3267323 },
							{ file_id: 'sit', file_size: 2435365 }
						],
						reply_to_message: { message_id: 555 }
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'amet', file_size: 21241 },
							{ file_id: 'consectetur', file_size: 245321 }
						],
						reply_to_message: { message_id: 555 }
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.notCalled).to.be.true;
			expect(editMessageTextTGSpy.notCalled).to.be.true;
			expect(deleteMessageSpy.notCalled).to.be.true;
			expect(replySpy.notCalled).to.be.true;

			const final = TTLCache.userMessageUploadCache.get('185150555');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 555,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			withLockSpy.restore();
			TTLCacheSetter.restore();
			editMessageTextTGSpy.resetHistory();
			deleteMessageSpy.resetHistory();
			replySpy.resetHistory();
		});

		it('should update cached messages in sequentially when media and cached message fileType are valid', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			const setup = [
				{
					photo: [
						{ file_id: 'lorem', file_size: 4444321, file_unique_id: '0a' }
					],
					reply_to_message: { message_id: 39 }
				},
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425, file_unique_id: '1a' },
						{ file_id: 'dolor', file_size: 3267323, file_unique_id: '1b' },
						{ file_id: 'sit', file_size: 2435365, file_unique_id: '1c' }
					],
					reply_to_message: { message_id: 39 }
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241, file_unique_id: '2a' },
						{ file_id: 'consectetur', file_size: 245321, file_unique_id: '2b' }
					],
					reply_to_message: { message_id: 39 }
				},
				{
					photo: [{ file_id: 'xyz', file_size: 5242880, file_unique_id: '3a' }],
					reply_to_message: { message_id: 39 }
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('18515039', {
				userId: 185150,
				messageId: 39,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('18515039')).to.be.deep.equal({
				userId: 185150,
				messageId: 39,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});

			for (const msg of setup) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(
							`https://api.mocked.org/media/${msg.photo[msg.photo.length - 1].file_id}`
						)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				const data = TTLCache.userMessageUploadCache.get('18515039');

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				const fileURL = await getFileLinkSpy.firstCall.returnValue;
				const updatedFiles = [
					...data.files,
					{
						fileName: msg.photo[msg.photo.length - 1].file_unique_id,
						fileLink: fileURL.toString()
					}
				];
				const updatedFilesName = updatedFiles.map((file) => file.fileName);

				expect(withLockSpy.calledOnceWith('18515039')).to.be.true;
				expect(
					getFileLinkSpy.calledOnceWithExactly(
						msg.photo[msg.photo.length - 1].file_id
					)
				).to.be.true;
				expect(
					TTLCacheSetter.calledOnceWithExactly(
						'18515039',
						{ ...data, files: updatedFiles },
						{ noUpdateTTL: true }
					)
				).to.be.true;
				expect(
					editMessageTextTGSpy.calledOnceWithExactly(
						185150,
						39,
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
														callback_data: JSON.stringify({ mid: '18515039' })
													}
												]
											]
										}
						}
					)
				).to.be.true;

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				editMessageTextTGSpy.resetHistory();
			}

			const final = TTLCache.userMessageUploadCache.get('18515039');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 39,
				tool: 'upscaleimage',
				fileType: 'image',
				files: [
					{
						fileName: '0a',
						fileLink: 'https://api.mocked.org/media/lorem'
					},
					{
						fileName: '1c',
						fileLink: 'https://api.mocked.org/media/sit'
					},
					{
						fileName: '2b',
						fileLink: 'https://api.mocked.org/media/consectetur'
					},
					{
						fileName: '3a',
						fileLink: 'https://api.mocked.org/media/xyz'
					}
				]
			});
		});

		it('should update cached messages in parallel when media and cached message fileType are valid', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150151', {
				userId: 185150,
				messageId: 151,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150151')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 151,
					tool: 'upscaleimage',
					fileType: 'image',
					files: []
				}
			);

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/sit`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/consectetur`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'lorem', file_size: 4444321, file_unique_id: '0a' }
						],
						reply_to_message: { message_id: 151 }
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'ipsum', file_size: 253425, file_unique_id: '1a' },
							{ file_id: 'dolor', file_size: 3267323, file_unique_id: '1b' },
							{ file_id: 'sit', file_size: 2435365, file_unique_id: '1c' }
						],
						reply_to_message: { message_id: 151 }
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'amet', file_size: 21241, file_unique_id: '2a' },
							{
								file_id: 'consectetur',
								file_size: 245321,
								file_unique_id: '2b'
							}
						],
						reply_to_message: { message_id: 151 }
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.calledThrice).to.be.true;
			expect(editMessageTextTGSpy.calledThrice).to.be.true;
			expect(
				editMessageTextTGSpy.alwaysCalledWithMatch(
					185150,
					151,
					undefined,
					'Silahkan kirim file yang ingin diproses dengan membalas pesan ini. ' +
						'Pastikan setiap file berformat (.jpg, .png, .jpeg) dan ukurannya tidak lebih dari 5MB. ' +
						'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar. \n\n'
				)
			).to.be.true;

			const final = TTLCache.userMessageUploadCache.get('185150151');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 151,
				tool: 'upscaleimage',
				fileType: 'image',
				files: [
					{
						fileName: '0a',
						fileLink: 'https://api.mocked.org/media/lorem'
					},
					{
						fileName: '1c',
						fileLink: 'https://api.mocked.org/media/sit'
					},
					{
						fileName: '2b',
						fileLink: 'https://api.mocked.org/media/consectetur'
					}
				]
			});
		});

		it('should handle when update cached messages failed in sequentially', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			let arrayCheckerStub = sinon.stub(MiscUtil, 'areArraysEqualByIndex');
			arrayCheckerStub.onCall(0).returns(true);
			arrayCheckerStub.onCall(1).returns(false);
			arrayCheckerStub.onCall(2).returns(true);

			const setup = [
				{
					photo: [
						{ file_id: 'lorem', file_size: 4444321, file_unique_id: '0a' }
					],
					reply_to_message: { message_id: 299 }
				},
				{
					photo: [
						{ file_id: 'ipsum', file_size: 253425, file_unique_id: '1a' },
						{ file_id: 'dolor', file_size: 3267323, file_unique_id: '1b' },
						{ file_id: 'sit', file_size: 2435365, file_unique_id: '1c' }
					],
					reply_to_message: { message_id: 299 }
				},
				{
					photo: [
						{ file_id: 'amet', file_size: 21241, file_unique_id: '2a' },
						{ file_id: 'consectetur', file_size: 245321, file_unique_id: '2b' }
					],
					reply_to_message: { message_id: 299 }
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150299', {
				userId: 185150,
				messageId: 299,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150299')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 299,
					tool: 'upscaleimage',
					fileType: 'image',
					files: []
				}
			);

			for (const [index, msg] of setup.entries()) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(
							`https://api.mocked.org/media/${msg.photo[msg.photo.length - 1].file_id}`
						)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				const data = TTLCache.userMessageUploadCache.get('185150299');

				await BotMiddleware.validatePhotoMessageMedia(ctx, next.handler);

				const fileURL = await getFileLinkSpy.firstCall.returnValue;
				const updatedFiles = [
					...data.files,
					{
						fileName: msg.photo[msg.photo.length - 1].file_unique_id,
						fileLink: fileURL.toString()
					}
				];
				const updatedFilesName = updatedFiles.map((file) => file.fileName);

				expect(withLockSpy.calledOnceWith('185150299')).to.be.true;
				expect(
					getFileLinkSpy.calledOnceWithExactly(
						msg.photo[msg.photo.length - 1].file_id
					)
				).to.be.true;
				expect(
					TTLCacheSetter.calledOnceWithExactly(
						'185150299',
						{ ...data, files: updatedFiles },
						{ noUpdateTTL: true }
					)
				).to.be.true;

				if (index === 1) {
					expect(ctx?.state?.response?.message).to.be.equal(
						`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
					);
					expect(deleteMessageSpy.calledOnce).to.be.true;
					expect(
						replySpy.calledOnceWithExactly(
							`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
						)
					).to.be.true;
				} else {
					expect(
						editMessageTextTGSpy.calledOnceWithExactly(
							185150,
							299,
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
															callback_data: JSON.stringify({
																mid: '185150299'
															})
														}
													]
												]
											}
							}
						)
					).to.be.true;
				}

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
				editMessageTextTGSpy.resetHistory();
			}

			arrayCheckerStub.restore();
		});

		it('should handle when update cached messages failed in parallel', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			let arrayCheckerStub = sinon.stub(MiscUtil, 'areArraysEqualByIndex');
			arrayCheckerStub.onCall(0).returns(false);
			arrayCheckerStub.onCall(1).returns(true);
			arrayCheckerStub.onCall(2).returns(false);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150655', {
				userId: 185150,
				messageId: 655,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150655')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 655,
					tool: 'upscaleimage',
					fileType: 'image',
					files: []
				}
			);

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/sit`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/consectetur`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'lorem', file_size: 4444321, file_unique_id: '0a' }
						],
						reply_to_message: { message_id: 655 }
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'ipsum', file_size: 253425, file_unique_id: '1a' },
							{ file_id: 'dolor', file_size: 3267323, file_unique_id: '1b' },
							{ file_id: 'sit', file_size: 2435365, file_unique_id: '1c' }
						],
						reply_to_message: { message_id: 655 }
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validatePhotoMessageMedia(
				{
					...ctx,
					message: {
						photo: [
							{ file_id: 'amet', file_size: 21241, file_unique_id: '2a' },
							{
								file_id: 'consectetur',
								file_size: 245321,
								file_unique_id: '2b'
							}
						],
						reply_to_message: { message_id: 655 }
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.calledThrice).to.be.true;
			expect(deleteMessageSpy.calledTwice).to.be.true;
			expect(replySpy.calledTwice).to.be.true;
			expect(
				replySpy.firstCall.calledWithExactly(
					`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
				)
			).to.be.true;
			expect(
				replySpy.secondCall.calledWithExactly(
					`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
				)
			).to.be.true;
			expect(editMessageTextTGSpy.calledOnce).to.be.true;

			getFileLinkSpy.restore();
			withLockSpy.restore();
			TTLCacheSetter.restore();
			deleteMessageSpy.resetHistory();
			replySpy.resetHistory();
			editMessageTextTGSpy.resetHistory();
			arrayCheckerStub.restore();
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
						`\n\n💡 Kamu bisa mengirim gambar sebagai dokumen atau mematikan kompresi file supaya kualitas gambarnya tetap bagus.` +
						`\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`,
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

		it('should handle the messages when media are valid', async () => {
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

		it('should ignore the messages when cached message are unavailable', async () => {
			TTLCache.userMessageUploadCache.clear();

			ctx.chat = {
				id: 185150
			};
			ctx.message = {
				document: {
					file_id: 'ipsum',
					file_size: 4444321,
					mime_type: 'application/pdf'
				},
				reply_to_message: {
					message_id: 55
				}
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');

			await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

			expect(withLockSpy.calledOnceWith('18515055')).to.be.true;

			withLockSpy.restore();
		});

		it('should ignore the messages when cached message are expired', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('18515078', {
				userId: 185150,
				messageId: 78,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			expect(TTLCache.userMessageUploadCache.get('18515078')).to.be.deep.equal({
				userId: 185150,
				messageId: 78,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			ctx.chat = {
				id: 185150
			};
			ctx.message = {
				document: {
					file_id: 'ipsum',
					file_size: 4444321,
					mime_type: 'application/pdf'
				},
				reply_to_message: {
					message_id: 78
				}
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');

			// Wait 2.1s to ensure cached message are expired.
			await new Promise((res) => setTimeout(res, 2100));
			await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

			expect(TTLCache.userMessageUploadCache.get('18515078')).to.be.undefined;
			expect(withLockSpy.calledOnceWith('18515078')).to.be.true;

			withLockSpy.restore();
		});

		it('should ignore the messages in sequentially when media and cached message fileType (PDF) are invalid', async () => {
			const setup = [
				{
					document: {
						file_id: 'lorem',
						file_name: 'lorem.png',
						file_size: 2212321,
						mime_type: 'image/png'
					},
					reply_to_message: {
						message_id: 956
					}
				},
				{
					document: {
						file_id: 'ipsum',
						file_name: 'ipsum.jpeg',
						file_size: 3444321,
						mime_type: 'image/jpeg'
					},
					reply_to_message: {
						message_id: 956
					}
				},
				{
					document: {
						file_id: 'dolor',
						file_name: 'dolor.png',
						file_size: 1333321,
						mime_type: 'image/png'
					},
					reply_to_message: {
						message_id: 956
					}
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150956', {
				userId: 185150,
				messageId: 956,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150956')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 956,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			for (const msg of setup) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(`https://api.mocked.org/media/${msg.document.file_name}`)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(withLockSpy.calledOnceWith('185150956')).to.be.true;
				expect(getFileLinkSpy.notCalled).to.be.true;
				expect(TTLCacheSetter.notCalled).to.be.true;
				expect(editMessageTextTGSpy.notCalled).to.be.true;
				expect(deleteMessageSpy.notCalled).to.be.true;
				expect(replySpy.notCalled).to.be.true;

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				editMessageTextTGSpy.resetHistory();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}

			const final = TTLCache.userMessageUploadCache.get('185150956');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 956,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
		});

		it('should ignore the messages in parallel when media and cached message fileType (PDF) are invalid', async () => {
			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150333', {
				userId: 185150,
				messageId: 333,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150333')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 333,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem.png`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/ipsum.jpeg`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/dolor.png`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'lorem',
							file_name: 'lorem.png',
							file_size: 2212321,
							mime_type: 'image/png'
						},
						reply_to_message: {
							message_id: 333
						}
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'ipsum',
							file_name: 'ipsum.jpeg',
							file_size: 3444321,
							mime_type: 'image/jpeg'
						},
						reply_to_message: {
							message_id: 333
						}
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'dolor',
							file_name: 'dolor.png',
							file_size: 1333321,
							mime_type: 'image/png'
						},
						reply_to_message: {
							message_id: 333
						}
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.notCalled).to.be.true;
			expect(editMessageTextTGSpy.notCalled).to.be.true;
			expect(deleteMessageSpy.notCalled).to.be.true;
			expect(replySpy.notCalled).to.be.true;

			const final = TTLCache.userMessageUploadCache.get('185150333');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 333,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			getFileLinkSpy.restore();
			withLockSpy.restore();
			TTLCacheSetter.restore();
			editMessageTextTGSpy.resetHistory();
			deleteMessageSpy.resetHistory();
			replySpy.resetHistory();
		});

		it('should update cached messages in sequentially when media and cached message fileType (PDF) are valid', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const setup = [
				{
					document: {
						file_id: 'lorem',
						file_name: 'lorem.pdf',
						file_size: 1212321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 21
					}
				},
				{
					document: {
						file_id: 'ipsum',
						file_name: 'ipsum.pdf',
						file_size: 4444321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 21
					}
				},
				{
					document: {
						file_id: 'dolor',
						file_name: 'dolor.pdf',
						file_size: 2333321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 21
					}
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('18515021', {
				userId: 185150,
				messageId: 21,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('18515021')).to.be.deep.equal({
				userId: 185150,
				messageId: 21,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			for (const msg of setup) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(`https://api.mocked.org/media/${msg.document.file_name}`)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				const data = TTLCache.userMessageUploadCache.get('18515021');

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				const fileURL = await getFileLinkSpy.firstCall.returnValue;
				const updatedFiles = [
					...data.files,
					{ fileName: msg.document.file_name, fileLink: fileURL.toString() }
				];
				const updatedFilesName = updatedFiles.map((file) => file.fileName);

				expect(withLockSpy.calledOnceWith('18515021')).to.be.true;
				expect(getFileLinkSpy.calledOnceWithExactly(msg.document.file_id)).to.be
					.true;
				expect(
					TTLCacheSetter.calledOnceWithExactly(
						'18515021',
						{ ...data, files: updatedFiles },
						{ noUpdateTTL: true }
					)
				).to.be.true;
				expect(
					editMessageTextTGSpy.calledOnceWithExactly(
						185150,
						21,
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
														callback_data: JSON.stringify({ mid: '18515021' })
													}
												]
											]
										}
						}
					)
				).to.be.true;

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				editMessageTextTGSpy.resetHistory();
			}

			const final = TTLCache.userMessageUploadCache.get('18515021');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 21,
				tool: 'merge',
				fileType: 'pdf',
				files: [
					{
						fileName: 'lorem.pdf',
						fileLink: 'https://api.mocked.org/media/lorem.pdf'
					},
					{
						fileName: 'ipsum.pdf',
						fileLink: 'https://api.mocked.org/media/ipsum.pdf'
					},
					{
						fileName: 'dolor.pdf',
						fileLink: 'https://api.mocked.org/media/dolor.pdf'
					}
				]
			});
		});

		it('should update cached messages in parallel when media and cached message fileType (PDF) are valid', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150565', {
				userId: 185150,
				messageId: 565,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150565')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 565,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem.pdf`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/ipsum.pdf`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/dolor.pdf`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'lorem',
							file_name: 'lorem.pdf',
							file_size: 1212321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 565
						}
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'ipsum',
							file_name: 'ipsum.pdf',
							file_size: 4444321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 565
						}
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'dolor',
							file_name: 'dolor.pdf',
							file_size: 2333321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 565
						}
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.calledThrice).to.be.true;
			expect(editMessageTextTGSpy.calledThrice).to.be.true;
			expect(
				editMessageTextTGSpy.alwaysCalledWithMatch(
					185150,
					565,
					undefined,
					'Silahkan kirim file PDF yang ingin diproses dengan membalas pesan ini. ' +
						'Pastikan setiap file berformat PDF dan ukurannya tidak lebih dari 5MB. ' +
						'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar. \n\n'
				)
			).to.be.true;

			const final = TTLCache.userMessageUploadCache.get('185150565');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 565,
				tool: 'merge',
				fileType: 'pdf',
				files: [
					{
						fileName: 'lorem.pdf',
						fileLink: 'https://api.mocked.org/media/lorem.pdf'
					},
					{
						fileName: 'ipsum.pdf',
						fileLink: 'https://api.mocked.org/media/ipsum.pdf'
					},
					{
						fileName: 'dolor.pdf',
						fileLink: 'https://api.mocked.org/media/dolor.pdf'
					}
				]
			});

			getFileLinkSpy.restore();
			withLockSpy.restore();
			TTLCacheSetter.restore();
			editMessageTextTGSpy.resetHistory();
		});

		it('should ignore the messages in sequentially when media and cached message fileType (image) are invalid', async () => {
			const setup = [
				{
					document: {
						file_id: 'lorem',
						file_name: 'lorem.pdf',
						file_size: 1212321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 111
					}
				},
				{
					document: {
						file_id: 'ipsum',
						file_name: 'ipsum.pdf',
						file_size: 1444321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 111
					}
				},
				{
					document: {
						file_id: 'dolor',
						file_name: 'dolor.pdf',
						file_size: 3333321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 111
					}
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150111', {
				userId: 185150,
				messageId: 111,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150111')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 111,
					tool: 'upscaleimage',
					fileType: 'image',
					files: []
				}
			);

			for (const msg of setup) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(`https://api.mocked.org/media/${msg.document.file_name}`)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				expect(withLockSpy.calledOnceWith('185150111')).to.be.true;
				expect(getFileLinkSpy.notCalled).to.be.true;
				expect(TTLCacheSetter.notCalled).to.be.true;
				expect(editMessageTextTGSpy.notCalled).to.be.true;
				expect(deleteMessageSpy.notCalled).to.be.true;
				expect(replySpy.notCalled).to.be.true;

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				editMessageTextTGSpy.resetHistory();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
			}

			const final = TTLCache.userMessageUploadCache.get('185150111');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 111,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
		});

		it('should ignore the messages in parallel when media and cached message fileType (image) are invalid', async () => {
			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150211', {
				userId: 185150,
				messageId: 211,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150211')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 211,
					tool: 'upscaleimage',
					fileType: 'image',
					files: []
				}
			);

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem.pdf`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/ipsum.pdf`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/dolor.pdf`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'lorem',
							file_name: 'lorem.pdf',
							file_size: 1212321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 211
						}
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'ipsum',
							file_name: 'ipsum.pdf',
							file_size: 2444321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 211
						}
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'dolor',
							file_name: 'dolor.pdf',
							file_size: 2333321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 211
						}
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.notCalled).to.be.true;
			expect(editMessageTextTGSpy.notCalled).to.be.true;
			expect(deleteMessageSpy.notCalled).to.be.true;
			expect(replySpy.notCalled).to.be.true;

			const final = TTLCache.userMessageUploadCache.get('185150211');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 211,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});

			getFileLinkSpy.restore();
			withLockSpy.restore();
			TTLCacheSetter.restore();
			editMessageTextTGSpy.resetHistory();
			deleteMessageSpy.resetHistory();
			replySpy.resetHistory();
		});

		it('should update cached messages in sequentially when media and cached message fileType (image) are valid', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const setup = [
				{
					document: {
						file_id: 'lorem',
						file_name: 'lorem.png',
						file_size: 1212321,
						mime_type: 'image/png'
					},
					reply_to_message: {
						message_id: 2142
					}
				},
				{
					document: {
						file_id: 'ipsum',
						file_name: 'ipsum.png',
						file_size: 4444321,
						mime_type: 'image/png'
					},
					reply_to_message: {
						message_id: 2142
					}
				},
				{
					document: {
						file_id: 'dolor',
						file_name: 'dolor.jpeg',
						file_size: 2333321,
						mime_type: 'image/jpeg'
					},
					reply_to_message: {
						message_id: 2142
					}
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('1851502142', {
				userId: 185150,
				messageId: 2142,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(
				TTLCache.userMessageUploadCache.get('1851502142')
			).to.be.deep.equal({
				userId: 185150,
				messageId: 2142,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});

			for (const msg of setup) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(`https://api.mocked.org/media/${msg.document.file_name}`)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				const data = TTLCache.userMessageUploadCache.get('1851502142');

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				const fileURL = await getFileLinkSpy.firstCall.returnValue;
				const updatedFiles = [
					...data.files,
					{ fileName: msg.document.file_name, fileLink: fileURL.toString() }
				];
				const updatedFilesName = updatedFiles.map((file) => file.fileName);

				expect(withLockSpy.calledOnceWith('1851502142')).to.be.true;
				expect(getFileLinkSpy.calledOnceWithExactly(msg.document.file_id)).to.be
					.true;
				expect(
					TTLCacheSetter.calledOnceWithExactly(
						'1851502142',
						{ ...data, files: updatedFiles },
						{ noUpdateTTL: true }
					)
				).to.be.true;
				expect(
					editMessageTextTGSpy.calledOnceWithExactly(
						185150,
						2142,
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
														callback_data: JSON.stringify({ mid: '1851502142' })
													}
												]
											]
										}
						}
					)
				).to.be.true;

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				editMessageTextTGSpy.resetHistory();
			}

			const final = TTLCache.userMessageUploadCache.get('1851502142');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 2142,
				tool: 'upscaleimage',
				fileType: 'image',
				files: [
					{
						fileName: 'lorem.png',
						fileLink: 'https://api.mocked.org/media/lorem.png'
					},
					{
						fileName: 'ipsum.png',
						fileLink: 'https://api.mocked.org/media/ipsum.png'
					},
					{
						fileName: 'dolor.jpeg',
						fileLink: 'https://api.mocked.org/media/dolor.jpeg'
					}
				]
			});
		});

		it('should update cached messages in parallel when media and cached message fileType (image) are valid', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('1851501313', {
				userId: 185150,
				messageId: 1313,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});
			getFileLinkSpy.restore();

			expect(
				TTLCache.userMessageUploadCache.get('1851501313')
			).to.be.deep.equal({
				userId: 185150,
				messageId: 1313,
				tool: 'upscaleimage',
				fileType: 'image',
				files: []
			});

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem.png`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/ipsum.png`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/dolor.jpeg`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'lorem',
							file_name: 'lorem.png',
							file_size: 1212321,
							mime_type: 'image/png'
						},
						reply_to_message: {
							message_id: 1313
						}
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'ipsum',
							file_name: 'ipsum.png',
							file_size: 4444321,
							mime_type: 'image/png'
						},
						reply_to_message: {
							message_id: 1313
						}
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'dolor',
							file_name: 'dolor.jpeg',
							file_size: 2333321,
							mime_type: 'image/jpeg'
						},
						reply_to_message: {
							message_id: 1313
						}
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.calledThrice).to.be.true;
			expect(editMessageTextTGSpy.calledThrice).to.be.true;
			expect(
				editMessageTextTGSpy.alwaysCalledWithMatch(
					185150,
					1313,
					undefined,
					'Silahkan kirim file yang ingin diproses dengan membalas pesan ini. ' +
						'Pastikan setiap file berformat (.jpg, .png, .jpeg) dan ukurannya tidak lebih dari 5MB. ' +
						'File yang sudah dikirim akan ditampilkan dalam pesan ini secara berurutan — pastikan urutannya sudah benar. \n\n'
				)
			).to.be.true;

			const final = TTLCache.userMessageUploadCache.get('1851501313');

			expect(final).to.be.deep.equal({
				userId: 185150,
				messageId: 1313,
				tool: 'upscaleimage',
				fileType: 'image',
				files: [
					{
						fileName: 'lorem.png',
						fileLink: 'https://api.mocked.org/media/lorem.png'
					},
					{
						fileName: 'ipsum.png',
						fileLink: 'https://api.mocked.org/media/ipsum.png'
					},
					{
						fileName: 'dolor.jpeg',
						fileLink: 'https://api.mocked.org/media/dolor.jpeg'
					}
				]
			});

			getFileLinkSpy.restore();
			withLockSpy.restore();
			TTLCacheSetter.restore();
			editMessageTextTGSpy.resetHistory();
		});

		it('should handle when update cached messages failed in sequentially', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			let arrayCheckerStub = sinon.stub(MiscUtil, 'areArraysEqualByIndex');
			arrayCheckerStub.onCall(0).returns(true);
			arrayCheckerStub.onCall(1).returns(false);
			arrayCheckerStub.onCall(2).returns(true);

			const setup = [
				{
					document: {
						file_id: 'lorem',
						file_name: 'lorem.pdf',
						file_size: 1212321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 321
					}
				},
				{
					document: {
						file_id: 'ipsum',
						file_name: 'ipsum.pdf',
						file_size: 4444321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 321
					}
				},
				{
					document: {
						file_id: 'dolor',
						file_name: 'dolor.pdf',
						file_size: 2333321,
						mime_type: 'application/pdf'
					},
					reply_to_message: {
						message_id: 321
					}
				}
			];

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150321', {
				userId: 185150,
				messageId: 321,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150321')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 321,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			for (const [index, msg] of setup.entries()) {
				getFileLinkSpy = sinon
					.stub(ctx.telegram, 'getFileLink')
					.resolves(
						new URL(`https://api.mocked.org/media/${msg.document.file_name}`)
					);
				let withLockSpy = sinon.spy(TTLCache, 'withLock');
				let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

				ctx.chat = {
					id: 185150
				};
				ctx.message = msg;

				const data = TTLCache.userMessageUploadCache.get('185150321');

				await BotMiddleware.validateDocumentMessageMedia(ctx, next.handler);

				const fileURL = await getFileLinkSpy.firstCall.returnValue;
				const updatedFiles = [
					...data.files,
					{ fileName: msg.document.file_name, fileLink: fileURL.toString() }
				];
				const updatedFilesName = updatedFiles.map((file) => file.fileName);

				expect(withLockSpy.calledOnceWith('185150321')).to.be.true;
				expect(getFileLinkSpy.calledOnceWithExactly(msg.document.file_id)).to.be
					.true;
				expect(
					TTLCacheSetter.calledOnceWithExactly(
						'185150321',
						{ ...data, files: updatedFiles },
						{ noUpdateTTL: true }
					)
				).to.be.true;

				if (index === 1) {
					expect(ctx?.state?.response?.message).to.be.equal(
						`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
					);
					expect(deleteMessageSpy.calledOnce).to.be.true;
					expect(
						replySpy.calledOnceWithExactly(
							`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
						)
					).to.be.true;
				} else {
					expect(
						editMessageTextTGSpy.calledOnceWithExactly(
							185150,
							321,
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
															callback_data: JSON.stringify({
																mid: '185150321'
															})
														}
													]
												]
											}
							}
						)
					).to.be.true;
				}

				withLockSpy.restore();
				getFileLinkSpy.restore();
				TTLCacheSetter.restore();
				deleteMessageSpy.resetHistory();
				replySpy.resetHistory();
				editMessageTextTGSpy.resetHistory();
			}

			arrayCheckerStub.restore();
		});

		it('should handle when update cached messages failed in parallel', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			let arrayCheckerStub = sinon.stub(MiscUtil, 'areArraysEqualByIndex');
			arrayCheckerStub.onCall(0).returns(false);
			arrayCheckerStub.onCall(1).returns(true);
			arrayCheckerStub.onCall(2).returns(false);

			TTLCache.userMessageUploadCache.clear();
			TTLCache.userMessageUploadCache.set('185150333', {
				userId: 185150,
				messageId: 333,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
			getFileLinkSpy.restore();

			expect(TTLCache.userMessageUploadCache.get('185150333')).to.be.deep.equal(
				{
					userId: 185150,
					messageId: 333,
					tool: 'merge',
					fileType: 'pdf',
					files: []
				}
			);

			getFileLinkSpy = sinon.stub(ctx.telegram, 'getFileLink');
			getFileLinkSpy
				.onCall(0)
				.resolves(new URL(`https://api.mocked.org/media/lorem.pdf`));
			getFileLinkSpy
				.onCall(1)
				.resolves(new URL(`https://api.mocked.org/media/ipsum.pdf`));
			getFileLinkSpy
				.onCall(2)
				.resolves(new URL(`https://api.mocked.org/media/dolor.pdf`));

			ctx.chat = {
				id: 185150
			};

			let withLockSpy = sinon.spy(TTLCache, 'withLock');
			let TTLCacheSetter = sinon.spy(TTLCache.userMessageUploadCache, 'set');

			const p1 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'lorem',
							file_name: 'lorem.pdf',
							file_size: 1212321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 333
						}
					}
				},
				next.handler
			);

			const p2 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'ipsum',
							file_name: 'ipsum.pdf',
							file_size: 4444321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 333
						}
					}
				},
				next.handler
			);

			const p3 = BotMiddleware.validateDocumentMessageMedia(
				{
					...ctx,
					message: {
						document: {
							file_id: 'dolor',
							file_name: 'dolor.pdf',
							file_size: 2333321,
							mime_type: 'application/pdf'
						},
						reply_to_message: {
							message_id: 333
						}
					}
				},
				next.handler
			);

			await Promise.all([p1, p2, p3]);

			expect(withLockSpy.calledThrice).to.be.true;
			expect(TTLCacheSetter.calledThrice).to.be.true;
			expect(deleteMessageSpy.calledTwice).to.be.true;
			expect(replySpy.calledTwice).to.be.true;
			expect(
				replySpy.firstCall.calledWithExactly(
					`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
				)
			).to.be.true;
			expect(
				replySpy.secondCall.calledWithExactly(
					`Duh! Ada file yang gagal diterima Filebuds karna kesalahan diserver. Mohon maaf, kamu perlu mengirim ulang file tersebut😔`
				)
			).to.be.true;
			expect(editMessageTextTGSpy.calledOnce).to.be.true;

			getFileLinkSpy.restore();
			withLockSpy.restore();
			TTLCacheSetter.restore();
			deleteMessageSpy.resetHistory();
			replySpy.resetHistory();
			editMessageTextTGSpy.resetHistory();
			arrayCheckerStub.restore();
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

	describe('initDailyCredits()', () => {
		let initDailyCreditsStub =
			/** @type {import('sinon').SinonSpy<typeof SharedCreditManager.initDailyCredits>} */ (
				undefined
			);

		beforeEach(() => {
			initDailyCreditsStub = sinon
				.stub(SharedCreditManager, 'initDailyCredits')
				.resolves(undefined);
		});

		afterEach(() => {
			initDailyCreditsStub.restore();
		});

		it('should ignore the command if the chat is not from an admin', async () => {
			const invalidAdminIds = ['1185191684', 1385291484];

			for (const id of invalidAdminIds) {
				ctx.from = { id };

				await BotMiddleware.initDailyCredits(ctx, next.handler);

				expect(initDailyCreditsStub.notCalled).to.be.true;
				expect(replySpy.notCalled).to.be.true;

				initDailyCreditsStub.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should set shared daily credits to the fallback value when argument is not provided', async () => {
			await BotMiddleware.initDailyCredits(ctx, next.handler);

			expect(
				initDailyCreditsStub.calledOnceWithExactly(DAILY_SHARED_CREDIT_LIMIT)
			).to.be.true;
			expect(
				replySpy.calledOnceWithExactly(
					`Successfully initialized daily credits with ${DAILY_SHARED_CREDIT_LIMIT} credits✅`
				)
			).to.be.true;
		});

		it('should set shared daily credits to the fallback value when argument is not a number', async () => {
			const args = [
				['lorem', 'ipsum'],
				[{ credits: 5 }, 'dolor'],
				[true],
				[['lorem'], 'ipsum', 'dolor']
			];

			for (const arg of args) {
				ctx.args = arg;

				await BotMiddleware.initDailyCredits(ctx, next.handler);

				expect(
					initDailyCreditsStub.calledOnceWithExactly(DAILY_SHARED_CREDIT_LIMIT)
				).to.be.true;
				expect(
					replySpy.calledOnceWithExactly(
						`Successfully initialized daily credits with ${DAILY_SHARED_CREDIT_LIMIT} credits✅`
					)
				).to.be.true;

				initDailyCreditsStub.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should set shared daily credits to the fallback value when argument is zero or negative number', async () => {
			const args = [['-2325'], ['-10'], ['0'], [0], [-25], [-5785]];

			for (const arg of args) {
				ctx.args = arg;

				await BotMiddleware.initDailyCredits(ctx, next.handler);

				expect(
					initDailyCreditsStub.calledOnceWithExactly(DAILY_SHARED_CREDIT_LIMIT)
				).to.be.true;
				expect(
					replySpy.calledOnceWithExactly(
						`Successfully initialized daily credits with ${DAILY_SHARED_CREDIT_LIMIT} credits✅`
					)
				).to.be.true;

				initDailyCreditsStub.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should set shared daily credits to the provided value when argument is valid', async () => {
			const vals = [
				{ args: ['1025', 'lorem'], value: 1025 },
				{ args: ['325', {}], value: 325 },
				{ args: ['50', []], value: 50 },
				{ args: ['3250', false], value: 3250 }
			];

			for (const val of vals) {
				ctx.args = val.args;

				await BotMiddleware.initDailyCredits(ctx, next.handler);

				expect(initDailyCreditsStub.calledOnceWithExactly(val.value)).to.be
					.true;
				expect(
					replySpy.calledOnceWithExactly(
						`Successfully initialized daily credits with ${val.value} credits✅`
					)
				).to.be.true;

				initDailyCreditsStub.resetHistory();
				replySpy.resetHistory();
			}
		});

		it('should handle error gracefully when an exception is thrown during execution', async () => {
			initDailyCreditsStub.restore();
			initDailyCreditsStub = sinon
				.stub(SharedCreditManager, 'initDailyCredits')
				.rejects(new Error('Simulating Error'));

			ctx.args = ['250'];

			await BotMiddleware.initDailyCredits(ctx, next.handler);

			expect(
				replySpy.calledOnceWithExactly('Failed to initialize daily credits❌')
			).to.be.true;
		});
	});

	describe('getRateLimiterStates()', () => {
		it('should ignore the command if the chat is not from an admin', async () => {
			let jobTrackingRateLimiterSpy = sinon.spy(
				BotMiddleware.CallbackQueryJobTrackingRateLimiter,
				'entries'
			);
			let taskInitRateLimiterSpy = sinon.spy(
				BotMiddleware.CallbackQueryTaskInitRateLimiter,
				'entries'
			);

			const invalidAdminIds = ['1185191684', 1385291484];

			for (const id of invalidAdminIds) {
				ctx.from = { id };

				await BotMiddleware.getRateLimiterStates(ctx, next.handler);

				expect(jobTrackingRateLimiterSpy.notCalled).to.be.true;
				expect(taskInitRateLimiterSpy.notCalled).to.be.true;
				expect(replyWithMarkdownV2Spy.notCalled).to.be.true;

				jobTrackingRateLimiterSpy.resetHistory();
				taskInitRateLimiterSpy.resetHistory();
			}

			jobTrackingRateLimiterSpy.restore();
			taskInitRateLimiterSpy.restore();
		});

		it('should retrieve rate limiter states and reply with a formatted message', async () => {
			const jobTracking = BotMiddleware.CallbackQueryJobTrackingRateLimiter;
			const taskInit = BotMiddleware.CallbackQueryTaskInitRateLimiter;

			jobTracking.clear();
			taskInit.clear();

			const jobTrackingEntries = {
				185150: 10,
				195150: 2,
				205150: 4,
				215150: 15,
				225150: 13,
				235150: 5,
				245150: 11,
				255150: 9
			};

			const taskInitEntries = {
				185150: 1,
				195150: 2,
				205150: 3,
				215150: 2,
				225150: 1
			};

			// Configure the job tracking rate limiter and populate it with test entries.
			jobTracking.max = 150;
			jobTracking.setMaxAttempt(10);
			for (const [key, value] of Object.entries(jobTrackingEntries)) {
				for (let i = 0; i < value; i++) {
					jobTracking.attempt(key);
				}
			}

			// Configure the task init rate limiter and populate it with test entries.
			taskInit.max = 150;
			for (const [key, value] of Object.entries(taskInitEntries)) {
				for (let i = 0; i < value; i++) {
					taskInit.attempt(key);
				}
			}

			// Ensure the rate limiter is properly set up with the expected entries before invoking the middleware.
			expect(jobTracking.size).to.be.eq(8);
			expect(
				Array.from(jobTracking.entries()).filter(
					([, attempt]) => attempt >= jobTracking.maxAttempt
				).length
			).to.be.eq(4);
			expect(taskInit.size).to.be.eq(5);
			expect(
				Array.from(taskInit.entries()).filter(
					([, attempt]) => attempt >= taskInit.maxAttempt
				).length
			).to.be.eq(3);

			// Call the middleware.
			await BotMiddleware.getRateLimiterStates(ctx, next.handler);

			// Ensure middleware send rate limiter states with a formatted message.
			const formatLimiterState = (label, limiter) => {
				const limitedCount = Array.from(limiter.entries()).filter(
					([, attempt]) => attempt >= limiter.maxAttempt
				).length;

				return (
					`*${label}*\n` +
					`• Usage: \`${limiter.size}/${limiter.max}\`\n` +
					`• Limited: \`${limitedCount}/${limiter.max}\`\n` +
					`• TTL: \`${dayjs.duration(limiter.ttl).asSeconds()} seconds\`\n` +
					`• Max Attempts: \`${limiter.maxAttempt}\`\n`
				);
			};

			const message = [
				formatLimiterState('Job Tracking Rate Limiter', jobTracking),
				formatLimiterState('Task Init Rate Limiter', taskInit)
			].join('\n');

			expect(
				replyWithMarkdownV2Spy.calledOnceWithExactly(message, {
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: 'Clear Job Tracking',
									callback_data: JSON.stringify({
										event: 'clear_job_tracking_rl'
									})
								},
								{
									text: 'Clear Task Init',
									callback_data: JSON.stringify({
										event: 'clear_task_init_rl'
									})
								}
							],
							[
								{
									text: 'Clear All Rate Limiter',
									callback_data: JSON.stringify({
										event: 'clear_all_rl'
									})
								}
							]
						]
					}
				})
			).to.be.true;

			// Clears all rate limiter entries and re-applies test environment settings to the rate limiter instances.
			jobTracking.clear();
			jobTracking.max = 3;
			jobTracking.setMaxAttempt(2);
			taskInit.clear();
			taskInit.max = 3;
		});

		it('should handle error gracefully when an exception is thrown during execution', async () => {
			let jobTrackingRateLimiterStub = sinon
				.stub(BotMiddleware.CallbackQueryJobTrackingRateLimiter, 'entries')
				.throws(new Error('Simulating Job Tracking Error'));

			await BotMiddleware.getRateLimiterStates(ctx, next.handler);

			expect(
				replySpy.calledOnceWithExactly(
					'Failed to retrieve rate limiter states❌'
				)
			).to.be.true;

			// Reset and restore all stubs and spies before running the next test case.
			jobTrackingRateLimiterStub.restore();
			replySpy.resetHistory();

			let taskInitRateLimiterStub = sinon
				.stub(BotMiddleware.CallbackQueryTaskInitRateLimiter, 'entries')
				.throws(new Error('Simulating Task Init Error'));

			await BotMiddleware.getRateLimiterStates(ctx, next.handler);

			expect(
				replySpy.calledOnceWithExactly(
					'Failed to retrieve rate limiter states❌'
				)
			).to.be.true;

			taskInitRateLimiterStub.restore();
		});
	});

	describe('setJobTrackingRateLimiterMaxAttempt()', () => {
		let setMaxAttemptSpy =
			/** @type {import('sinon').SinonSpy<typeof BotMiddleware.CallbackQueryJobTrackingRateLimiter.setMaxAttempt>} */ (
				undefined
			);

		beforeEach(() => {
			setMaxAttemptSpy = sinon.spy(
				BotMiddleware.CallbackQueryJobTrackingRateLimiter,
				'setMaxAttempt'
			);
		});

		afterEach(() => {
			setMaxAttemptSpy.restore();
		});

		after(() => {
			BotMiddleware.CallbackQueryJobTrackingRateLimiter.setMaxAttempt(2);
		});

		it('should ignore the command if the chat is not from an admin', async () => {
			const invalidAdminIds = ['1185191684', 1385291484];

			for (const id of invalidAdminIds) {
				ctx.from = { id };

				await BotMiddleware.setJobTrackingRateLimiterMaxAttempt(
					ctx,
					next.handler
				);

				expect(setMaxAttemptSpy.notCalled).to.be.true;

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should set rate limiter maxAttempt to the fallback value when argument is not provided', async () => {
			await BotMiddleware.setJobTrackingRateLimiterMaxAttempt(
				ctx,
				next.handler
			);

			expect(setMaxAttemptSpy.calledOnceWithExactly(10)).to.be.true;
			expect(
				BotMiddleware.CallbackQueryJobTrackingRateLimiter.maxAttempt
			).to.be.eq(10);
		});

		it('should set rate limiter maxAttempt to the fallback value when argument is not a number', async () => {
			const args = [
				['lorem', 'ipsum'],
				[{ maxAttempt: 5 }, 'dolor'],
				[true],
				[['lorem'], 'ipsum', 'dolor']
			];

			for (const arg of args) {
				ctx.args = arg;

				await BotMiddleware.setJobTrackingRateLimiterMaxAttempt(
					ctx,
					next.handler
				);

				expect(setMaxAttemptSpy.calledOnceWithExactly(10)).to.be.true;
				expect(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter.maxAttempt
				).to.be.eq(10);

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should set rate limiter maxAttempt to the fallback value when argument is zero or negative number', async () => {
			const args = [['-2325'], ['-10'], ['0'], [0], [-25], [-5785]];

			for (const arg of args) {
				ctx.args = arg;

				await BotMiddleware.setJobTrackingRateLimiterMaxAttempt(
					ctx,
					next.handler
				);

				expect(setMaxAttemptSpy.calledOnceWithExactly(10)).to.be.true;
				expect(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter.maxAttempt
				).to.be.eq(10);

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should set rate limiter maxAttempt to the provided value when argument is valid', async () => {
			const vals = [
				{ args: ['15', 'lorem'], value: 15 },
				{ args: ['22', {}], value: 22 },
				{ args: ['3', []], value: 3 },
				{ args: ['325', false], value: 325 }
			];

			for (const val of vals) {
				ctx.args = val.args;

				await BotMiddleware.setJobTrackingRateLimiterMaxAttempt(
					ctx,
					next.handler
				);

				expect(setMaxAttemptSpy.calledOnceWithExactly(val.value)).to.be.true;
				expect(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter.maxAttempt
				).to.be.eq(val.value);

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should handle error gracefully when an exception is thrown during execution', async () => {
			setMaxAttemptSpy.restore();

			setMaxAttemptSpy = sinon
				.stub(
					BotMiddleware.CallbackQueryJobTrackingRateLimiter,
					'setMaxAttempt'
				)
				.throws(new Error('Simulating Error'));

			await BotMiddleware.setJobTrackingRateLimiterMaxAttempt(
				ctx,
				next.handler
			);

			expect(
				replySpy.calledOnceWithExactly(
					'Failed to set job tracking rate limiter max attempt❌'
				)
			).to.be.true;
		});
	});

	describe('setTaskInitRateLimiterMaxAttempt', () => {
		let setMaxAttemptSpy =
			/** @type {import('sinon').SinonSpy<typeof BotMiddleware.CallbackQueryTaskInitRateLimiter.setMaxAttempt>} */ (
				undefined
			);

		beforeEach(() => {
			setMaxAttemptSpy = sinon.spy(
				BotMiddleware.CallbackQueryTaskInitRateLimiter,
				'setMaxAttempt'
			);
		});

		afterEach(() => {
			setMaxAttemptSpy.restore();
		});

		after(() => {
			BotMiddleware.CallbackQueryTaskInitRateLimiter.setMaxAttempt(2);
		});

		it('should ignore the command if the chat is not from an admin', async () => {
			const invalidAdminIds = ['1185191684', 1385291484];

			for (const id of invalidAdminIds) {
				ctx.from = { id };

				await BotMiddleware.setTaskInitRateLimiterMaxAttempt(ctx, next.handler);

				expect(setMaxAttemptSpy.notCalled).to.be.true;

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should set rate limiter maxAttempt to the fallback value when argument is not provided', async () => {
			await BotMiddleware.setTaskInitRateLimiterMaxAttempt(ctx, next.handler);

			expect(setMaxAttemptSpy.calledOnceWithExactly(2)).to.be.true;
			expect(
				BotMiddleware.CallbackQueryTaskInitRateLimiter.maxAttempt
			).to.be.eq(2);
		});

		it('should set rate limiter maxAttempt to the fallback value when argument is not a number', async () => {
			const args = [
				['lorem', 'ipsum'],
				[{ maxAttempt: 5 }, 'dolor'],
				[true],
				[['lorem'], 'ipsum', 'dolor']
			];

			for (const arg of args) {
				ctx.args = arg;

				await BotMiddleware.setTaskInitRateLimiterMaxAttempt(ctx, next.handler);

				expect(setMaxAttemptSpy.calledOnceWithExactly(2)).to.be.true;
				expect(
					BotMiddleware.CallbackQueryTaskInitRateLimiter.maxAttempt
				).to.be.eq(2);

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should set rate limiter maxAttempt to the fallback value when argument is zero or negative number', async () => {
			const args = [['-2325'], ['-10'], ['0'], [0], [-25], [-5785]];

			for (const arg of args) {
				ctx.args = arg;

				await BotMiddleware.setTaskInitRateLimiterMaxAttempt(ctx, next.handler);

				expect(setMaxAttemptSpy.calledOnceWithExactly(2)).to.be.true;
				expect(
					BotMiddleware.CallbackQueryTaskInitRateLimiter.maxAttempt
				).to.be.eq(2);

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should set rate limiter maxAttempt to the provided value when argument is valid', async () => {
			const vals = [
				{ args: ['15', 'lorem'], value: 15 },
				{ args: ['22', {}], value: 22 },
				{ args: ['3', []], value: 3 },
				{ args: ['325', false], value: 325 }
			];

			for (const val of vals) {
				ctx.args = val.args;

				await BotMiddleware.setTaskInitRateLimiterMaxAttempt(ctx, next.handler);

				expect(setMaxAttemptSpy.calledOnceWithExactly(val.value)).to.be.true;
				expect(
					BotMiddleware.CallbackQueryTaskInitRateLimiter.maxAttempt
				).to.be.eq(val.value);

				setMaxAttemptSpy.resetHistory();
			}
		});

		it('should handle error gracefully when an exception is thrown during execution', async () => {
			setMaxAttemptSpy.restore();

			setMaxAttemptSpy = sinon
				.stub(BotMiddleware.CallbackQueryTaskInitRateLimiter, 'setMaxAttempt')
				.throws(new Error('Simulating Error'));

			await BotMiddleware.setTaskInitRateLimiterMaxAttempt(ctx, next.handler);

			expect(
				replySpy.calledOnceWithExactly(
					'Failed to set task init rate limiter max attempt❌'
				)
			).to.be.true;
		});
	});

	describe('getSharedCreditStates()', () => {
		let getKeyForTodayStub =
			/** @type {import('sinon').SinonSpy<typeof SharedCreditManager.getKeyForToday>} */ (
				undefined
			);
		let compareCreditsLeftStub =
			/** @type {import('sinon').SinonSpy<typeof SharedCreditManager.compareCreditsLeft>} */ (
				undefined
			);

		beforeEach(() => {
			getKeyForTodayStub = sinon
				.stub(SharedCreditManager, 'getKeyForToday')
				.returns('sharedCredits:2025-12-05');
			compareCreditsLeftStub = sinon
				.stub(SharedCreditManager, 'compareCreditsLeft')
				.resolves({
					redisValue: 1025,
					supabaseValue: 1025,
					diff: 0,
					equal: true
				});
		});

		afterEach(() => {
			getKeyForTodayStub.restore();
			compareCreditsLeftStub.restore();
		});

		it('should ignore the command if the chat is not from an admin', async () => {
			const invalidAdminIds = ['1185191684', 1385291484];

			for (const id of invalidAdminIds) {
				ctx.from = { id };

				await BotMiddleware.getSharedCreditStates(ctx, next.handler);

				expect(getKeyForTodayStub.notCalled).to.be.true;
				expect(compareCreditsLeftStub.notCalled).to.be.true;
				expect(replyWithMarkdownV2Spy.notCalled).to.be.true;

				getKeyForTodayStub.resetHistory();
				compareCreditsLeftStub.resetHistory();
				replyWithMarkdownV2Spy.resetHistory();
			}
		});

		it('should retrieve shared credit states and reply with a formatted message', async () => {
			await BotMiddleware.getSharedCreditStates(ctx, next.handler);

			const message =
				`*Shared Credits 2025\\-12\\-05*\n` +
				`• Redis: \`1025\`\n` +
				`• Supabase: \`1025\`\n` +
				`• Diff: \`0\`\n` +
				`• Equal: \`true\`\n`;

			expect(getKeyForTodayStub.calledOnce).to.be.true;
			expect(getKeyForTodayStub.firstCall.returnValue).to.be.eq(
				'sharedCredits:2025-12-05'
			);
			expect(compareCreditsLeftStub.calledOnce).to.be.true;
			expect(
				await compareCreditsLeftStub.firstCall.returnValue
			).to.be.deep.equal({
				redisValue: 1025,
				supabaseValue: 1025,
				diff: 0,
				equal: true
			});
			expect(replyWithMarkdownV2Spy.calledOnceWithExactly(message)).to.be.true;
		});

		it('should handle error gracefully when an exception is thrown during execution', async () => {
			// Simulating getKeyForToday Error.
			getKeyForTodayStub.restore();
			getKeyForTodayStub = sinon
				.stub(SharedCreditManager, 'getKeyForToday')
				.throws(new Error('Simulating getKeyForToday Error'));

			await BotMiddleware.getSharedCreditStates(ctx, next.handler);

			expect(
				replySpy.calledOnceWithExactly(
					'Failed to retrieve shared credits states❌'
				)
			).to.be.true;

			// Reset stub and spy methods.
			replySpy.resetHistory();
			getKeyForTodayStub.restore();
			compareCreditsLeftStub.restore();

			// Simulating compareCreditsLeft Error.
			getKeyForTodayStub = sinon
				.stub(SharedCreditManager, 'getKeyForToday')
				.returns('sharedCredits:2025-12-05');

			compareCreditsLeftStub = sinon
				.stub(SharedCreditManager, 'compareCreditsLeft')
				.rejects(new Error('Simulating compareCreditsLeft Error'));

			await BotMiddleware.getSharedCreditStates(ctx, next.handler);

			expect(
				replySpy.calledOnceWithExactly(
					'Failed to retrieve shared credits states❌'
				)
			).to.be.true;
		});
	});
});
