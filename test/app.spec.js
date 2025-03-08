import { describe, it } from 'mocha';
import { expect } from 'chai';
import config from '../src/config/global.js';
import buildFastify from '../src/app.js';

const { APP_SECRET_KEY } = config;

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
		it('should return 400 response error when requests body is invalid', async function () {
			const payloads =
				/** @type {Array<import('../src/schemas/iloveapi.js').CallbackRequestBodyProps>} */ ([
					{ event: 'task.unknown' },
					{ event: null },
					{
						event: 'task.completed',
						data: {
							task: null
						}
					},
					{
						event: 'task.completed',
						data: {
							task: {
								tool: []
							}
						}
					},
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
			const payload =
				/** @type {import('../src/schemas/iloveapi.js').CallbackRequestBodyProps} */ ({
					event: 'task.completed',
					data: {
						task: {
							tool: 'compress',
							process_start: '2024-06-17 10:18:17',
							custom_int: null,
							custom_string: null,
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '0.206',
							filesize: 13264,
							output_filesize: 9792,
							output_filenumber: 1,
							output_extensions: ['pdf'],
							server: 'api70.ilovepdf.com',
							task: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
							file_number: '1',
							download_filename: 'server.pdf'
						}
					}
				});

			const response = await fastify.inject({
				method: 'POST',
				url: endpoint,
				body: payload
			});

			expect(response.statusCode).to.equal(401);
			expect(response.json()).to.deep.include({
				ok: false,
				statusCode: 401,
				statusText: 'Unauthorized'
			});
			expect(response.json().error)
				.to.be.an('object')
				.that.includes.all.keys('name', 'message');
		});

		it("should return 200 response when requests body valid and authorized with 'apikey' header", async function () {
			const payload =
				/** @type {import('../src/schemas/iloveapi.js').CallbackRequestBodyProps} */ ({
					event: 'task.completed',
					data: {
						task: {
							tool: 'compress',
							process_start: '2024-06-17 10:18:17',
							custom_int: null,
							custom_string: null,
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '0.206',
							filesize: 13264,
							output_filesize: 9792,
							output_filenumber: 1,
							output_extensions: ['pdf'],
							server: 'api70.ilovepdf.com',
							task: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
							file_number: '1',
							download_filename: 'server.pdf'
						}
					}
				});

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
			expect(response.json().data).to.be.an('object');
		});

		it("should return 200 response when requests body valid and authorized with 'apikey' query param", async function () {
			const payload =
				/** @type {import('../src/schemas/iloveapi.js').CallbackRequestBodyProps} */ ({
					event: 'task.completed',
					data: {
						task: {
							tool: 'compress',
							process_start: '2024-06-17 10:18:17',
							custom_int: null,
							custom_string: null,
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '0.206',
							filesize: 13264,
							output_filesize: 9792,
							output_filenumber: 1,
							output_extensions: ['pdf'],
							server: 'api70.ilovepdf.com',
							task: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
							file_number: '1',
							download_filename: 'server.pdf'
						}
					}
				});

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
			expect(response.json().data).to.be.an('object');
		});

		it("should return 200 response when requests body valid and authorized with 'apikey' header and query param", async function () {
			const payload =
				/** @type {import('../src/schemas/iloveapi.js').CallbackRequestBodyProps} */ ({
					event: 'task.completed',
					data: {
						task: {
							tool: 'compress',
							process_start: '2024-06-17 10:18:17',
							custom_int: null,
							custom_string: null,
							status: 'TaskSuccess',
							status_message: 'This task has been processed successfully.',
							timer: '0.206',
							filesize: 13264,
							output_filesize: 9792,
							output_filenumber: 1,
							output_extensions: ['pdf'],
							server: 'api70.ilovepdf.com',
							task: 'xxxxxxxxxxxxxxxxxxxxxxxxx',
							file_number: '1',
							download_filename: 'server.pdf'
						}
					}
				});

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
			expect(response.json().data).to.be.an('object');
		});
	});
});
