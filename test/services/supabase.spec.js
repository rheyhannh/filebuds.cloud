import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as _SupabaseService from '../../src/services/supabase.js';

use(chaiAsPromised);

const SupabaseService = _SupabaseService.default;

describe('[Unit] Supabase Services', () => {
	let stubedAxiosSupabase = /** @type {import('sinon').SinonStub} */ (
		undefined
	);

	beforeEach(() => {
		stubedAxiosSupabase = sinon
			.stub(SupabaseService.axiosSupabase, 'get')
			.resolves({ data: { isMocked: true } });
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('getJobLog()', () => {
		it('should use stubbed axios instance and resolves with mocked data to prevent real requests', async () => {
			const result = await SupabaseService.getJobLog({ tool: 'convertimage' });

			expect(stubedAxiosSupabase.calledOnce).to.be.true;
			expect(result).to.be.deep.equal({ isMocked: true });
		});

		it('should throw an Error if filter param are not provided', async () => {
			await expect(SupabaseService.getJobLog()).to.be.rejectedWith(
				"Param 'filter' required."
			);
			await expect(SupabaseService.getJobLog(null)).to.be.rejectedWith(
				"Param 'filter' required."
			);
		});

		it('should throw an Error if filter param are not object', async () => {
			await expect(SupabaseService.getJobLog('strings')).to.be.rejectedWith(
				"Param 'filter' must be an object."
			);
			await expect(SupabaseService.getJobLog(true)).to.be.rejectedWith(
				"Param 'filter' must be an object."
			);
			await expect(SupabaseService.getJobLog([])).to.be.rejectedWith(
				"Param 'filter' must be an object."
			);
		});

		it('should throw an Error if no filter criteria used', async () => {
			await expect(SupabaseService.getJobLog({})).to.be.rejectedWith(
				'Atleast one filter criteria is required.'
			);
		});

		it('should send requests with correct url and params', async () => {
			const setup =
				/** @type {Array<{param:import('../../src/schemas/supabase.js').JobLogQueryParams, queries:string}>} */ ([
					{
						param: {
							id: 9,
							user_id: '1731404b-c61d-44ed-bf72-1b534752c382',
							tool: 'convertimage'
						},
						queries:
							'/job-logs?id=eq.9&user_id=eq.1731404b-c61d-44ed-bf72-1b534752c382&tool=eq.convertimage'
					},
					{
						param: {
							id: 44,
							tg_user_id: 185150,
							tool: 'removebackgroundimage'
						},
						queries:
							'/job-logs?id=eq.44&tg_user_id=eq.185150&tool=eq.removebackgroundimage'
					},
					{
						param: {
							job_id: 'sha1hashedjobid',
							immutable: true,
							task_worker_state: 'completed',
							downloader_worker_state: 'failed'
						},
						queries:
							'/job-logs?job_id=eq.sha1hashedjobid&immutable=eq.true&task_worker_state=eq.completed&downloader_worker_state=eq.failed'
					}
				]);

			await Promise.all(
				setup.map(async ({ param, queries }) => {
					await SupabaseService.getJobLog(param);

					expect(stubedAxiosSupabase.calledWithExactly(queries)).to.be.true;
				})
			);
		});

		it('should return undefined when requests are failed', async () => {
			stubedAxiosSupabase.restore();

			stubedAxiosSupabase = sinon
				.stub(SupabaseService.axiosSupabase, 'get')
				.rejects(new Error('Simulating Error'));

			const result = await SupabaseService.getJobLog({
				task_worker_state: 'failed'
			});

			expect(result).to.be.undefined;
		});
	});

	describe('addJobLog()', () => {
		let stubedAxiosSupabase = /** @type {import('sinon').SinonStub} */ (
			undefined
		);

		beforeEach(() => {
			stubedAxiosSupabase = sinon
				.stub(SupabaseService.axiosSupabase, 'post')
				.resolves();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should use stubbed axios instance to prevent real requests', async () => {
			await SupabaseService.addJobLog(
				'task.completed',
				'sha1hashedjobid',
				null,
				185150,
				false,
				'removebackgroundimage'
			);

			expect(stubedAxiosSupabase.calledOnce).to.be.true;
		});

		it('should throw an Error if required params are not provided', async () => {
			await expect(SupabaseService.addJobLog(null)).to.be.rejectedWith(
				"Param 'event' required and must be string."
			);
			await expect(SupabaseService.addJobLog(undefined)).to.be.rejectedWith(
				"Param 'event' required and must be string."
			);
			await expect(
				SupabaseService.addJobLog('task.completed', null)
			).to.be.rejectedWith("Param 'jobId' required and must be string.");
			await expect(
				SupabaseService.addJobLog('task.completed', undefined)
			).to.be.rejectedWith("Param 'jobId' required and must be string.");
			await expect(
				SupabaseService.addJobLog('downloader.failed', 'sha1hashedjobid', null)
			).to.be.rejectedWith(
				"Atleast 'userId' or 'telegramUserId' must be provided."
			);
			await expect(
				SupabaseService.addJobLog('downloader.failed', 'sha1hashedjobid')
			).to.be.rejectedWith(
				"Atleast 'userId' or 'telegramUserId' must be provided.",
				undefined
			);
			await expect(
				SupabaseService.addJobLog(
					'downloader.failed',
					'sha1hashedjobid',
					null,
					undefined
				)
			).to.be.rejectedWith(
				"Atleast 'userId' or 'telegramUserId' must be provided."
			);
			await expect(
				SupabaseService.addJobLog('downloader.failed', 'sha1hashedjobid')
			).to.be.rejectedWith(
				"Atleast 'userId' or 'telegramUserId' must be provided.",
				undefined,
				null
			);
			await expect(
				SupabaseService.addJobLog(
					'downloader.failed',
					'sha1hashedjobid',
					'd32dc5fe-841d-4acc-8bfb-1e5575492742',
					undefined,
					null
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
			await expect(
				SupabaseService.addJobLog(
					'downloader.failed',
					'sha1hashedjobid',
					null,
					185150,
					undefined
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
			await expect(
				SupabaseService.addJobLog(
					'task.failed',
					'sha1hashedjobid',
					'd32dc5fe-841d-4acc-8bfb-1e5575492742',
					undefined,
					true,
					null
				)
			).to.be.rejectedWith("Param 'tool' required and must be string.");
			await expect(
				SupabaseService.addJobLog(
					'task.failed',
					'sha1hashedjobid',
					null,
					185150,
					false,
					undefined
				)
			).to.be.rejectedWith("Param 'tool' required and must be string.");
		});

		it('should throw an Error if job name are invalid', async () => {
			await expect(
				SupabaseService.addJobLog('lorem.completed')
			).to.be.rejectedWith('Invalid job name.');
			await expect(SupabaseService.addJobLog('xyz.failed')).to.be.rejectedWith(
				'Invalid job name.'
			);
			await expect(SupabaseService.addJobLog('')).to.be.rejectedWith(
				'Invalid job name.'
			);
			await expect(
				SupabaseService.addJobLog('unknown-event')
			).to.be.rejectedWith('Invalid job name.');
		});

		it('should throw an Error if job state are invalid', async () => {
			await expect(
				SupabaseService.addJobLog('task.finished')
			).to.be.rejectedWith('Invalid job result type.');
			await expect(
				SupabaseService.addJobLog('downloader.error')
			).to.be.rejectedWith('Invalid job result type.');
			await expect(SupabaseService.addJobLog('task.')).to.be.rejectedWith(
				'Invalid job result type.'
			);
		});

		it('should throw an Error if required params are invalid', async () => {
			await expect(
				SupabaseService.addJobLog(
					'task.completed',
					{},
					null,
					185150,
					false,
					undefined
				)
			).to.be.rejectedWith("Param 'jobId' required and must be string.");

			await expect(
				SupabaseService.addJobLog(
					'downloader.failed',
					'sha1hashedjobid',
					null,
					185150,
					'unknown',
					undefined
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");

			await expect(
				SupabaseService.addJobLog(
					'task.failed',
					'sha1hashedjobid',
					null,
					185150,
					false,
					98
				)
			).to.be.rejectedWith("Param 'tool' required and must be string.");
		});

		it('should send requests with correct url and payload', async () => {
			const setup =
				/** @type {Array<{params:Parameters<typeof SupabaseService.addJobLog>, payload:import('../../src/schemas/supabase.js').JobLogEntry}>} */ ([
					{
						params: [
							'task.completed',
							'79a2eaabed1b27416e6784c66095fed72c7646fb',
							null,
							185150,
							false,
							'upscaleimage',
							{},
							{
								file_type: 'image',
								file_link: 'https://www.api.telegram.org/files/lorem.png'
							},
							{
								server: 'api8g.iloveimg.com',
								task_id: 'task_id',
								files: [{ server_filename: 'dolor.png', filename: 'lorem.png' }]
							},
							null,
							{
								created_at: 1741973471,
								processed_at: 1741973563,
								finished_at: 1741973609,
								ats: 1,
								atm: 0,
								delay: 0,
								priority: 0
							}
						],
						payload: {
							job_id: '79a2eaabed1b27416e6784c66095fed72c7646fb',
							user_id: null,
							tg_user_id: 185150,
							immutable: false,
							tool: 'upscaleimage',
							tool_options: {},
							files: {
								file_type: 'image',
								file_link: 'https://www.api.telegram.org/files/lorem.png'
							},
							task_worker_state: 'completed',
							task_worker_result: {
								server: 'api8g.iloveimg.com',
								task_id: 'task_id',
								files: [{ server_filename: 'dolor.png', filename: 'lorem.png' }]
							},
							task_worker_error: null,
							task_worker_stats: {
								created_at: 1741973471,
								processed_at: 1741973563,
								finished_at: 1741973609,
								ats: 1,
								atm: 0,
								delay: 0,
								priority: 0
							}
						}
					},
					{
						params: [
							'downloader.failed',
							'8639519d42a503247e2fbdcf3d208b72e5163016',
							'bbbe51c5-74a8-4e54-beb2-4cc868ed179f',
							null,
							true,
							'removebackgroundimage',
							{},
							{
								file_type: 'image',
								file_link: 'https://www.api.telegram.org/files/xyz.png'
							},
							null,
							{
								failed_reason: 'Requests failed',
								stacktrace: 'some_tracktraces'
							},
							{
								created_at: 1741993146,
								processed_at: 1741993163,
								finished_at: 1741993203,
								ats: 4,
								atm: 2,
								delay: 0,
								priority: 0
							}
						],
						payload: {
							job_id: '8639519d42a503247e2fbdcf3d208b72e5163016',
							user_id: 'bbbe51c5-74a8-4e54-beb2-4cc868ed179f',
							tg_user_id: null,
							immutable: true,
							tool: 'removebackgroundimage',
							tool_options: {},
							files: {
								file_type: 'image',
								file_link: 'https://www.api.telegram.org/files/xyz.png'
							},
							downloader_worker_state: 'failed',
							downloader_worker_result: null,
							downloader_worker_error: {
								failed_reason: 'Requests failed',
								stacktrace: 'some_tracktraces'
							},
							downloader_worker_stats: {
								created_at: 1741993146,
								processed_at: 1741993163,
								finished_at: 1741993203,
								ats: 4,
								atm: 2,
								delay: 0,
								priority: 0
							}
						}
					}
				]);

			for (const { params, payload } of setup) {
				stubedAxiosSupabase.resetHistory();

				await SupabaseService.addJobLog(...params);

				expect(stubedAxiosSupabase.firstCall.args[0]).to.be.equal('/job-logs');
				expect(stubedAxiosSupabase.firstCall.args[1]).to.deep.equal(payload);
			}
		});

		it('should return expected object when requests are success', async () => {
			const result = await SupabaseService.addJobLog(
				'task.failed',
				'sha1hashedjobid',
				null,
				185150,
				false,
				'upscaleimage'
			);

			expect(result).to.be.deep.equal({ ok: true });
		});

		it('should return expected object when requests are failed', async () => {
			stubedAxiosSupabase.restore();

			stubedAxiosSupabase = sinon
				.stub(SupabaseService.axiosSupabase, 'post')
				.rejects(new Error('Simulating Error'));

			const result = await SupabaseService.addJobLog(
				'downloader.failed',
				'sha1hashedjobid',
				null,
				185150,
				false,
				'removebackgroundimage'
			);

			expect(result).to.be.deep.equal({ ok: false });
		});
	});

	describe('updateWorkerJobLog()', () => {
		let stubedAxiosSupabase = /** @type {import('sinon').SinonStub} */ (
			undefined
		);

		beforeEach(() => {
			stubedAxiosSupabase = sinon
				.stub(SupabaseService.axiosSupabase, 'patch')
				.resolves();
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should use stubbed axios instance to prevent real requests', async () => {
			await SupabaseService.updateWorkerJobLog(
				'downloader.failed',
				{
					job_id: '85dc2a6a33bedae7f591ad5e141f9d251976b350',
					user_id: 'fb6d6a69-a985-4551-a712-8d0414b79de6'
				},
				true,
				null,
				{
					failed_reason: 'Requests hit timeout',
					stacktrace: 'some_stacktraces'
				},
				null
			);

			expect(stubedAxiosSupabase.calledOnce).to.be.true;
		});

		it('should throw an Error if required params are not provided', async () => {
			await expect(SupabaseService.updateWorkerJobLog(null)).to.be.rejectedWith(
				"Param 'event' required and must be string."
			);
			await expect(
				SupabaseService.updateWorkerJobLog(undefined)
			).to.be.rejectedWith("Param 'event' required and must be string.");
			await expect(
				SupabaseService.updateWorkerJobLog('downloader.failed', null)
			).to.be.rejectedWith("Param 'filter' required.");
			await expect(
				SupabaseService.updateWorkerJobLog('task.completed', undefined)
			).to.be.rejectedWith("Param 'filter' required.");
			await expect(
				SupabaseService.updateWorkerJobLog(
					'downloader.failed',
					{
						job_id: 'job_id',
						tool: 'convertimage'
					},
					null
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
			await expect(
				SupabaseService.updateWorkerJobLog(
					'task.completed',
					{
						id: 55,
						tool: 'removebackgroundimage'
					},
					undefined
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
		});

		it('should throw an Error if job name are invalid', async () => {
			await expect(
				SupabaseService.updateWorkerJobLog('lorem.completed')
			).to.be.rejectedWith('Invalid job name.');
			await expect(
				SupabaseService.updateWorkerJobLog('xyz.failed')
			).to.be.rejectedWith('Invalid job name.');
			await expect(SupabaseService.updateWorkerJobLog('')).to.be.rejectedWith(
				'Invalid job name.'
			);
			await expect(
				SupabaseService.updateWorkerJobLog('unknown-event')
			).to.be.rejectedWith('Invalid job name.');
		});

		it('should throw an Error if job state are invalid', async () => {
			await expect(
				SupabaseService.updateWorkerJobLog('task.finished')
			).to.be.rejectedWith('Invalid job result type.');
			await expect(
				SupabaseService.updateWorkerJobLog('downloader.error')
			).to.be.rejectedWith('Invalid job result type.');
			await expect(
				SupabaseService.updateWorkerJobLog('task.')
			).to.be.rejectedWith('Invalid job result type.');
		});

		it('should throw an Error if required params are invalid', async () => {
			await expect(
				SupabaseService.updateWorkerJobLog('task.completed', [])
			).to.be.rejectedWith("Param 'filter' must be an object.");
			await expect(
				SupabaseService.updateWorkerJobLog('task.completed', true)
			).to.be.rejectedWith("Param 'filter' must be an object.");
			await expect(
				SupabaseService.updateWorkerJobLog('task.completed', 22)
			).to.be.rejectedWith("Param 'filter' must be an object.");
			await expect(
				SupabaseService.updateWorkerJobLog(
					'task.completed',
					{
						id: 12,
						tg_user_id: 185150
					},
					'strings'
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
			await expect(
				SupabaseService.updateWorkerJobLog(
					'task.completed',
					{
						id: 763,
						tg_user_id: 5432
					},
					259
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
			await expect(
				SupabaseService.updateWorkerJobLog(
					'task.completed',
					{
						id: 128,
						tg_user_id: 1324
					},
					{}
				)
			).to.be.rejectedWith("Param 'immutable' required and must be boolean.");
		});

		it('should throw an Error if filter criteria less than two', async () => {
			await expect(
				SupabaseService.updateWorkerJobLog(
					'task.completed',
					{
						id: 252
					},
					false
				)
			).to.be.rejectedWith(
				'Atleast two filters are required to prevent accidental updates.'
			);
		});

		it('should send requests with correct url and payload', async () => {
			const setup =
				/** @type {Array<{params:Parameters<typeof SupabaseService.updateWorkerJobLog>, payload:Omit<import('../../src/schemas/supabase.js').JobLogEntry, 'job_id' | 'user_id' | 'tg_user_id' | 'tool' | 'tool_options' | 'files'>, queries:string}>} */ ([
					{
						params: [
							'downloader.failed',
							{ id: 92, tool: 'removebackgroundimage' },
							true,
							null,
							{
								failed_reason: 'Unknown error occured',
								stacktrace: 'error_stacktraces'
							},
							{
								created_at: 1741973471,
								processed_at: 1741973563,
								finished_at: 1741973609,
								ats: 1,
								atm: 0,
								delay: 0,
								priority: 0
							}
						],
						payload: {
							immutable: true,
							downloader_worker_state: 'failed',
							downloader_worker_result: null,
							downloader_worker_error: {
								failed_reason: 'Unknown error occured',
								stacktrace: 'error_stacktraces'
							},
							downloader_worker_stats: {
								created_at: 1741973471,
								processed_at: 1741973563,
								finished_at: 1741973609,
								ats: 1,
								atm: 0,
								delay: 0,
								priority: 0
							}
						},
						queries: 'id=eq.92&tool=eq.removebackgroundimage'
					},
					{
						params: [
							'task.failed',
							{ job_id: 'sha1hashedjobid', tool: 'upscaleimage' },
							false,
							null,
							{
								failed_reason: 'Simulating error',
								stacktrace: 'some_stacktraces'
							},
							{
								created_at: 1741993146,
								processed_at: 1741993163,
								finished_at: 1741993203,
								ats: 4,
								atm: 2,
								delay: 0,
								priority: 0
							}
						],
						payload: {
							immutable: false,
							task_worker_state: 'failed',
							task_worker_result: null,
							task_worker_error: {
								failed_reason: 'Simulating error',
								stacktrace: 'some_stacktraces'
							},
							task_worker_stats: {
								created_at: 1741993146,
								processed_at: 1741993163,
								finished_at: 1741993203,
								ats: 4,
								atm: 2,
								delay: 0,
								priority: 0
							}
						},
						queries: 'job_id=eq.sha1hashedjobid&tool=eq.upscaleimage'
					}
				]);

			for (const { params, payload, queries } of setup) {
				stubedAxiosSupabase.resetHistory();

				await SupabaseService.updateWorkerJobLog(...params);

				expect(stubedAxiosSupabase.firstCall.args[0]).to.be.equal(
					`/job-logs?${queries}`
				);
				expect(stubedAxiosSupabase.firstCall.args[1]).to.be.deep.equal(payload);
			}
		});

		it('should return expected object when requests are success', async () => {
			const result = await SupabaseService.updateWorkerJobLog(
				'task.failed',
				{
					job_id: '442ff684e0d4b6fb5a5efac77decea583d038dac',
					user_id: 'd2c1b34a-a0ec-41c4-9b4e-8a8c4ad51628'
				},
				true,
				null,
				{
					failed_reason: 'Authentication token invalid',
					stacktrace: 'some_stacktraces'
				},
				null
			);

			expect(result).to.be.deep.equal({ ok: true });
		});

		it('should return expected object when requests are failed', async () => {
			stubedAxiosSupabase.restore();

			stubedAxiosSupabase = sinon
				.stub(SupabaseService.axiosSupabase, 'patch')
				.throws(new Error('Simulating Error'));

			const result = await SupabaseService.updateWorkerJobLog(
				'task.failed',
				{
					job_id: '442ff684e0d4b6fb5a5efac77decea583d038dac',
					user_id: 'd2c1b34a-a0ec-41c4-9b4e-8a8c4ad51628'
				},
				true,
				null,
				{
					failed_reason: 'Authentication token invalid',
					stacktrace: 'some_stacktraces'
				},
				null
			);

			expect(result).to.be.deep.equal({ ok: false });
		});
	});
});
