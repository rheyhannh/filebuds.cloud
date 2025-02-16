import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import TaskI from '../../../src/lib/iloveimg/TaskI.js';
import {
	ILoveApiError,
	NetworkError
} from '../../../src/lib/iloveimg/Error.js';
import { ZodError } from 'zod';
import * as TaskSchema from '../../../src/lib/iloveimg/schema/Task.js';
import * as _TaskUtils from '../../../src/lib/iloveimg/util/task.util.js';
import config from '../../../src/config/env.js';

use(chaiAsPromised);

// We need to import with this behaviour to make sinon working in testing environment
const TaskUtils = _TaskUtils.default;
const { ILOVEIMG_API_URL_PROTOCOL, ILOVEIMG_API_VERSION } = config;

describe('ILoveIMGApi TaskI.getTool() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	it('should return undefined when no tool is set', function () {
		expect(task.getTool()).to.be.undefined;
	});

	it('should return correct tool type', function () {
		task = new TaskI('lorem', 'ipsum', 'removebackgroundimage');
		expect(task.getTool()).to.equal('removebackgroundimage');
	});
});

describe('ILoveIMGApi TaskI.getTaskId() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should return undefined when start() not initiated', function () {
		expect(task.getTaskId()).to.be.undefined;
	});

	it('should return correct task id after start() initiated', function () {
		// In order to calling start() we need to mock start method itself
		// Use internal method to override private field seems to be the best option here
		task._setTaskId('task-id');
		expect(task.getTaskId()).to.equal('task-id');
	});
});

describe('ILoveIMGApi TaskI.getRemainingFiles() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should return undefined when start() not initiated', function () {
		expect(task.getRemainingFiles()).to.be.undefined;
	});

	it('should return correct remaining files after start() initiated', function () {
		// In order to calling start() we need to mock start method itself
		// Use internal method to override private field seems to be the best option here
		task._setRemainingFiles(3925);
		expect(task.getRemainingFiles()).to.equal(3925);
	});
});

describe('ILoveIMGApi TaskI.getUploadedFiles() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should return undefined when start() not initiated', function () {
		expect(task.getUploadedFiles()).to.be.undefined;
	});

	it('should return undefined after start() initiated and no files uploaded', function () {
		// In order to calling start() we need to mock start method itself
		// Use internal method to override private field seems to be the best option here
		task._setServer('server');
		task._setTaskId('task-id');
		expect(task.getUploadedFiles()).to.be.undefined;
	});

	it('should return correct files after start() initiated and files uploaded', function () {
		// In order to calling start() we need to mock start method itself
		// Use internal method to override private field seems to be the best option here
		task._setServer('server');
		task._setTaskId('task-id');
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolor.jpg',
				filename: 'loremipsumdolor.jpg'
			}
		]);
		expect(task.getUploadedFiles()).to.be.deep.equal([
			{
				server_filename: 'loremipsumdolor.jpg',
				filename: 'loremipsumdolor.jpg'
			}
		]);
	});
});

describe('ILoveIMGApi TaskI.getServer() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should return undefined when start() not initiated', function () {
		expect(task.getServer()).to.be.undefined;
	});

	it('should return correct server instance after start() initiated', function () {
		// In order to calling start() we need to mock start method itself
		// Use internal method to override private field seems to be the best option here
		task._setServer('server');
		task._setTaskId('task-id');
		expect(task.getServer()).to.equal('server');
	});
});

describe('ILoveIMGApi TaskI.start() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Expect ZodError when type of options itself invalid.
		await expect(task.start(null)).to.be.rejectedWith(ZodError);
		await expect(task.start(1)).to.be.rejectedWith(ZodError);
		await expect(task.start('lorem')).to.be.rejectedWith(ZodError);
		await expect(task.start(false)).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(task.start({ debug: null })).to.be.rejectedWith(ZodError);
		await expect(task.start({ debug: 1 })).to.be.rejectedWith(ZodError);
		await expect(task.start({ debug: 'xyz' })).to.be.rejectedWith(ZodError);
		await expect(task.start({ debug: {} })).to.be.rejectedWith(ZodError);
	});

	it('should throw Error when missing required fields on API response', async function () {
		const setup = {
			get: async () => ({}),
			defaults: {
				headers: {}
			}
		};

		const setupData = [
			null,
			{
				server: 'assigned-server',
				task: 'assigned-task-id',
				remaining_files: undefined
			},
			{ server: 'assigned-server', task: null, remaining_files: 55 },
			{ server: '', task: 'assigned-task-id', remaining_files: 55 }
		];

		const taskInstance = new TaskI({ getToken: async () => 'faketoken' }, setup);
		taskInstance._setTool('upscaleimage');

		for (let index = 0; index < setupData.length; index++) {
			const x = setupData[index];

			const getStub = sinon.stub(setup, 'get').resolves({ data: x });
			await expect(taskInstance.start()).to.be.rejectedWith(
				'Invalid response: missing required fields'
			);
			expect(getStub.calledOnceWith('/start/upscaleimage')).to.be.true;

			getStub.restore();
		}
	});

	it('should set the fields and return the expected data on a successful API response', async function () {
		const setup = {
			get: async () => ({}),
			defaults: {
				headers: {}
			}
		};

		const setupData = {
			server: 'assigned-server',
			task: 'assigned-task-id',
			remaining_files: 255
		};

		const taskInstance = new TaskI({ getToken: async () => 'faketoken' }, setup);
		taskInstance._setTool('upscaleimage');

		const getStub = sinon.stub(setup, 'get').resolves({ data: setupData });
		const result = await taskInstance.start();

		const axiosInstance = taskInstance.getServer();

		expect(getStub.calledOnceWith('/start/upscaleimage')).to.be.true;
		expect(axiosInstance.defaults.baseURL).to.be.eq(
			`${ILOVEIMG_API_URL_PROTOCOL}://${setupData.server}/${ILOVEIMG_API_VERSION}`
		);
		expect(axiosInstance.defaults.headers['Content-Type']).to.be.eq(
			'application/json;charset=UTF-8'
		);
		expect(axiosInstance.defaults.headers['Authorization']).to.be.eq(
			'Bearer faketoken'
		);
		expect(taskInstance.getTaskId()).to.be.eq(setupData.task);
		expect(taskInstance.getRemainingFiles()).to.be.eq(
			setupData.remaining_files
		);
		expect(taskInstance.getUploadedFiles()).to.be.an('array').that.is.empty;
		expect(result.server).to.be.eq(setupData.server);
		expect(result.task_id).to.be.eq(setupData.task);
		expect(result.remaining_files).to.be.eq(setupData.remaining_files);
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			auth: {
				getToken: async () => 'faketoken'
			},
			fixed_server: {
				get: async () => {
					throw new Error('Simulating generic error');
				},
				defaults: {
					headers: {}
				}
			},
			tool: 'removebackgroundimage'
		};

		const authSpy = sinon.spy(setup.auth, 'getToken');
		const fixedServerSpy = sinon.spy(setup.fixed_server, 'get');

		task = new TaskI(setup.auth, setup.fixed_server, setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server.defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			auth: {
				getToken: async () => 'faketoken'
			},
			fixed_server: [
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
			],
			tool: 'removebackgroundimage'
		};

		const authSpy = sinon.spy(setup.auth, 'getToken');

		// Request is made but no response received.
		const fixedServerSpy = sinon.spy(setup.fixed_server[0], 'get');
		task = new TaskI(setup.auth, setup.fixed_server[0], setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server[0].defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);

		authSpy.resetHistory();

		// Request setup fails.
		const fixedServerSpy1 = sinon.spy(setup.fixed_server[1], 'get');
		task = new TaskI(setup.auth, setup.fixed_server[1], setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server[1].defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy1.calledOnce).to.be.true;
		expect(fixedServerSpy1.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			auth: {
				getToken: async () => 'faketoken'
			},
			fixed_server: [
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
			tool: 'removebackgroundimage'
		};

		const authSpy = sinon.spy(setup.auth, 'getToken');

		// Use message from response.data.message
		const fixedServerSpy = sinon.spy(setup.fixed_server[0], 'get');
		task = new TaskI(setup.auth, setup.fixed_server[0], setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			ILoveApiError,
			'Unauthorized (Status: 401, Code: 666)'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server[0].defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);

		authSpy.resetHistory();

		// Use message from response.data.error.message
		const fixedServerSpy1 = sinon.spy(setup.fixed_server[1], 'get');
		task = new TaskI(setup.auth, setup.fixed_server[1], setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server[1].defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy1.calledOnce).to.be.true;
		expect(fixedServerSpy1.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);

		authSpy.resetHistory();

		// No message is available
		const fixedServerSpy2 = sinon.spy(setup.fixed_server[2], 'get');
		task = new TaskI(setup.auth, setup.fixed_server[2], setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 400, Code: -1)'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server[2].defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy2.calledOnce).to.be.true;
		expect(fixedServerSpy2.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);

		authSpy.resetHistory();

		// No response payload
		const fixedServerSpy3 = sinon.spy(setup.fixed_server[3], 'get');
		task = new TaskI(setup.auth, setup.fixed_server[3], setup.tool);

		await expect(task.start()).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 422, Code: -1)'
		);
		expect(authSpy.calledOnce).to.be.true;
		expect(setup.fixed_server[3].defaults.headers['Authorization']).to.be.equal(
			`Bearer faketoken`
		);
		expect(fixedServerSpy3.calledOnce).to.be.true;
		expect(fixedServerSpy3.firstCall.args[0]).to.be.equal(
			`/start/${setup.tool}`
		);
	});
});

