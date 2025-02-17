import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import Task from '../../../src/lib/iloveimg/Task.js';
import {
	ILoveApiError,
	NetworkError
} from '../../../src/lib/iloveimg/Error.js';
import { ZodError } from 'zod';

use(chaiAsPromised);

describe('ILoveIMGApi Task Tests', function () {
	it('should throw an error when publicKey not an string or not provided', function () {
		expect(
			() => new Task(null, undefined, 'sometaskid', 'myprovider.com')
		).to.throw(Error, 'publicKey is required and must be a string.');
		expect(
			() => new Task(undefined, null, 'sometaskid', 'myprovider.com')
		).to.throw(Error, 'publicKey is required and must be a string.');
		expect(
			() => new Task({}, 'secretKey', 'sometaskid', 'myprovider.com')
		).to.throw(Error, 'publicKey is required and must be a string.');
		expect(
			() => new Task(true, 'secretKey', 'sometaskid', 'myprovider.com')
		).to.throw(Error, 'publicKey is required and must be a string.');
		expect(
			() => new Task(99, 'secretKey', 'sometaskid', 'myprovider.com')
		).to.throw(Error, 'publicKey is required and must be a string.');
		expect(
			() => new Task('', 'secretKey', 'sometaskid', 'myprovider.com')
		).to.throw(Error, 'publicKey is required and must be a string.');
	});

	it('should throw an error when secretKey provided but not an string', function () {
		expect(
			() => new Task('publicKey', [], 'someTaskId', 'provider.com')
		).to.throw(Error, 'secretKey must be a string.');
		expect(
			() => new Task('publicKey', {}, 'someTaskId', 'provider.com')
		).to.throw(Error, 'secretKey must be a string.');
		expect(
			() => new Task('publicKey', true, 'someTaskId', 'provider.com')
		).to.throw(Error, 'secretKey must be a string.');
		expect(
			() => new Task('publicKey', 21, 'someTaskId', 'provider.com')
		).to.throw(Error, 'secretKey must be a string.');
	});

	it('should throw an error when taskId and taskServer not an string or not provided', function () {
		expect(() => new Task('publicKey', 'secretKey', null, null)).to.throw(
			Error,
			'taskId and taskServer are required and should be string.'
		);
		expect(
			() => new Task('publicKey', 'secretKey', undefined, undefined)
		).to.throw(
			Error,
			'taskId and taskServer are required and should be string.'
		);
		expect(() => new Task('publicKey', 'secretKey', {}, {})).to.throw(
			Error,
			'taskId and taskServer are required and should be string.'
		);
		expect(() => new Task('publicKey', 'secretKey', false, true)).to.throw(
			Error,
			'taskId and taskServer are required and should be string.'
		);
		expect(() => new Task('publicKey', 'secretKey', 22, 15)).to.throw(
			Error,
			'taskId and taskServer are required and should be string.'
		);
		expect(() => new Task('publicKey', 'secretKey', '', '')).to.throw(
			Error,
			'taskId and taskServer are required and should be string.'
		);
	});
});

