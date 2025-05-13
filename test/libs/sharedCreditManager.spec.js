import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import SharedCreditManager, {
	redis,
	supabase,
	DAILY_SHARED_CREDIT_LIMIT
} from '../../src/libs/sharedCreditManager.js';
import dayjs from 'dayjs';

use(chaiAsPromised);

describe('[Unit] SharedCreditManager', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('getKeyForToday()', () => {
		it('should return Redis key string with correct format', () => {
			const expectedDate = dayjs().format('YYYY-MM-DD');
			const expectedKey = `sharedCredits:${expectedDate}`;
			const key = SharedCreditManager.getKeyForToday();

			expect(key).to.be.equal(expectedKey);
		});
	});

	describe('getCreditsLeft()', () => {
		it('should return remaining shared credits from Redis if cached', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisGetStub = sinon.stub(redis, 'get').resolves('55');

			const result = await SharedCreditManager.getCreditsLeft();

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisGetStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue
				)
			).to.be.true;
			expect(result).to.be.equal(55);
		});

		it('should fetch shared credits from Supabase and caches them in Redis when Redis is empty', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisGetStub = sinon.stub(redis, 'get').resolves(null);
			sinon
				.stub(supabase, 'from')
				.withArgs('shared-credits')
				.returns({
					select: sinon
						.stub()
						.withArgs('credits_left')
						.returns({
							eq: sinon.stub().callsFake((field) => {
								if (field === 'date') {
									return {
										single: async () => ({
											data: { credits_left: 100 },
											error: null
										})
									};
								}
							})
						})
				});
			let redisSetStub = sinon.stub(redis, 'set').resolves('OK');

			const result = await SharedCreditManager.getCreditsLeft();

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisGetStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue
				)
			).to.be.true;
			expect(
				redisSetStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue,
					100,
					'EX',
					60 * 60 * 24
				)
			).to.be.true;
			expect(result).to.be.equal(100);
		});

		it('should initialize daily credits if Redis is empty and Supabase query returns an error', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisGetStub = sinon.stub(redis, 'get').resolves(null);
			sinon
				.stub(supabase, 'from')
				.withArgs('shared-credits')
				.returns({
					select: sinon
						.stub()
						.withArgs('credits_left')
						.returns({
							eq: sinon.stub().callsFake((field) => {
								if (field === 'date') {
									return {
										single: async () => ({
											error: true
										})
									};
								}
							})
						})
				});
			let initDailyCreditsStub = sinon
				.stub(SharedCreditManager, 'initDailyCredits')
				.resolves(undefined);

			const result = await SharedCreditManager.getCreditsLeft();

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisGetStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue
				)
			).to.be.true;
			expect(initDailyCreditsStub.calledOnce).to.be.true;
			expect(result).to.be.equal(DAILY_SHARED_CREDIT_LIMIT);
		});

		it('should initialize daily credits if Redis is empty and Supabase query returns no data', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisGetStub = sinon.stub(redis, 'get').resolves(null);
			sinon
				.stub(supabase, 'from')
				.withArgs('shared-credits')
				.returns({
					select: sinon
						.stub()
						.withArgs('credits_left')
						.returns({
							eq: sinon.stub().callsFake((field) => {
								if (field === 'date') {
									return {
										single: async () => ({
											data: null
										})
									};
								}
							})
						})
				});
			let initDailyCreditsStub = sinon
				.stub(SharedCreditManager, 'initDailyCredits')
				.resolves(undefined);

			const result = await SharedCreditManager.getCreditsLeft();

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisGetStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue
				)
			).to.be.true;
			expect(initDailyCreditsStub.calledOnce).to.be.true;
			expect(result).to.be.equal(DAILY_SHARED_CREDIT_LIMIT);
		});
	});

	describe('initDailyCredits()', () => {
		let clock = /** @type {import('sinon').SinonFakeTimers} */ (undefined);

		beforeEach(() => {
			const fixedDate = new Date('2025-05-07T12:00:00Z');
			clock = sinon.useFakeTimers(fixedDate.getTime());
		});

		afterEach(() => {
			clock.restore();
		});

		it('should throw an Error if Supabase fails to initialize daily credits', async () => {
			let upsertStub = sinon.stub().resolves({ error: true });
			let fromStub = sinon.stub(supabase, 'from').callsFake((table) => {
				if (table === 'shared-credits') {
					return { upsert: upsertStub };
				}

				throw new Error(`Unexpected table: ${table}`);
			});

			await expect(SharedCreditManager.initDailyCredits()).to.be.rejectedWith(
				'Failed to initialize daily shared credits in Supabase'
			);
			expect(fromStub.calledOnceWithExactly('shared-credits')).to.be.true;
			expect(
				upsertStub.calledOnceWithExactly(
					{
						date: dayjs().format('YYYY-MM-DD'),
						credits_left: DAILY_SHARED_CREDIT_LIMIT,
						created_at: new Date(),
						created_by: 'scm:initDailyCredits',
						last_updated_at: new Date(),
						last_updated_by: 'scm:initDailyCredits',
						comment: `Initiating daily shared credits for ${dayjs().format('YYYY-MM-DD')} with ${DAILY_SHARED_CREDIT_LIMIT} credits`
					},
					{ onConflict: ['date'] }
				)
			).to.be.true;
		});

		it('should initialize daily credits by setting values in Redis and Supabase with fallback value', async () => {
			let upsertStub = sinon.stub().resolves({ error: false });
			let fromStub = sinon.stub(supabase, 'from').callsFake((table) => {
				if (table === 'shared-credits') {
					return { upsert: upsertStub };
				}

				throw new Error(`Unexpected table: ${table}`);
			});
			let redisSetStub = sinon.stub(redis, 'set').resolves('OK');
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');

			const params = [{}, [], null, undefined, false, true, 55.25];

			for (const param of params) {
				const creds = Number.isInteger(param)
					? param
					: DAILY_SHARED_CREDIT_LIMIT;

				await SharedCreditManager.initDailyCredits(param);

				expect(fromStub.calledOnceWithExactly('shared-credits')).to.be.true;
				expect(
					upsertStub.calledOnceWithExactly(
						{
							date: dayjs().format('YYYY-MM-DD'),
							credits_left: creds,
							created_at: new Date(),
							created_by: 'scm:initDailyCredits',
							last_updated_at: new Date(),
							last_updated_by: 'scm:initDailyCredits',
							comment: `Initiating daily shared credits for ${dayjs().format('YYYY-MM-DD')} with ${creds} credits`
						},
						{ onConflict: ['date'] }
					)
				).to.be.true;
				expect(getKeyForTodaySpy.calledOnce).to.be.true;
				expect(
					redisSetStub.calledOnceWithExactly(
						getKeyForTodaySpy.firstCall.returnValue,
						creds,
						'EX',
						60 * 60 * 24
					)
				).to.be.true;

				fromStub.resetHistory();
				upsertStub.resetHistory();
				getKeyForTodaySpy.resetHistory();
				redisSetStub.resetHistory();
			}
		});

		it('should initialize daily credits by setting values in Redis and Supabase with adjusted amount', async () => {
			let upsertStub = sinon.stub().resolves({ error: false });
			let fromStub = sinon.stub(supabase, 'from').callsFake((table) => {
				if (table === 'shared-credits') {
					return { upsert: upsertStub };
				}

				throw new Error(`Unexpected table: ${table}`);
			});
			let redisSetStub = sinon.stub(redis, 'set').resolves('OK');
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');

			await SharedCreditManager.initDailyCredits(55);

			expect(fromStub.calledOnceWithExactly('shared-credits')).to.be.true;
			expect(
				upsertStub.calledOnceWithExactly(
					{
						date: dayjs().format('YYYY-MM-DD'),
						credits_left: 55,
						created_at: new Date(),
						created_by: 'scm:initDailyCredits',
						last_updated_at: new Date(),
						last_updated_by: 'scm:initDailyCredits',
						comment: `Initiating daily shared credits for ${dayjs().format('YYYY-MM-DD')} with 55 credits`
					},
					{ onConflict: ['date'] }
				)
			).to.be.true;
			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisSetStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue,
					55,
					'EX',
					60 * 60 * 24
				)
			).to.be.true;
		});
	});

	describe('consumeCredits()', () => {
		it('should return true and update Supabase when enough credits are available in Redis', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisDecrbyStub = sinon.stub(redis, 'decrby').resolves(1);
			let updateCreditsInSupabaseStub = sinon
				.stub(SharedCreditManager, 'updateCreditsInSupabase')
				.resolves(undefined);

			const result = await SharedCreditManager.consumeCredits(
				10,
				'Simulating consuming 10 credits'
			);

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisDecrbyStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue,
					10
				)
			).to.be.true;
			expect(
				updateCreditsInSupabaseStub.calledOnceWithExactly(
					1,
					'Simulating consuming 10 credits'
				)
			).to.be.true;
			expect(result).to.be.true;
		});

		it('should return false and refunds credits in Redis when not enough credits are available', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisDecrbyStub = sinon.stub(redis, 'decrby').resolves(-1);
			let redisIncrbyStub = sinon.stub(redis, 'incrby').resolves(14);

			const result = await SharedCreditManager.consumeCredits(
				15,
				'Simulating consuming 15 credits'
			);

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisDecrbyStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue,
					15
				)
			).to.be.true;
			expect(
				redisIncrbyStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue,
					15
				)
			).to.be.true;
			expect(result).to.be.false;
		});
	});

	describe('refundCredits()', () => {
		it('should update both Redis and Supabase to refund the specified amount of credits', async () => {
			let getKeyForTodaySpy = sinon.spy(SharedCreditManager, 'getKeyForToday');
			let redisIncrbyStub = sinon.stub(redis, 'incrby').resolves(105);
			let updateCreditsInSupabaseStub = sinon
				.stub(SharedCreditManager, 'updateCreditsInSupabase')
				.resolves(undefined);

			const result = await SharedCreditManager.refundCredits(
				25,
				'Simulating refunding 25 credits'
			);

			expect(getKeyForTodaySpy.calledOnce).to.be.true;
			expect(
				redisIncrbyStub.calledOnceWithExactly(
					getKeyForTodaySpy.firstCall.returnValue,
					25
				)
			).to.be.true;
			expect(
				updateCreditsInSupabaseStub.calledOnceWithExactly(
					105,
					'Simulating refunding 25 credits'
				)
			).to.be.true;
			expect(result).to.be.undefined;
		});
	});

	describe('updateCreditsInSupabase()', () => {
		let clock = /** @type {import('sinon').SinonFakeTimers} */ (undefined);

		beforeEach(() => {
			const fixedDate = new Date('2025-05-07T12:00:00Z');
			clock = sinon.useFakeTimers(fixedDate.getTime());
		});

		afterEach(() => {
			clock.restore();
		});

		it('should update the credits in Supabase', async () => {
			let updateStub = sinon.stub().returnsThis();
			let eqStub = sinon.stub().resolves(null);
			let supabaseStub = sinon.stub(supabase, 'from').returns({
				update: updateStub,
				eq: eqStub
			});

			await SharedCreditManager.updateCreditsInSupabase(
				45,
				'Simulating update 45 credits'
			);

			expect(supabaseStub.calledOnceWithExactly('shared-credits')).to.be.true;
			expect(
				updateStub.calledOnceWithExactly({
					credits_left: 45,
					last_updated_at: new Date(),
					last_updated_by: 'scm:updateCreditsInSupabase',
					comment: 'Simulating update 45 credits'
				})
			).to.be.true;
			expect(eqStub.calledOnceWithExactly('date', dayjs().format('YYYY-MM-DD')))
				.to.be.true;
		});
	});
});