describe('ILoveIMGApi TaskI.addFile() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or server are not exist', async function () {
		// This test ensure start() are initiated first before upload file using addFile()
		await expect(
			task.addFile({ cloud_file: 'https://i.imgur.com/tPRdaa3.jpeg' })
		).to.be.rejectedWith(
			'You need to retrieve task id and assigned server first using start() method.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Use internal method to override private field
		task._setTaskId('fake-taskid');
		task._setServer('fake-server');

		// Expect ZodError when type of options itself invalid.
		await expect(task.addFile({})).to.be.rejectedWith(ZodError);
		await expect(task.addFile(null)).to.be.rejectedWith(ZodError);
		await expect(task.addFile(false)).to.be.rejectedWith(ZodError);
		await expect(task.addFile(999)).to.be.rejectedWith(ZodError);
		await expect(task.addFile('lorems')).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(
			task.addFile({
				cloud_file: {},
				debug: 666
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.addFile({
				cloud_file: 'https://i.imgur.com/tPRdaa3.jpeg',
				debug: {}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.addFile({
				cloud_file: false,
				debug: true
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.addFile({
				cloud_file: null,
				debug: null
			})
		).to.be.rejectedWith(ZodError);
	});

	it('should use correct options from options param', async function () {
		// This test ensure validator function are called and used options are validated.
		// Use internal method to override private field
		task._setTool('removebackgroundimage');
		task._setTaskId('stubed-task_id');
		task._setServer({
			post: async () => ({
				/** @type {TaskSchema.TaskAddFileReturnTypeInfered} */
				data: {
					server_filename:
						'36ca60526e11c8bbaa2c8a65e8fe81adc508f5adc89269be0x7483d352z0895c.jpg'
				}
			})
		});

		let options = /** @type {TaskSchema.TaskAddFileGenericOptionsInfered} */ ({
			cloud_file: 'https://i.imgur.com/awesome.jpeg',
			debug: true
		});

		const genericOptionsValidatorSpy = sinon.spy(
			TaskSchema.TaskAddFileGenericOptions,
			'parseAsync'
		);

		const result = await task.addFile(options);

		expect(result).to.deep.equal({
			server_filename:
				'36ca60526e11c8bbaa2c8a65e8fe81adc508f5adc89269be0x7483d352z0895c.jpg'
		});
		expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
		expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
			options
		);
		await expect(
			genericOptionsValidatorSpy.returnValues[0]
		).to.eventually.deep.equal(options);
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			server: {
				post: async () => {
					throw new Error('Simulating generic error');
				}
			},
			tool: 'removebackgroundimage',
			task_id: 'fake-taskid'
		};

		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);
		task._setServer(setup.server);

		const fixedServerSpy = sinon.spy(setup.server, 'post');

		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(Error, 'Simulating generic error');
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal('/upload');
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			server: [
				{
					post: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true
						};
					}
				}
			],
			tool: 'removebackgroundimage',
			task_id: 'fake-taskid'
		};

		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);

		// Request is made but no response received.
		const fixedServerSpy = sinon.spy(setup.server[0], 'post');
		task._setServer(setup.server[0]);
		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(NetworkError, 'No response received from the server.');

		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal('/upload');

		// Request setup fails.
		const fixedServerSpy1 = sinon.spy(setup.server[1], 'post');
		task._setServer(setup.server[1]);
		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);

		expect(fixedServerSpy1.calledOnce).to.be.true;
		expect(fixedServerSpy1.firstCall.args[0]).to.be.equal('/upload');
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			auth: {
				getToken: async () => 'faketoken'
			},
			server: [
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 401,
								data: { message: 'Unauthorized', code: 666 }
							}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 500,
								data: {
									error: { message: 'Internal Server Error', code: '' }
								}
							}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 400,
								data: { unknownField: 'no error message' }
							}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 422,
								data: null
							}
						};
					}
				}
			],
			tool: 'removebackgroundimage',
			task_id: 'fake-taskid'
		};

		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);

		// Use message from response.data.message
		const fixedServerSpy = sinon.spy(setup.server[0], 'post');
		task._setServer(setup.server[0]);
		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Unauthorized (Status: 401, Code: 666)'
		);
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal('/upload');

		// Use message from response.data.error.message
		const fixedServerSpy1 = sinon.spy(setup.server[1], 'post');
		task._setServer(setup.server[1]);
		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);
		expect(fixedServerSpy1.calledOnce).to.be.true;
		expect(fixedServerSpy1.firstCall.args[0]).to.be.equal('/upload');

		// No message is available
		const fixedServerSpy2 = sinon.spy(setup.server[2], 'post');
		task._setServer(setup.server[2]);
		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 400, Code: -1)'
		);
		expect(fixedServerSpy2.calledOnce).to.be.true;
		expect(fixedServerSpy2.firstCall.args[0]).to.be.equal('/upload');

		// No response payload
		const fixedServerSpy3 = sinon.spy(setup.server[3], 'post');
		task._setServer(setup.server[3]);
		await expect(
			task.addFile({ cloud_file: 'https://github.com/image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 422, Code: -1)'
		);
		expect(fixedServerSpy3.calledOnce).to.be.true;
		expect(fixedServerSpy3.firstCall.args[0]).to.be.equal('/upload');
	});
});