describe('ILoveIMGApi Task.download() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task('publicKey', 'secretKey', 'someTaskId', 'provider.com');
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Expect ZodError when type of options itself invalid.
		await expect(task.download(null)).to.be.rejectedWith(ZodError);
		await expect(task.download(1)).to.be.rejectedWith(ZodError);
		await expect(task.download('lorem')).to.be.rejectedWith(ZodError);
		await expect(task.download(false)).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(task.download({ debug: null })).to.be.rejectedWith(ZodError);
		await expect(task.download({ debug: 1 })).to.be.rejectedWith(ZodError);
		await expect(task.download({ debug: 'xyz' })).to.be.rejectedWith(ZodError);
		await expect(task.download({ debug: {} })).to.be.rejectedWith(ZodError);
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			server: {
				get: async () => {
					throw new Error('Simulating generic error');
				},
				defaults: {
					headers: {}
				}
			}
		};

		task._setServer(setup.server);
		const serverSpy = sinon.spy(setup.server, 'get');

		await expect(task.download()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal('/download/someTaskId');
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			server: [
				{
					get: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true
						};
					},
					defaults: {
						headers: {}
					}
				}
			]
		};

		// Request is made but no response received.
		const serverSpy = sinon.spy(setup.server[0], 'get');
		task._setServer(setup.server[0]);
		await expect(task.download()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal('/download/someTaskId');

		// Request setup fails.
		const serverSpy1 = sinon.spy(setup.server[1], 'get');
		task._setServer(setup.server[1]);
		await expect(task.download()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
		expect(serverSpy1.calledOnce).to.be.true;
		expect(serverSpy1.firstCall.args[0]).to.be.equal('/download/someTaskId');
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			server: [
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 401,
								data: { message: 'Unauthorized', code: 666 }
							}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 500,
								data: {
									error: { message: 'Internal Server Error', code: '' }
								}
							}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 400,
								data: { unknownField: 'no error message' }
							}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 422,
								data: null
							}
						};
					},
					defaults: {
						headers: {}
					}
				}
			],
			expectedError: [
				'Unauthorized (Status: 401, Code: 666)',
				'Internal Server Error (Status: 500, Code: -1)',
				'Unknown API error occurred. (Status: 400, Code: -1)',
				'Unknown API error occurred. (Status: 422, Code: -1)'
			]
		};

		let serverSpy;

		for (let index = 0; index < setup.server.length; index++) {
			const server = setup.server[index];
			const expectedError = setup.expectedError[index];

			serverSpy = sinon.spy(server, 'get');
			task._setServer(server);

			await expect(task.download()).to.be.rejectedWith(
				ILoveApiError,
				expectedError
			);
			expect(serverSpy.calledOnce).to.be.true;
			expect(serverSpy.firstCall.args[0]).to.be.equal('/download/someTaskId');

			serverSpy.restore();
		}
	});
});

describe('ILoveIMGApi Task.details() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task('publicKey', 'secretKey', 'someTaskId', 'provider.com');
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Expect ZodError when type of options itself invalid.
		await expect(task.details(null)).to.be.rejectedWith(ZodError);
		await expect(task.details(1)).to.be.rejectedWith(ZodError);
		await expect(task.details('lorem')).to.be.rejectedWith(ZodError);
		await expect(task.details(false)).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(task.details({ debug: null })).to.be.rejectedWith(ZodError);
		await expect(task.details({ debug: 1 })).to.be.rejectedWith(ZodError);
		await expect(task.details({ debug: 'xyz' })).to.be.rejectedWith(ZodError);
		await expect(task.details({ debug: {} })).to.be.rejectedWith(ZodError);
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			server: {
				get: async () => {
					throw new Error('Simulating generic error');
				},
				defaults: {
					headers: {}
				}
			}
		};

		task._setServer(setup.server);

		const serverSpy = sinon.spy(setup.server, 'get');

		await expect(task.details()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal('/task/someTaskId');
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			server: [
				{
					get: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true
						};
					},
					defaults: {
						headers: {}
					}
				}
			]
		};

		// Request is made but no response received.
		const serverSpy = sinon.spy(setup.server[0], 'get');
		task._setServer(setup.server[0]);
		await expect(task.details()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal('/task/someTaskId');

		// Request setup fails.
		const serverSpy1 = sinon.spy(setup.server[1], 'get');
		task._setServer(setup.server[1]);
		await expect(task.details()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
		expect(serverSpy1.calledOnce).to.be.true;
		expect(serverSpy1.firstCall.args[0]).to.be.equal('/task/someTaskId');
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			server: [
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 401,
								data: { message: 'Unauthorized', code: 666 }
							}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 500,
								data: {
									error: { message: 'Internal Server Error', code: '' }
								}
							}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 400,
								data: { unknownField: 'no error message' }
							}
						};
					},
					defaults: {
						headers: {}
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 422,
								data: null
							}
						};
					},
					defaults: {
						headers: {}
					}
				}
			],
			expectedError: [
				'Unauthorized (Status: 401, Code: 666)',
				'Internal Server Error (Status: 500, Code: -1)',
				'Unknown API error occurred. (Status: 400, Code: -1)',
				'Unknown API error occurred. (Status: 422, Code: -1)'
			]
		};

		let serverSpy;

		for (let index = 0; index < setup.server.length; index++) {
			const server = setup.server[index];
			const expectedError = setup.expectedError[index];

			serverSpy = sinon.spy(server, 'get');
			task._setServer(server);

			await expect(task.details()).to.be.rejectedWith(
				ILoveApiError,
				expectedError
			);
			expect(serverSpy.calledOnce).to.be.true;
			expect(serverSpy.firstCall.args[0]).to.be.equal('/task/someTaskId');

			serverSpy.restore();
		}
	});
});
