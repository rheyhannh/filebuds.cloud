import { expect, use } from 'chai';
import chaiHttp from 'chai-http';
import buildFastify from '../src/app.js';

const chai = use(chaiHttp);

describe('Fastify Tests', () => {
	let app = /** @type {ReturnType<typeof buildFastify>} */ (undefined);
	let server = /** @type {ReturnType<typeof buildFastify>['server']} */ (
		undefined
	);

	before(function () {
		app = buildFastify();
		app.ready();
		server = app.server;
	});

	after(async function () {
		await app.close();
	});

	it('should return status code 404 for unknown route', (done) => {
		chai.request
			.execute(server)
			.get('/unknown')
			.end((err, res) => {
				expect(res).to.have.status(404);
				done(err);
			});
	});
});
