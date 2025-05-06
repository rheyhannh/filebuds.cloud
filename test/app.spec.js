import { describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import config from '../src/config/global.js';
import buildFastify from '../src/app.js';
import * as _DownloaderQueue from '../src/queues/downloader.js';
import * as ILoveApiTypes from '../src/schemas/iloveapi.js'; // eslint-disable-line

const { APP_SECRET_KEY } = config;

const DownloaderQueue = _DownloaderQueue.default;

describe('[Integration] ILoveAPI Webhook', () => {
	const endpoint = '/iloveapi';
	let fastify = /** @type {ReturnType<typeof buildFastify>} */ (undefined);

	before(async function () {
		fastify = buildFastify();
		await fastify.ready();
	});

	after(async function () {
		await fastify.close();
	});

	describe('POST /iloveapi', () => {
		let addDownloaderJobStub =
			/** @type {import('sinon').SinonStub<typeof DownloaderQueue.addDownloaderJob>} */ (
				undefined
			);

		const callbackRequestBodyExamples =
			/** @type {Array<ILoveApiTypes.CallbackRequestBodyProps>} */ ([
				{
					event: 'task.completed',
					data: {
						task: {
							tool: 'upscaleimage',
							process_start: '2025-05-05 10:10:32',
							custom_int: 1185191684,
							custom_string: '26fd20b4bd45cede088ce8dc906fd1d5b0f29475',
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '25.672',
							filesize: 10222288,
							output_filesize: 14558215,
							output_filenumber: 1,
							output_extensions: ['png'],
							server: 'api17g.iloveimg\\.com',
							task: 'g27d4mrsg3ztmnzAgm5d3njAgfyk6rksqmy1qtrwt79tkkAkjv7vmhkxwn0wA115rvysqbxpxx2k2jw6vkb14v2fhl3cdxAvtf6fx3plctrbm2x07lApg9Ax3dfywmxz9ydwA60d7z35Ah0mynlxc2dbpm5sdkyjAjyhpAAp1l2lA6gbj7m1',
							file_number: '1',
							download_filename: '26fd20b4bd45cede088ce8dc906fd1d5b0f29475.png'
						}
					}
				},
				{
					event: 'task.completed',
					data: {
						task: {
							tool: 'merge',
							process_start: '2025-05-05 09:43:51',
							custom_int: 1185191684,
							custom_string: '725ff258010f92199968ed4acf3337d404488f9a',
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '0.120',
							filesize: 2156965,
							output_filesize: 0,
							output_filenumber: 1,
							output_extensions: ['pdf'],
							server: 'api6.ilovepdf\\.com',
							task: 'g27d4mrsg3ztmnzAgm5d3njAghs0bAn0fqx54mdn4xghwx2bb1rtqjdg1gnckz4mv61lyn8fq1wd2jrbjgkAxxAbAd1dntzgq6w5tvdy4ft38lAvjmxsgfkytgtcfs9qg4032d4pApgzsq1pm93bzmjcly',
							file_number: '3',
							download_filename: '725ff258010f92199968ed4acf3337d404488f9a.pdf'
						}
					}
				},
				{
					event: 'task.completed',
					data: {
						task: {
							tool: 'compress',
							process_start: '2025-05-05 09:42:16',
							custom_int: 1185191684,
							custom_string: 'e6247c93b0287c805841c37a12436cb8197dfb08',
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '1.041',
							filesize: 4304055,
							output_filesize: 1697118,
							output_filenumber: 1,
							output_extensions: ['pdf'],
							server: 'api70.ilovepdf\\.com',
							task: 'g27d4mrsg3ztmnzAgm5d3njAghstpfztszzl78czgrfkj2yjqtr2jlbsnnqcksw2rh20ppzcd09kl5r66cAw9g67zcp7qxdrlrr4ytmzzdj795p3m3ydg66slxtj3g4mxAcg5n0t1z1ydz7dtglv2tgAfA',
							file_number: '1',
							download_filename: 'e6247c93b0287c805841c37a12436cb8197dfb08.pdf'
						}
					}
				},
				{
					event: 'task.completed',
					data: {
						task: {
							tool: 'upscaleimage',
							process_start: '2025-05-05 05:05:02',
							custom_int: 1185191684,
							custom_string: 'c8017b79f3f52389c5e52e66609bc049190ee8d4',
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '5.398',
							filesize: 15179,
							output_filesize: 79413,
							output_filenumber: 1,
							output_extensions: ['jpg'],
							server: 'api16g.iloveimg\\.com',
							task: 'g27d4mrsg3ztmnzAgm5d3njAgfl853b27rg7x3pbsm4rzm0pb65mvswx5hqp4mA7pnsl4hlc7rm2wckllkcghhjc6y6g9v69kv7xgsl6ys7rAq0fjt39c12vcn00gtvvA2sx5fydqsdy7rcbclss6vkx0yflmzcgmdrz9lbh15Aj46w9jr61',
							file_number: '1',
							download_filename: 'file_384.jpg'
						}
					}
				}
			]);

		before(() => {
			addDownloaderJobStub = sinon
				.stub(DownloaderQueue, 'addDownloaderJob')
				.callsFake(async (arg) => {
					return {
						ok: true,
						isWaiting: false,
						jid: arg.data.task.custom_string
					};
				});
		});

		afterEach(() => {
			addDownloaderJobStub.resetHistory();
		});

		after(() => {
			addDownloaderJobStub.restore();
		});

		it('should use stubbed addDownloaderJob and resolves correct values', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const payload = callbackRequestBodyExamples[0];

			const response = await fastify.inject({
				method: 'POST',
				url: endpoint,
				headers: { apikey: APP_SECRET_KEY },
				body: payload
			});

			expect(addDownloaderJobStub.calledOnceWithExactly(payload)).to.be.true;
			expect(response.json().data).to.be.deep.equal({
				ok: true,
				isWaiting: false,
				jid: payload.data.task.custom_string
			});
		});

		it('should return 400 response error when requests body is invalid', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const payloads =
				/** @type {Array<import('../src/schemas/iloveapi.js').CallbackRequestBodyProps>} */ ([
					{},
					{ event: null },
					{ event: [] },
					{ event: {} },
					{ event: 555 },
					{ event: true },
					{ event: false },
					{ event: 'task.unknown' },
					{ event: 'task.completed' },
					{ event: 'task.completed', data: null },
					{ event: 'task.completed', data: [] },
					{ event: 'task.completed', data: 333 },
					{ event: 'task.completed', data: true },
					{ event: 'task.completed', data: false },
					{ event: 'task.completed', data: 'datas' },
					{ event: 'task.completed', data: {} },
					{ event: 'task.completed', data: { task: null } },
					{ event: 'task.completed', data: { task: [] } },
					{ event: 'task.completed', data: { task: 999 } },
					{ event: 'task.completed', data: { task: false } },
					{ event: 'task.completed', data: { task: true } },
					{ event: 'task.completed', data: { task: 'tasked' } },
					{
						event: 'task.completed',
						data: {
							task: {
								process_start: {}
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								custom_int: []
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								custom_string: {}
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								status: {}
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								status_message: {}
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								custom_int: null,
								custom_string: null,
								timer: []
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								filesize: 'ipsum'
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								output_filesize: 'false'
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								output_filenumber: 'true'
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								output_extensions: {}
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								output_extensions: [{}, [], [], {}]
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								server: []
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								task: ['lorem', 'ipsum']
							}
						}
					},
					{
						event: 'task.failed',
						data: {
							task: {
								file_number: { lorem: 'ipsum' }
							}
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								download_filename: [3, 5, 7]
							}
						}
					}
				]);

			for (const payload of payloads) {
				const response = await fastify.inject({
					method: 'POST',
					url: endpoint,
					body: payload
				});

				expect(response.statusCode).to.equal(400);
				expect(response.json()).to.deep.include({
					ok: false,
					statusCode: 400,
					statusText: 'Bad Request'
				});
				expect(response.json().error)
					.to.be.an('object')
					.that.includes.all.keys('name', 'message');
			}
		});

		it('should return 401 response error when requests are unauthorized', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const payload = callbackRequestBodyExamples[0];

			const injectors = [
				// Without apikey header and query
				fastify.inject({ method: 'POST', url: endpoint, body: payload }),
				// With invalid apikey header
				fastify.inject({
					method: 'POST',
					url: endpoint,
					headers: { apikey: 'lorem' },
					body: payload
				}),
				// With invalid apikey query
				fastify
					.inject({ query: { apikey: 'ipsum' }, body: payload })
					.post(endpoint),
				// With invalid apikey header and query
				fastify
					.inject({
						headers: { apikey: 'dolor' },
						query: { apikey: 'sit' },
						body: payload
					})
					.post(endpoint)
			];

			for (const injector of injectors) {
				const response = await injector;

				expect(response.statusCode).to.equal(401);
				expect(response.json()).to.deep.include({
					ok: false,
					statusCode: 401,
					statusText: 'Unauthorized'
				});
				expect(response.json().error)
					.to.be.an('object')
					.that.includes.all.keys('name', 'message');
			}
		});

		it("should add Downloader job and return 200 response when requests body valid and authorized with 'apikey' header", async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const payload = callbackRequestBodyExamples[1];

			const response = await fastify.inject({
				method: 'POST',
				url: endpoint,
				headers: { apikey: APP_SECRET_KEY },
				body: payload
			});

			expect(response.statusCode).to.equal(200);
			expect(response.json()).to.deep.include({
				ok: true,
				statusCode: 200,
				statusText: 'OK'
			});
			expect(addDownloaderJobStub.calledOnceWithExactly(payload)).to.be.true;
			expect(response.json().data).to.be.deep.equal({
				ok: true,
				isWaiting: false,
				jid: payload.data.task.custom_string
			});
		});

		it("should add Downloader job and return 200 response when requests body valid and authorized with 'apikey' query param", async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const payload = callbackRequestBodyExamples[2];

			const response = await fastify
				.inject({
					query: { apikey: APP_SECRET_KEY },
					body: payload
				})
				.post(endpoint);

			expect(response.statusCode).to.equal(200);
			expect(response.json()).to.deep.include({
				ok: true,
				statusCode: 200,
				statusText: 'OK'
			});
			expect(addDownloaderJobStub.calledOnceWithExactly(payload)).to.be.true;
			expect(response.json().data).to.be.deep.equal({
				ok: true,
				isWaiting: false,
				jid: payload.data.task.custom_string
			});
		});

		it("should add Downloader job and return 200 response when requests body valid and authorized with 'apikey' header and query param", async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const payload = callbackRequestBodyExamples[3];

			const response = await fastify
				.inject({
					headers: { apikey: APP_SECRET_KEY },
					query: { apikey: APP_SECRET_KEY },
					body: payload
				})
				.post(endpoint);

			expect(response.statusCode).to.equal(200);
			expect(response.json()).to.deep.include({
				ok: true,
				statusCode: 200,
				statusText: 'OK'
			});
			expect(addDownloaderJobStub.calledOnceWithExactly(payload)).to.be.true;
			expect(response.json().data).to.be.deep.equal({
				ok: true,
				isWaiting: false,
				jid: payload.data.task.custom_string
			});
		});
	});
});