describe('ILoveIMGApi TaskI.deleteFile() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or server are not exist', async function () {
		// This test ensure start() are initiated first before delete file using delete()
		await expect(
			task.deleteFile({ server_filename: 'loremipsumdolor.jpg' })
		).to.be.rejectedWith(
			'You need to retrieve task id and assigned server first using start() method.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Use internal method to override private field
		task._setTaskId('fake-taskid');
		task._setServer('fake-server');

		// Expect ZodError when type of options itself invalid.
		await expect(task.deleteFile({})).to.be.rejectedWith(ZodError);
		await expect(task.deleteFile(null)).to.be.rejectedWith(ZodError);
		await expect(task.deleteFile(false)).to.be.rejectedWith(ZodError);
		await expect(task.deleteFile(999)).to.be.rejectedWith(ZodError);
		await expect(task.deleteFile('lorems')).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(
			task.deleteFile({
				server_filename: {},
				debug: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.deleteFile({
				server_filename: 'loremipsumdolor.jpg',
				debug: 999
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.deleteFile({
				server_filename: false,
				debug: true
			})
		).to.be.rejectedWith(ZodError);
	});

	it('should use correct options from options param', async function () {
		// This test ensure validator function are called and used options are validated.
		// Use internal method to override private field
		task._setTool('removebackgroundimage');
		task._setTaskId('stubed-task_id');
		task._setServer({
			delete: async () => ({
				/** @type {TaskSchema.TaskRemoveFileReturnTypeInfered} */
				data: {
					success: true
				}
			})
		});

		let options =
			/** @type {TaskSchema.TaskRemoveFileGenericOptionsInfered} */ ({
				server_filename:
					'36ca60526e11c8bbaa2c8a65e8fe81adc508f5adc89269be0x7483d352z0895c.jpg',
				debug: true
			});

		const genericOptionsValidatorSpy = sinon.spy(
			TaskSchema.TaskRemoveFileGenericOptions,
			'parseAsync'
		);

		await expect(task.deleteFile(options)).to.eventually.deep.equal({
			success: true
		});
		expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
		expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
			options
		);
		await expect(
			genericOptionsValidatorSpy.returnValues[0]
		).to.eventually.deep.equal(options);
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			server: {
				delete: async () => {
					throw new Error('Simulating generic error');
				}
			},
			tool: 'removebackgroundimage',
			task_id: 'fake-taskid'
		};

		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);
		task._setServer(setup.server);

		const fixedServerSpy = sinon.spy(setup.server, 'delete');

		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(Error, 'Simulating generic error');
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal('/upload');
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			server: [
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true
						};
					}
				}
			],
			tool: 'removebackgroundimage',
			task_id: 'fake-taskid'
		};

		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);

		// Request is made but no response received.
		const fixedServerSpy = sinon.spy(setup.server[0], 'delete');
		task._setServer(setup.server[0]);
		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(NetworkError, 'No response received from the server.');

		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal('/upload');

		// Request setup fails.
		const fixedServerSpy1 = sinon.spy(setup.server[1], 'delete');
		task._setServer(setup.server[1]);
		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);

		expect(fixedServerSpy1.calledOnce).to.be.true;
		expect(fixedServerSpy1.firstCall.args[0]).to.be.equal('/upload');
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			auth: {
				getToken: async () => 'faketoken'
			},
			server: [
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 401,
								data: { message: 'Unauthorized', code: 666 }
							}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 500,
								data: {
									error: { message: 'Internal Server Error', code: '' }
								}
							}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 400,
								data: { unknownField: 'no error message' }
							}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 422,
								data: null
							}
						};
					}
				}
			],
			tool: 'removebackgroundimage',
			task_id: 'fake-taskid'
		};

		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);

		// Use message from response.data.message
		const fixedServerSpy = sinon.spy(setup.server[0], 'delete');
		task._setServer(setup.server[0]);
		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Unauthorized (Status: 401, Code: 666)'
		);
		expect(fixedServerSpy.calledOnce).to.be.true;
		expect(fixedServerSpy.firstCall.args[0]).to.be.equal('/upload');

		// Use message from response.data.error.message
		const fixedServerSpy1 = sinon.spy(setup.server[1], 'delete');
		task._setServer(setup.server[1]);
		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);
		expect(fixedServerSpy1.calledOnce).to.be.true;
		expect(fixedServerSpy1.firstCall.args[0]).to.be.equal('/upload');

		// No message is available
		const fixedServerSpy2 = sinon.spy(setup.server[2], 'delete');
		task._setServer(setup.server[2]);
		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 400, Code: -1)'
		);
		expect(fixedServerSpy2.calledOnce).to.be.true;
		expect(fixedServerSpy2.firstCall.args[0]).to.be.equal('/upload');

		// No response payload
		const fixedServerSpy3 = sinon.spy(setup.server[3], 'delete');
		task._setServer(setup.server[3]);
		await expect(
			task.deleteFile({ server_filename: 'image.jpg' })
		).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 422, Code: -1)'
		);
		expect(fixedServerSpy3.calledOnce).to.be.true;
		expect(fixedServerSpy3.firstCall.args[0]).to.be.equal('/upload');
	});
});

describe('ILoveIMGApi TaskI.download() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or server are not exist', async function () {
		// This test ensure start() are initiated first before download processed file using download()
		await expect(task.download()).to.be.rejectedWith(
			'You need to retrieve task id and assigned server first using start() method.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		task._setTaskId('fake-taskid');
		task._setServer({
			get: async () => ({
				data: 'processedfile'
			})
		});

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
			task_id: 'fake-taskid',
			server: {
				get: async () => {
					throw new Error('Simulating generic error');
				}
			}
		};

		task._setTaskId(setup.task_id);
		task._setServer(setup.server);

		const serverSpy = sinon.spy(setup.server, 'get');

		await expect(task.download()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal(
			`/download/${setup.task_id}`
		);
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
			server: [
				{
					get: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true
						};
					}
				}
			]
		};

		task._setTaskId(setup.task_id);

		// Request is made but no response received.
		const serverSpy = sinon.spy(setup.server[0], 'get');
		task._setServer(setup.server[0]);
		await expect(task.download()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal(
			`/download/${setup.task_id}`
		);

		// Request setup fails.
		const serverSpy1 = sinon.spy(setup.server[1], 'get');
		task._setServer(setup.server[1]);
		await expect(task.download()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
		expect(serverSpy1.calledOnce).to.be.true;
		expect(serverSpy1.firstCall.args[0]).to.be.equal(
			`/download/${setup.task_id}`
		);
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
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
		task._setTaskId(setup.task_id);

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
			expect(serverSpy.firstCall.args[0]).to.be.equal(
				`/download/${setup.task_id}`
			);

			serverSpy.restore();
		}
	});
});

describe('ILoveIMGApi TaskI.details() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or server are not exist', async function () {
		// This test ensure start() are initiated first before getting task information using details()
		await expect(task.details()).to.be.rejectedWith(
			'You need to retrieve task id and assigned server first using start() method.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		task._setTaskId('fake-taskid');
		task._setServer({
			get: async () => ({
				data: 'processedfile'
			})
		});

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
			task_id: 'fake-taskid',
			server: {
				get: async () => {
					throw new Error('Simulating generic error');
				}
			}
		};

		task._setTaskId(setup.task_id);
		task._setServer(setup.server);

		const serverSpy = sinon.spy(setup.server, 'get');

		await expect(task.details()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
			server: [
				{
					get: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					}
				},
				{
					get: async () => {
						throw {
							isAxiosError: true
						};
					}
				}
			]
		};

		task._setTaskId(setup.task_id);

		// Request is made but no response received.
		const serverSpy = sinon.spy(setup.server[0], 'get');
		task._setServer(setup.server[0]);
		await expect(task.details()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);

		// Request setup fails.
		const serverSpy1 = sinon.spy(setup.server[1], 'get');
		task._setServer(setup.server[1]);
		await expect(task.details()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
		expect(serverSpy1.calledOnce).to.be.true;
		expect(serverSpy1.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
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
		task._setTaskId(setup.task_id);

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
			expect(serverSpy.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);

			serverSpy.restore();
		}
	});
});

