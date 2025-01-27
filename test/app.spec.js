import assert from 'assert';
import request from 'supertest';
import buildFastify from '../src/app.js';

describe('Fastify /api route', () => {
	let app = /** @type {ReturnType<typeof buildFastify>} */ (undefined);
	let server = /** @type {ReturnType<typeof buildFastify>['server']} */ (undefined);

	before(async function () {
		process.env.NODE_ENV = 'test';
		process.env.ILOVEAPI_PUBLIC_KEY = 'yy';
		process.env.ILOVEAPI_SECRET_KEY = 'xx';

		app = buildFastify();
		await app.ready();
		server = app.server;
	});

	after(async function () {
		await app.close();
	});

	it('should return status code 200 for GET /api', async function () {
		const response = await request(server).get('/api');
		assert.strictEqual(response.status, 200);
	});
});
