import { describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import {
	isValidRequest,
	tryCatch,
	sendSuccessResponse,
	sendErrorResponse
} from '../../src/utils/fastify.js';
import config from '../../src/config/global.js';

const { APP_SECRET_KEY } = config;

describe('[Unit] Fastify Utils', () => {
	describe('isValidRequest()', () => {
		it('should return true for a valid requests with apikey', () => {
			const requests = [
				{ headers: { apikey: APP_SECRET_KEY } },
				{ query: { apikey: APP_SECRET_KEY } }
			];

			expect(isValidRequest(requests[0])).to.be.eq(true);
			expect(isValidRequest(requests[1])).to.be.eq(true);
		});

		it('should return false for incorrect allowedDomains param', () => {
			const params = [[], {}];

			expect(isValidRequest({}, params[0])).to.be.eq(false);
			expect(isValidRequest({}, params[1])).to.be.eq(false);
		});

		it('should return false for requests without apikey and origin or referer header', () => {
			const allowedDomains = [
				'.ilovepdf.com',
				'.iloveimg.com',
				'ilovepdf.com',
				'iloveimg.com'
			];

			expect(isValidRequest({}, allowedDomains)).to.be.eq(false);
		});

		it('should return true for a valid requests with origin or referer header that match allowedDomains', () => {
			const allowedDomains = [
				'.ilovepdf.com',
				'.iloveimg.com',
				'ilovepdf.com',
				'iloveimg.com'
			];

			const requests = [
				{ headers: { origin: 'https://www.api32.iloveimg.com' } },
				{ headers: { referer: 'http://www.iloveimg.com' } },
				{ headers: { referer: 'http://www.ilovepdf.com' } },
				{ headers: { origin: 'https://www.subdomain.ilovepdf.com' } },
				{ headers: { origin: 'https://api32.iloveimg.com' } },
				{ headers: { referer: 'http://iloveimg.com' } },
				{ headers: { referer: 'http://ilovepdf.com' } },
				{ headers: { origin: 'https://subdomain.ilovepdf.com' } }
			];

			requests.forEach((request) => {
				expect(isValidRequest(request, allowedDomains)).to.be.eq(true);
			});
		});
	});

	describe('tryCatch()', () => {
		let reply =
			/** @type {Record<'status' | 'send', import('sinon').SinonStub>} */ (
				undefined
			);

		beforeEach(() => {
			reply = {
				status: sinon.stub().returnsThis(),
				send: sinon.stub()
			};
		});

		it('should return a success response when handler resolves', async () => {
			const handler = async () => ({
				id: '1',
				name: 'John',
				age: 30,
				occupation: 'Developer'
			});

			await tryCatch(handler, reply);

			expect(reply.status.calledWith(200)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 200,
					statusText: 'OK',
					data: {
						id: '1',
						name: 'John',
						age: 30,
						occupation: 'Developer'
					}
				})
			);
		});

		it('should return a success response when handler is synchronous function', async () => {
			const handler = () => ({
				id: '1',
				name: 'John',
				age: 30,
				occupation: 'Developer'
			});

			await tryCatch(handler, reply);

			expect(reply.status.calledWith(200)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 200,
					statusText: 'OK',
					data: {
						id: '1',
						name: 'John',
						age: 30,
						occupation: 'Developer'
					}
				})
			).to.be.true;
		});

		it('should return a custom success payload', async () => {
			const handler = async () => 'Success';

			await tryCatch(handler, reply, {
				successCustomPayload: {
					statusCode: 201,
					statusText: 'Created',
					otherField: {
						foo: 'bar'
					}
				}
			});

			expect(reply.status.calledWith(201)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 201,
					statusText: 'Created',
					otherField: {
						foo: 'bar'
					},
					data: 'Success'
				})
			).to.be.true;
		});

		it('should return an error response when handler rejects', async () => {
			const handler = async () => {
				throw new Error('Failed to resolves user data.');
			};

			await tryCatch(handler, reply);

			expect(reply.status.calledWith(500)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 500,
					statusText: 'Internal Server Error',
					error: {
						name: 'Error',
						message: 'Failed to resolves user data.'
					}
				})
			).to.be.true;
		});

		it('should return an error response when handler is synchronous function', async () => {
			const handler = () => {
				throw new Error('Failed to retrieve user data.');
			};

			await tryCatch(handler, reply);

			expect(reply.status.calledWith(500)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 500,
					statusText: 'Internal Server Error',
					error: {
						name: 'Error',
						message: 'Failed to retrieve user data.'
					}
				})
			);
		});

		it('should return a custom error payload', async () => {
			const handler = async () => {
				throw new SyntaxError('Something Wrong On Our Servers.');
			};

			await tryCatch(handler, reply, {
				errorCustomPayload: {
					statusCode: 501,
					statusText: 'Not Implemented',
					error: {
						name: 'Error',
						message: 'Something Wrong On Our Servers.'
					},
					message: 'Please refresh the page.'
				}
			});

			expect(reply.status.calledWith(501)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 501,
					statusText: 'Not Implemented',
					error: {
						name: 'Error',
						message: 'Something Wrong On Our Servers.'
					},
					message: 'Please refresh the page.'
				})
			).to.be.true;
		});

		it('should handle an error without status or message gracefully', async () => {
			const handler = async () => {
				throw {};
			};

			await tryCatch(handler, reply);

			expect(reply.status.calledWith(500)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 500,
					statusText: 'Internal Server Error',
					error: {
						name: 'Error',
						message: 'Something Went Wrong'
					}
				})
			).to.be.true;
		});

		it('should fallback to default success status codes if invalid values are provided', async () => {
			const handler = async () => 'Valid Data';

			await tryCatch(handler, reply, {
				successCustomPayload: {
					statusCode: 'not number',
					statusText: ''
				}
			});

			expect(reply.status.calledWith(200)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 200,
					statusText: 'OK',
					data: 'Valid Data'
				})
			).to.be.true;
		});

		it('should fallback to default error status codes if invalid values are provided', async () => {
			const handler = async () => {
				throw {};
			};

			await tryCatch(handler, reply, {
				errorCustomPayload: {
					statusCode: 'not an number',
					statusText: ''
				}
			});

			expect(reply.status.calledWith(500)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 500,
					statusText: 'Internal Server Error',
					error: {
						name: 'Error',
						message: 'Something Went Wrong'
					}
				})
			);
		});

		it('should handle non-function handler values correctly', async () => {
			const handler = { direct: 'value' };

			await tryCatch(handler, reply);

			expect(reply.status.calledWith(200)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 200,
					statusText: 'OK',
					data: { direct: 'value' }
				})
			).to.be.true;
		});
	});

	describe('sendSuccessResponse()', () => {
		let reply =
			/** @type {Record<'status' | 'send', import('sinon').SinonStub>} */ (
				undefined
			);

		beforeEach(() => {
			reply = {
				status: sinon.stub().returnsThis(),
				send: sinon.stub()
			};
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should send a success response with default status 200', () => {
			sendSuccessResponse(reply);

			expect(reply.status.calledWith(200)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 200,
					statusText: 'OK',
					data: {}
				})
			).to.be.true;
		});

		it('should send a success response with custom status code and data', () => {
			sendSuccessResponse(reply, 201, { id: 1, name: 'John', age: 30 });

			expect(reply.status.calledWith(201)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 201,
					statusText: 'Created',
					data: { id: 1, name: 'John', age: 30 }
				})
			).to.be.true;
		});

		it('should fallback to 200 if an invalid status code is provided', () => {
			sendSuccessResponse(reply, 999, { id: 1, name: 'John', age: 30 });

			expect(reply.status.calledWith(200)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: true,
					statusCode: 200,
					statusText: 'OK',
					data: { id: 1, name: 'John', age: 30 }
				})
			).to.be.true;
		});
	});

	describe('sendErrorResponse()', () => {
		let reply =
			/** @type {Record<'status' | 'send', import('sinon').SinonStub>} */ (
				undefined
			);

		beforeEach(() => {
			reply = {
				status: sinon.stub().returnsThis(),
				send: sinon.stub()
			};
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should send an error response with default 500 status', () => {
			sendErrorResponse(reply);

			expect(reply.status.calledWith(500)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 500,
					statusText: 'Internal Server Error',
					error: { name: 'Error', message: 'Something Went Wrong' }
				})
			).to.be.true;
		});

		it('should send an error response with custom status and error object', () => {
			sendErrorResponse(reply, 400, {
				name: 'ValidationError',
				message: 'Invalid input'
			});

			expect(reply.status.calledWith(400)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 400,
					statusText: 'Bad Request',
					error: { name: 'ValidationError', message: 'Invalid input' }
				})
			).to.be.true;
		});

		it('should send an error response with string message', () => {
			sendErrorResponse(reply, 401, 'Unauthorized access');

			expect(reply.status.calledWith(401)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 401,
					statusText: 'Unauthorized',
					error: { name: 'Error', message: 'Unauthorized access' }
				})
			).to.be.true;
		});

		it('should fallback to 500 if an invalid status code is provided', () => {
			sendErrorResponse(reply, 999, 'Unknown error');

			expect(reply.status.calledWith(500)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 500,
					statusText: 'Internal Server Error',
					error: { name: 'Error', message: 'Unknown error' }
				})
			).to.be.true;
		});

		it('should fallback to default error object if invalid error type is passed', () => {
			sendErrorResponse(reply, 400, 1359);

			expect(reply.status.calledWith(400)).to.be.true;
			expect(
				reply.send.calledWithMatch({
					ok: false,
					statusCode: 400,
					statusText: 'Bad Request',
					error: { name: 'Error', message: 'Something Went Wrong' }
				})
			).to.be.true;
		});
	});
});