describe('ILoveIMGApi TaskI.delete() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or server are not exist', async function () {
		// This test ensure start() are initiated first before delete task using delete()
		await expect(task.delete()).to.be.rejectedWith(
			'You need to retrieve task id and assigned server first using start() method.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		task._setTaskId('fake-taskid');
		task._setServer({
			get: async () => ({
				data: 'processedfile'
			})
		});

		// Expect ZodError when type of options itself invalid.
		await expect(task.delete(null)).to.be.rejectedWith(ZodError);
		await expect(task.delete(1)).to.be.rejectedWith(ZodError);
		await expect(task.delete('lorem')).to.be.rejectedWith(ZodError);
		await expect(task.delete(false)).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(task.delete({ debug: null })).to.be.rejectedWith(ZodError);
		await expect(task.delete({ debug: 1 })).to.be.rejectedWith(ZodError);
		await expect(task.delete({ debug: 'xyz' })).to.be.rejectedWith(ZodError);
		await expect(task.delete({ debug: {} })).to.be.rejectedWith(ZodError);
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
			server: {
				delete: async () => {
					throw new Error('Simulating generic error');
				}
			}
		};

		task._setTaskId(setup.task_id);
		task._setServer(setup.server);

		const serverSpy = sinon.spy(setup.server, 'delete');

		await expect(task.delete()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
			server: [
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true
						};
					}
				}
			]
		};

		task._setTaskId(setup.task_id);

		// Request is made but no response received.
		const serverSpy = sinon.spy(setup.server[0], 'delete');
		task._setServer(setup.server[0]);
		await expect(task.delete()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);
		expect(serverSpy.calledOnce).to.be.true;
		expect(serverSpy.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);

		// Request setup fails.
		const serverSpy1 = sinon.spy(setup.server[1], 'delete');
		task._setServer(setup.server[1]);
		await expect(task.delete()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
		expect(serverSpy1.calledOnce).to.be.true;
		expect(serverSpy1.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'fake-taskid',
			server: [
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 401,
								data: { message: 'Unauthorized', code: 666 }
							}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 500,
								data: {
									error: { message: 'Internal Server Error', code: '' }
								}
							}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 400,
								data: { unknownField: 'no error message' }
							}
						};
					}
				},
				{
					delete: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 422,
								data: null
							}
						};
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
		task._setTaskId(setup.task_id);

		for (let index = 0; index < setup.server.length; index++) {
			const server = setup.server[index];
			const expectedError = setup.expectedError[index];

			serverSpy = sinon.spy(server, 'delete');
			task._setServer(server);

			await expect(task.delete()).to.be.rejectedWith(
				ILoveApiError,
				expectedError
			);
			expect(serverSpy.calledOnce).to.be.true;
			expect(serverSpy.firstCall.args[0]).to.be.equal(`/task/${setup.task_id}`);

			serverSpy.restore();
		}
	});
});

describe('ILoveIMGApi TaskI.process() Tests', function () {
	let task = /** @type {TaskI} */ (undefined);

	beforeEach(function () {
		task = new TaskI();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or task server not assigned', async function () {
		await expect(task.process()).to.be.rejectedWith(
			Error,
			'You need to retrieve task id and assigned server first using start() method.'
		);
	});

	it('should throw Error when files not uploaded yet', async function () {
		// Use internal method to override private field
		task._setTaskId('task-id');
		task._setServer('server');

		// Expect error when files not uploaded yet.
		await expect(task.process()).to.be.rejectedWith(
			Error,
			'You need to add files first using addFile() method.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Use internal method to override private field
		task._setTaskId('stubed-task_id');
		task._setServer('stubed-server');
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolorsitamet.jpg',
				filename: 'lorem.jpg'
			}
		]);

		// Expect ZodError when type of options itself invalid.
		await expect(task.process(null)).to.be.rejectedWith(ZodError);
		await expect(task.process(1)).to.be.rejectedWith(ZodError);
		await expect(task.process('lorem')).to.be.rejectedWith(ZodError);
		await expect(task.process(false)).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(
			task.process({
				// This should be an string
				output_filename: 55
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an string
				packaged_filename: true
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an string with length 16, 24 or 32
				file_encryption_key: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an string with length 16, 24 or 32
				file_encryption_key: '1234567890abcde'
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an boolean
				try_image_repair: 'true'
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an number
				custom_int: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an string
				custom_string: 99
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process({
				// This should be an string
				custom_string: {}
			})
		).to.be.rejectedWith(ZodError);
	});

	it('should throw Error when tool field are not exist or valid', async function () {
		// Use internal method to override private field
		task._setTaskId('stubed-task_id');
		task._setServer('stubed-server');
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolorsitamet.jpg',
				filename: 'lorem.jpg'
			}
		]);

		await expect(task.process()).to.be.rejectedWith(
			Error,
			/^Unsupported tool: .+$/
		);
	});

	it('should throw ZodError when some attribute of toolOptions.convertimage are invalid', async function () {
		// Use internal method to override private field
		task._setTaskId('stubed-task_id');
		task._setServer('stubed-server');
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolorsitamet.jpg',
				filename: 'lorem.jpg'
			}
		]);
		task._setTool('convertimage');

		// Expect ZodError when type of toolOptions.convertimage itself are invalid.
		await expect(
			task.process(undefined, {
				convertimage: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				convertimage: 1
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				convertimage: 'lorem'
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				convertimage: false
			})
		).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of toolOptions.convertimage are invalid.
		await expect(
			task.process(undefined, {
				convertimage: {
					to: 'mp3'
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				convertimage: {
					gif_time: false
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				convertimage: {
					gif_loop: null
				}
			})
		).to.be.rejectedWith(ZodError);
	});

	it('should throw ZodError when some attribute of toolOptions.upscaleimage are invalid', async function () {
		// Use internal method to override private field
		task._setTaskId('stubed-task_id');
		task._setServer('stubed-server');
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolorsitamet.jpg',
				filename: 'lorem.jpg'
			}
		]);
		task._setTool('upscaleimage');

		// Expect ZodError when type of toolOptions.upscaleimage itself are invalid.
		await expect(
			task.process(undefined, {
				upscaleimage: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				upscaleimage: 1
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				upscaleimage: 'lorem'
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				upscaleimage: false
			})
		).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of toolOptions.upscaleimage are invalid.
		await expect(
			task.process(undefined, {
				upscaleimage: {
					multiplier: 5
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				upscaleimage: {}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				upscaleimage: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				upscaleimage: undefined
			})
		).to.be.rejectedWith(ZodError);
	});

	it('should throw ZodError when some attribute of toolOptions.watermarkimage are invalid', async function () {
		// Use internal method to override private field
		task._setTaskId('stubed-task_id');
		task._setServer('stubed-server');
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolorsitamet.jpg',
				filename: 'lorem.jpg'
			}
		]);
		task._setTool('watermarkimage');

		// Expect ZodError when type of toolOptions.watermarkimage itself are invalid.
		await expect(
			task.process(undefined, {
				watermarkimage: null
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: 1
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: 'lorem'
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: false
			})
		).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of toolOptions.watermarkimage are invalid.
		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: null
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: undefined
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: []
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [{}]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [{ type: null }]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							// 'image' should be filled
							type: 'image'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							// 'text' should be filled
							type: 'text'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							// 'image' should be filled and string
							type: 'image',
							image: 5
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							// 'text' should be filled and string
							type: 'text',
							text: false
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							image: 'my lovely img url'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							text: 'my lovely text'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'text',
							text: 'my lovely text',
							gravity: 'JawaBarat'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							vertical_adjustment_percent: false
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'text',
							text: 'my lovely text',
							horizontal_adjustment_percent: null
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							rotation: -1
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							rotation: 361
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'text',
							text: 'my lovely text',
							font_family: 'Ariel Peterpan'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							font_style: 999
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							font_style: 'bold'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							font_style: 'italic'
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'text',
							text: 'my lovely text',
							font_size: null
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely text',
							font_color: -999
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely img url',
							transparency: 0
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely img url',
							transparency: 100.1
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.process(undefined, {
				watermarkimage: {
					elements: [
						{
							type: 'image',
							image: 'my lovely img url',
							mosaic: null
						}
					]
				}
			})
		).to.be.rejectedWith(ZodError);
	});

	it('should use correct generic options from options param', async function () {
		// This test ensure validator function are called and used options are validated.
		// Use internal method to override private field
		task._setTaskId('stubed-task_id');
		task._setServer({
			post: async () => ({
				/** @type {TaskSchema.TaskProcessReturnTypeInfered} */
				data: {
					status: 'TaskSuccess',
					download_filename: 'loremipsumdolorsitamet.jpg',
					filesize: 98711,
					output_filesize: 123252,
					output_filenumber: 1,
					output_extensions: '["jpg"]',
					timer: '25.221'
				}
			})
		});
		task._setUploadedFiles([
			{
				server_filename: 'loremipsumdolorsitamet.jpg',
				filename: 'lorem.jpg'
			}
		]);
		task._setTool('removebackgroundimage');

		let options = /** @type {TaskSchema.TaskProcessGenericOptionsInfered} */ ({
			ignore_errors: false,
			output_filename: 'mylovelyimage',
			try_image_repair: false
		});

		const genericOptionsValidatorSpy = sinon.spy(
			TaskSchema.TaskProcessGenericOptions,
			'parseAsync'
		);

		const result = await task.process(options);

		expect(result).to.deep.equal({
			status: 'TaskSuccess',
			download_filename: 'loremipsumdolorsitamet.jpg',
			filesize: 98711,
			output_filesize: 123252,
			output_filenumber: 1,
			output_extensions: '["jpg"]',
			timer: '25.221'
		});
		expect(genericOptionsValidatorSpy.called).to.be.true;
		expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
		expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
			options
		);
		await expect(
			genericOptionsValidatorSpy.returnValues[0]
		).to.eventually.deep.equal(options);

		genericOptionsValidatorSpy.resetHistory();

		options = {
			ignore_errors: undefined,
			packaged_filename: 'user-xyz',
			try_image_repair: undefined
		};

		const result2 = await task.process(options);
		expect(result2).to.deep.equal({
			status: 'TaskSuccess',
			download_filename: 'loremipsumdolorsitamet.jpg',
			filesize: 98711,
			output_filesize: 123252,
			output_filenumber: 1,
			output_extensions: '["jpg"]',
			timer: '25.221'
		});
		expect(genericOptionsValidatorSpy.called).to.be.true;
		expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
		expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
			options
		);
		await expect(
			genericOptionsValidatorSpy.returnValues[0]
		).to.eventually.deep.equal({
			ignore_errors: true,
			packaged_filename: 'user-xyz',
			try_image_repair: true
		});

		genericOptionsValidatorSpy.resetHistory();

		options = {
			custom_int: 5
		};

		const result3 = await task.process(options);
		expect(result3).to.deep.equal({
			status: 'TaskSuccess',
			download_filename: 'loremipsumdolorsitamet.jpg',
			filesize: 98711,
			output_filesize: 123252,
			output_filenumber: 1,
			output_extensions: '["jpg"]',
			timer: '25.221'
		});
		expect(genericOptionsValidatorSpy.called).to.be.true;
		expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
		expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
			options
		);
		await expect(
			genericOptionsValidatorSpy.returnValues[0]
		).to.eventually.deep.equal({
			ignore_errors: true,
			custom_int: 5,
			try_image_repair: true
		});
	});

	it('should use correct generic options and convertimage tool options from parameters', async function () {
		// This test ensure validator function are called and used options and convertimage toolOptions are validated.
		const setup = {
			task_id: 'convertimage-taskid',
			tool: 'convertimage',
			files: [
				{
					server_filename: 'loremipsumdolorsitamet.jpg',
					filename: 'lorem.jpg'
				}
			],
			server: {
				post: async () => ({
					/** @type {TaskSchema.TaskProcessReturnTypeInfered} */
					data: {
						status: 'TaskSuccess',
						download_filename: 'loremipsumdolorsitamet.jpg',
						filesize: 98711,
						output_filesize: 123252,
						output_filenumber: 1,
						output_extensions: '["jpg"]',
						timer: '25.221'
					}
				})
			},
			processResult: {
				status: 'TaskSuccess',
				download_filename: 'loremipsumdolorsitamet.jpg',
				filesize: 98711,
				output_filesize: 123252,
				output_filenumber: 1,
				output_extensions: '["jpg"]',
				timer: '25.221'
			},
			/** @type {Array<TaskSchema.TaskProcessGenericOptionsInfered>} */
			options: [
				{
					ignore_errors: undefined,
					output_filename: 'mylovelyimage'
				},
				{
					packaged_filename: 'loremipsumdolor',
					try_image_repair: undefined
				},
				{
					ignore_errors: false,
					custom_string: 'lorem321',
					try_image_repair: false
				},
				{
					ignore_errors: true,
					custom_int: 55,
					try_image_repair: true
				},
				{
					ignore_errors: true,
					webhook: 'myawesomewebhook',
					try_image_repair: false
				},
				{
					ignore_errors: false,
					file_encryption_key: '1234567890asdfgh',
					try_image_repair: true
				}
			],
			/** @type {Array<TaskSchema.TaskProcessGenericOptionsInfered>} */
			expectedOptions: [
				{
					ignore_errors: true,
					output_filename: 'mylovelyimage',
					try_image_repair: true
				},
				{
					ignore_errors: true,
					packaged_filename: 'loremipsumdolor',
					try_image_repair: true
				},
				{
					ignore_errors: false,
					custom_string: 'lorem321',
					try_image_repair: false
				},
				{
					ignore_errors: true,
					custom_int: 55,
					try_image_repair: true
				},
				{
					ignore_errors: true,
					webhook: 'myawesomewebhook',
					try_image_repair: false
				},
				{
					ignore_errors: false,
					file_encryption_key: '1234567890asdfgh',
					try_image_repair: true
				}
			],
			/** @type {Array<TaskSchema.TaskProcessToolOptionsInfered>} */
			toolOptions: [
				{
					convertimage: {
						to: undefined
					},
					upscaleimage: {
						multiplier: 6
					}
				},
				{
					convertimage: {
						to: 'png',
						gif_time: 25,
						gif_loop: false
					},
					upscaleimage: null,
					removebackgroundimage: undefined
				},
				{
					convertimage: {
						to: 'gif',
						gif_time: 75,
						gif_loop: undefined
					},
					watermarkimage: {
						elements: undefined
					}
				},
				{
					convertimage: {
						to: 'gif_animation',
						gif_time: undefined,
						gif_loop: undefined
					},
					watermarkimage: {
						elements: []
					}
				},
				{
					convertimage: {
						to: 'heic'
					},
					upscaleimage: undefined,
					removebackgroundimage: null,
					watermarkimage: 5
				},
				{
					convertimage: {},
					upscaleimage: {},
					removebackgroundimage: {},
					watermarkimage: {}
				}
			],
			/** @type {Array<TaskSchema.TaskProcessToolOptionsInfered>} */
			expectedToolOptions: [
				{
					convertimage: {
						to: 'jpg',
						gif_time: 50,
						gif_loop: true
					}
				},
				{
					convertimage: {
						to: 'png',
						gif_time: 25,
						gif_loop: false
					}
				},
				{
					convertimage: {
						to: 'gif',
						gif_time: 75,
						gif_loop: true
					}
				},
				{
					convertimage: {
						to: 'gif_animation',
						gif_time: 50,
						gif_loop: true
					}
				},
				{
					convertimage: {
						to: 'heic',
						gif_time: 50,
						gif_loop: true
					}
				},
				{
					convertimage: {
						to: 'jpg',
						gif_time: 50,
						gif_loop: true
					}
				}
			]
		};

		// Use internal method to override private field
		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);
		task._setServer(setup.server);
		task._setUploadedFiles(setup.files);

		// Spy some methods
		const genericOptionsValidatorSpy = sinon.spy(
			TaskSchema.TaskProcessGenericOptions,
			'parseAsync'
		);
		const validateProcessToolOptionsSpy = sinon.spy(
			TaskUtils,
			'validateProcessToolOptions'
		);
		const serverFieldStub = sinon.spy(setup.server, 'post');

		// Run the test [0]
		const runTest0 = true;
		if (runTest0) {
			const result = await task.process(setup.options[0], setup.toolOptions[0]);

			expect(result).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[0]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[0]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[0]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[0].convertimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[0],
				...setup.expectedToolOptions[0].convertimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [1]
		const runTest1 = true;
		if (runTest1) {
			const result1 = await task.process(
				setup.options[1],
				setup.toolOptions[1]
			);

			expect(result1).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[1]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[1]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[1]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[1].convertimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[1],
				...setup.expectedToolOptions[1].convertimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [2]
		const runTest2 = true;
		if (runTest2) {
			const result2 = await task.process(
				setup.options[2],
				setup.toolOptions[2]
			);

			expect(result2).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[2]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[2]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[2]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[2].convertimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[2],
				...setup.expectedToolOptions[2].convertimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [3]
		const runTest3 = true;
		if (runTest3) {
			const result3 = await task.process(
				setup.options[3],
				setup.toolOptions[3]
			);

			expect(result3).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[3]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[3]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[3]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[3].convertimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[3],
				...setup.expectedToolOptions[3].convertimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [4]
		const runTest4 = true;
		if (runTest4) {
			const result4 = await task.process(
				setup.options[4],
				setup.toolOptions[4]
			);

			expect(result4).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[4]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[4]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[4]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[4].convertimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[4],
				...setup.expectedToolOptions[4].convertimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [5]
		const runTest5 = true;
		if (runTest5) {
			const result5 = await task.process(
				setup.options[5],
				setup.toolOptions[5]
			);

			expect(result5).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[5]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[5]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[5]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[5].convertimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[5],
				...setup.expectedToolOptions[5].convertimage
			});
		}
	});

	it('should use correct generic options and upscaleimage tool options from parameters', async function () {
		// This test ensure validator function are called and used options and upscaleimage toolOptions are validated.
		const setup = {
			task_id: 'upscaleimage-taskid',
			tool: 'upscaleimage',
			files: [
				{
					server_filename: 'loremipsumdolorsitamet.jpg',
					filename: 'lorem.jpg'
				}
			],
			server: {
				post: async () => ({
					/** @type {TaskSchema.TaskProcessReturnTypeInfered} */
					data: {
						status: 'TaskSuccess',
						download_filename: 'loremipsumdolorsitamet.jpg',
						filesize: 98711,
						output_filesize: 123252,
						output_filenumber: 1,
						output_extensions: '["jpg"]',
						timer: '25.221'
					}
				})
			},
			processResult: {
				status: 'TaskSuccess',
				download_filename: 'loremipsumdolorsitamet.jpg',
				filesize: 98711,
				output_filesize: 123252,
				output_filenumber: 1,
				output_extensions: '["jpg"]',
				timer: '25.221'
			},
			/** @type {Array<TaskSchema.TaskProcessGenericOptionsInfered>} */
			options: [
				{
					ignore_errors: undefined,
					output_filename: 'mylovelyimage'
				},
				{
					packaged_filename: 'loremipsumdolor',
					try_image_repair: undefined
				},
				{
					ignore_errors: false,
					custom_string: 'lorem321',
					try_image_repair: false
				},
				{
					ignore_errors: true,
					custom_int: 55,
					try_image_repair: true
				},
				{
					ignore_errors: true,
					webhook: 'myawesomewebhook',
					try_image_repair: false
				},
				{
					ignore_errors: false,
					file_encryption_key: '1234567890asdfgh',
					try_image_repair: true
				}
			],
			/** @type {Array<TaskSchema.TaskProcessGenericOptionsInfered>} */
			expectedOptions: [
				{
					ignore_errors: true,
					output_filename: 'mylovelyimage',
					try_image_repair: true
				},
				{
					ignore_errors: true,
					packaged_filename: 'loremipsumdolor',
					try_image_repair: true
				},
				{
					ignore_errors: false,
					custom_string: 'lorem321',
					try_image_repair: false
				},
				{
					ignore_errors: true,
					custom_int: 55,
					try_image_repair: true
				},
				{
					ignore_errors: true,
					webhook: 'myawesomewebhook',
					try_image_repair: false
				},
				{
					ignore_errors: false,
					file_encryption_key: '1234567890asdfgh',
					try_image_repair: true
				}
			],
			/** @type {Array<TaskSchema.TaskProcessToolOptionsInfered>} */
			toolOptions: [
				{
					convertimage: null,
					watermarkimage: null,
					removebackgroundimage: null,
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					convertimage: {},
					watermarkimage: {},
					removebackgroundimage: {},
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					convertimage: undefined,
					watermarkimage: undefined,
					removebackgroundimage: undefined,
					upscaleimage: {
						multiplier: 2
					}
				},
				{
					convertimage: 9,
					watermarkimage: 2,
					removebackgroundimage: 1,
					upscaleimage: {
						multiplier: 2
					}
				},
				{
					convertimage: { to: 'gif', gif_loop: false },
					watermarkimage: { elements: null },
					removebackgroundimage: { notexist: true },
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					convertimage: {
						to: 'mp3'
					},
					watermarkimage: {
						elements: {}
					},
					removebackgroundimage: {
						abc: undefined
					},
					upscaleimage: {
						multiplier: 2
					}
				}
			],
			/** @type {Array<TaskSchema.TaskProcessToolOptionsInfered>} */
			expectedToolOptions: [
				{
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					upscaleimage: {
						multiplier: 2
					}
				},
				{
					upscaleimage: {
						multiplier: 2
					}
				},
				{
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					upscaleimage: {
						multiplier: 2
					}
				}
			]
		};

		// Use internal method to override private field
		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);
		task._setServer(setup.server);
		task._setUploadedFiles(setup.files);

		// Spy some methods
		const genericOptionsValidatorSpy = sinon.spy(
			TaskSchema.TaskProcessGenericOptions,
			'parseAsync'
		);
		const validateProcessToolOptionsSpy = sinon.spy(
			TaskUtils,
			'validateProcessToolOptions'
		);
		const serverFieldStub = sinon.spy(setup.server, 'post');

		// Run the test [0]
		const runTest0 = true;
		if (runTest0) {
			const result = await task.process(setup.options[0], setup.toolOptions[0]);

			expect(result).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[0]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[0]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[0]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[0].upscaleimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[0],
				...setup.expectedToolOptions[0].upscaleimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [1]
		const runTest1 = true;
		if (runTest1) {
			const result1 = await task.process(
				setup.options[1],
				setup.toolOptions[1]
			);

			expect(result1).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[1]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[1]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[1]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[1].upscaleimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[1],
				...setup.expectedToolOptions[1].upscaleimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [2]
		const runTest2 = true;
		if (runTest2) {
			const result2 = await task.process(
				setup.options[2],
				setup.toolOptions[2]
			);

			expect(result2).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[2]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[2]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[2]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[2].upscaleimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[2],
				...setup.expectedToolOptions[2].upscaleimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [3]
		const runTest3 = true;
		if (runTest3) {
			const result3 = await task.process(
				setup.options[3],
				setup.toolOptions[3]
			);

			expect(result3).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[3]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[3]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[3]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[3].upscaleimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[3],
				...setup.expectedToolOptions[3].upscaleimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [4]
		const runTest4 = true;
		if (runTest4) {
			const result4 = await task.process(
				setup.options[4],
				setup.toolOptions[4]
			);

			expect(result4).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[4]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[4]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[4]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[4].upscaleimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[4],
				...setup.expectedToolOptions[4].upscaleimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [5]
		const runTest5 = true;
		if (runTest5) {
			const result5 = await task.process(
				setup.options[5],
				setup.toolOptions[5]
			);

			expect(result5).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[5]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[5]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[5]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[5].upscaleimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[5],
				...setup.expectedToolOptions[5].upscaleimage
			});
		}
	});

	it('should use correct generic options and watermarkimage tool options from parameters', async function () {
		// This test ensure validator function are called and used options and upscaleimage toolOptions are validated.
		const setup = {
			task_id: 'watermarkimage-taskid',
			tool: 'watermarkimage',
			files: [
				{
					server_filename: 'loremipsumdolorsitamet.jpg',
					filename: 'lorem.jpg'
				}
			],
			server: {
				post: async () => ({
					/** @type {TaskSchema.TaskProcessReturnTypeInfered} */
					data: {
						status: 'TaskSuccess',
						download_filename: 'loremipsumdolorsitamet.jpg',
						filesize: 98711,
						output_filesize: 123252,
						output_filenumber: 1,
						output_extensions: '["jpg"]',
						timer: '25.221'
					}
				})
			},
			processResult: {
				status: 'TaskSuccess',
				download_filename: 'loremipsumdolorsitamet.jpg',
				filesize: 98711,
				output_filesize: 123252,
				output_filenumber: 1,
				output_extensions: '["jpg"]',
				timer: '25.221'
			},
			/** @type {Array<TaskSchema.TaskProcessGenericOptionsInfered>} */
			options: [
				{
					ignore_errors: undefined,
					output_filename: 'mylovelyimage'
				},
				{
					packaged_filename: 'loremipsumdolor',
					try_image_repair: undefined
				},
				{
					ignore_errors: false,
					custom_string: 'lorem321',
					try_image_repair: false
				},
				{
					ignore_errors: true,
					custom_int: 55,
					try_image_repair: true
				},
				{
					ignore_errors: true,
					webhook: 'myawesomewebhook',
					try_image_repair: false
				},
				{
					ignore_errors: false,
					file_encryption_key: '1234567890asdfgh',
					try_image_repair: true
				}
			],
			/** @type {Array<TaskSchema.TaskProcessGenericOptionsInfered>} */
			expectedOptions: [
				{
					ignore_errors: true,
					output_filename: 'mylovelyimage',
					try_image_repair: true
				},
				{
					ignore_errors: true,
					packaged_filename: 'loremipsumdolor',
					try_image_repair: true
				},
				{
					ignore_errors: false,
					custom_string: 'lorem321',
					try_image_repair: false
				},
				{
					ignore_errors: true,
					custom_int: 55,
					try_image_repair: true
				},
				{
					ignore_errors: true,
					webhook: 'myawesomewebhook',
					try_image_repair: false
				},
				{
					ignore_errors: false,
					file_encryption_key: '1234567890asdfgh',
					try_image_repair: true
				}
			],
			/** @type {Array<TaskSchema.TaskProcessToolOptionsInfered>} */
			toolOptions: [
				{
					convertimage: null,
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'branded',
								gravity: 'South'
							}
						]
					},
					removebackgroundimage: null,
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					convertimage: {},
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'brandedxyz',
								gravity: 'South',
								vertical_adjustment_percent: 25,
								horizontal_adjustment_percent: 33,
								rotation: 15,
								font_family: 'Courier',
								transparency: 50,
								mosaic: true
							}
						]
					},
					removebackgroundimage: {},
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					convertimage: undefined,
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'brandedxyz',
								gravity: undefined,
								vertical_adjustment_percent: undefined,
								horizontal_adjustment_percent: undefined,
								rotation: undefined,
								font_family: undefined,
								font_style: undefined,
								font_size: undefined,
								font_color: undefined,
								transparency: undefined,
								mosaic: undefined
							}
						]
					},
					removebackgroundimage: undefined,
					upscaleimage: {
						multiplier: 2
					}
				},
				{
					convertimage: 9,
					watermarkimage: {
						elements: [
							{
								type: 'image',
								text: 'xyz',
								image: 'lovelyimage.jpg',
								gravity: 'Center',
								vertical_adjustment_percent: undefined,
								horizontal_adjustment_percent: undefined,
								font_family: 'Times New Roman',
								font_style: 'Italic',
								font_size: 25,
								font_color: '#ffffff'
							}
						]
					},
					removebackgroundimage: 1,
					upscaleimage: {
						multiplier: 2
					}
				},
				{
					convertimage: { to: 'gif', gif_loop: false },
					watermarkimage: {
						elements: [
							{
								type: 'image',
								image: 'xzlovelyimage.jpg'
							}
						]
					},
					removebackgroundimage: { notexist: true },
					upscaleimage: {
						multiplier: 4
					}
				},
				{
					convertimage: {
						to: 'mp3'
					},
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'loremipsum',
								gravity: 'Center',
								vertical_adjustment_percent: undefined,
								horizontal_adjustment_percent: undefined,
								font_family: 'Arial',
								font_style: null,
								font_size: undefined,
								mosaic: undefined
							}
						]
					},
					removebackgroundimage: {
						abc: undefined
					},
					upscaleimage: {
						multiplier: 2
					}
				}
			],
			/** @type {Array<TaskSchema.TaskProcessToolOptionsInfered>} */
			expectedToolOptions: [
				{
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'branded',
								gravity: 'South',
								vertical_adjustment_percent: 0,
								horizontal_adjustment_percent: 0,
								rotation: 0,
								font_family: 'Arial',
								font_style: null,
								font_size: 14,
								font_color: '#000000',
								transparency: 100,
								mosaic: false
							}
						]
					}
				},
				{
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'brandedxyz',
								gravity: 'South',
								vertical_adjustment_percent: 25,
								horizontal_adjustment_percent: 33,
								rotation: 15,
								font_family: 'Courier',
								font_style: null,
								font_size: 14,
								font_color: '#000000',
								transparency: 50,
								mosaic: true
							}
						]
					}
				},
				{
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'brandedxyz',
								gravity: 'Center',
								vertical_adjustment_percent: 0,
								horizontal_adjustment_percent: 0,
								rotation: 0,
								font_family: 'Arial',
								font_style: null,
								font_size: 14,
								font_color: '#000000',
								transparency: 100,
								mosaic: false
							}
						]
					}
				},
				{
					watermarkimage: {
						elements: [
							{
								type: 'image',
								text: 'xyz',
								image: 'lovelyimage.jpg',
								gravity: 'Center',
								vertical_adjustment_percent: 0,
								horizontal_adjustment_percent: 0,
								rotation: 0,
								font_family: 'Times New Roman',
								font_style: 'Italic',
								font_size: 25,
								font_color: '#ffffff',
								transparency: 100,
								mosaic: false
							}
						]
					}
				},
				{
					watermarkimage: {
						elements: [
							{
								type: 'image',
								image: 'xzlovelyimage.jpg',
								gravity: 'Center',
								vertical_adjustment_percent: 0,
								horizontal_adjustment_percent: 0,
								rotation: 0,
								font_family: 'Arial',
								font_style: null,
								font_size: 14,
								font_color: '#000000',
								transparency: 100,
								mosaic: false
							}
						]
					}
				},
				{
					watermarkimage: {
						elements: [
							{
								type: 'text',
								text: 'loremipsum',
								gravity: 'Center',
								vertical_adjustment_percent: 0,
								horizontal_adjustment_percent: 0,
								rotation: 0,
								font_family: 'Arial',
								font_style: null,
								font_size: 14,
								font_color: '#000000',
								transparency: 100,
								mosaic: false
							}
						]
					}
				}
			]
		};

		// Use internal method to override private field
		task._setTool(setup.tool);
		task._setTaskId(setup.task_id);
		task._setServer(setup.server);
		task._setUploadedFiles(setup.files);

		// Spy some methods
		const genericOptionsValidatorSpy = sinon.spy(
			TaskSchema.TaskProcessGenericOptions,
			'parseAsync'
		);
		const validateProcessToolOptionsSpy = sinon.spy(
			TaskUtils,
			'validateProcessToolOptions'
		);
		const serverFieldStub = sinon.spy(setup.server, 'post');

		// Run the test [0]
		const runTest0 = true;
		if (runTest0) {
			const result = await task.process(setup.options[0], setup.toolOptions[0]);

			expect(result).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[0]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[0]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[0]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[0].watermarkimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[0],
				...setup.expectedToolOptions[0].watermarkimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [1]
		const runTest1 = true;
		if (runTest1) {
			const result1 = await task.process(
				setup.options[1],
				setup.toolOptions[1]
			);

			expect(result1).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[1]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[1]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[1]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[1].watermarkimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[1],
				...setup.expectedToolOptions[1].watermarkimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [2]
		const runTest2 = true;
		if (runTest2) {
			const result2 = await task.process(
				setup.options[2],
				setup.toolOptions[2]
			);

			expect(result2).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[2]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[2]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[2]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[2].watermarkimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[2],
				...setup.expectedToolOptions[2].watermarkimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [3]
		const runTest3 = true;
		if (runTest3) {
			const result3 = await task.process(
				setup.options[3],
				setup.toolOptions[3]
			);

			expect(result3).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[3]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[3]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[3]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[3].watermarkimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[3],
				...setup.expectedToolOptions[3].watermarkimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [4]
		const runTest4 = true;
		if (runTest4) {
			const result4 = await task.process(
				setup.options[4],
				setup.toolOptions[4]
			);

			expect(result4).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[4]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[4]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[4]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[4].watermarkimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[4],
				...setup.expectedToolOptions[4].watermarkimage
			});

			genericOptionsValidatorSpy.resetHistory();
			validateProcessToolOptionsSpy.resetHistory();
			serverFieldStub.resetHistory();
		}

		// Run the test [5]
		const runTest5 = true;
		if (runTest5) {
			const result5 = await task.process(
				setup.options[5],
				setup.toolOptions[5]
			);

			expect(result5).to.deep.equal(setup.processResult);
			expect(genericOptionsValidatorSpy.calledOnce).to.be.true;
			expect(genericOptionsValidatorSpy.firstCall.args[0]).to.be.deep.equal(
				setup.options[5]
			);
			await expect(
				genericOptionsValidatorSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedOptions[5]);
			expect(validateProcessToolOptionsSpy.calledOnce).to.be.true;
			expect(validateProcessToolOptionsSpy.firstCall.args[0]).to.be.equal(
				setup.tool
			);
			expect(validateProcessToolOptionsSpy.firstCall.args[1]).to.be.deep.equal(
				setup.toolOptions[5]
			);
			await expect(
				validateProcessToolOptionsSpy.returnValues[0]
			).to.eventually.deep.equal(setup.expectedToolOptions[5].watermarkimage);
			expect(serverFieldStub.calledOnce).to.be.true;
			expect(serverFieldStub.firstCall.args[0]).to.be.equal('/process');
			expect(serverFieldStub.firstCall.args[1]).to.be.deep.equal({
				task: setup.task_id,
				tool: setup.tool,
				files: setup.files,
				...setup.expectedOptions[5],
				...setup.expectedToolOptions[5].watermarkimage
			});
		}
	});

	it('should catch generic Error then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'removebackgroundimage-taskid',
			tool: 'removebackgroundimage',
			files: [
				{
					server_filename: 'loremipsumdolorsitamet.jpg',
					filename: 'lorem.jpg'
				}
			],
			server: {
				post: async () => {
					throw new Error('Simulating generic error');
				}
			}
		};

		task._setTaskId(setup.task_id);
		task._setTool(setup.tool);
		task._setUploadedFiles(setup.files);
		task._setServer(setup.server);

		await expect(task.process()).to.be.rejectedWith(
			Error,
			'Simulating generic error'
		);
	});

	it('should catch NetworkError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'removebackgroundimage-taskid',
			tool: 'removebackgroundimage',
			files: [
				{
					server_filename: 'loremipsumdolorsitamet.jpg',
					filename: 'lorem.jpg'
				}
			],
			server: [
				{
					post: async () => {
						throw {
							isAxiosError: true,
							request: {}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true
						};
					}
				}
			]
		};

		task._setTaskId(setup.task_id);
		task._setTool(setup.tool);
		task._setUploadedFiles(setup.files);

		// Request is made but no response received.
		task._setServer(setup.server[0]);
		await expect(task.process()).to.be.rejectedWith(
			NetworkError,
			'No response received from the server.'
		);

		// Request setup fails.
		task._setServer(setup.server[1]);
		await expect(task.process()).to.be.rejectedWith(
			NetworkError,
			'An error occurred while setting up the request.'
		);
	});

	it('should catch ILoveApiError then rethrown error with classifyError()', async function () {
		const setup = {
			task_id: 'removebackgroundimage-taskid',
			tool: 'removebackgroundimage',
			files: [
				{
					server_filename: 'loremipsumdolorsitamet.jpg',
					filename: 'lorem.jpg'
				}
			],
			server: [
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 401,
								data: { message: 'Unauthorized', code: 666 }
							}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 500,
								data: {
									error: { message: 'Internal Server Error', code: '' }
								}
							}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 400,
								data: { unknownField: 'no error message' }
							}
						};
					}
				},
				{
					post: async () => {
						throw {
							isAxiosError: true,
							response: {
								status: 422,
								data: null
							}
						};
					}
				}
			]
		};

		task._setTaskId(setup.task_id);
		task._setTool(setup.tool);
		task._setUploadedFiles(setup.files);

		// Use message from response.data.message
		task._setServer(setup.server[0]);
		await expect(task.process()).to.be.rejectedWith(
			ILoveApiError,
			'Unauthorized (Status: 401, Code: 666)'
		);

		// Use message from response.data.error.message
		task._setServer(setup.server[1]);
		await expect(task.process()).to.be.rejectedWith(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);

		// No message is available
		task._setServer(setup.server[2]);
		await expect(task.process()).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 400, Code: -1)'
		);

		// No response payload
		task._setServer(setup.server[3]);
		await expect(task.process()).to.be.rejectedWith(
			ILoveApiError,
			'Unknown API error occurred. (Status: 422, Code: -1)'
		);
	});
});
