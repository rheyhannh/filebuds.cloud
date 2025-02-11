import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import Task from '../../../src/lib/iloveimg/Task.js';
import { ZodError } from 'zod';
import * as TaskSchema from '../../../src/lib/iloveimg/schema/Task.js';
import * as _TaskUtils from '../../../src/lib/iloveimg/util/task.util.js';
import config from '../../../src/config/env.js';

use(chaiAsPromised);

// We need to import with this behaviour to make sinon working in testing environment
const TaskUtils = _TaskUtils.default;
const { ILOVEIMG_API_URL_PROTOCOL, ILOVEIMG_API_VERSION } = config;

/**
 * A custom error class to simulate Axios errors with a response object.
 * This is useful for testing error handling in cases where Axios requests fail.
 */
class SimulateAxiosError extends Error {
	/**
	 * Creates an instance of SimulateAxiosError.
	 * @param {string} message - The error message.
	 * @param {{ data?: any, status?: number, statusText?: string, headers?: object }} response - The mock response object.
	 */
	constructor(message, response = {}) {
		super(message);
		this.name = 'SimulateAxiosError';
		this.response = response;
	}
}

describe('ILoveIMGApi Task getTool() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
	});

	it('should return undefined when no tool is set', function () {
		expect(task.getTool()).to.be.undefined;
	});

	it('should return correct tool type', function () {
		task = new Task('lorem', 'ipsum', 'removebackgroundimage');
		expect(task.getTool()).to.equal('removebackgroundimage');
	});
});

describe('ILoveIMGApi Task getTaskId() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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

describe('ILoveIMGApi Task getRemainingFiles() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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

describe('ILoveIMGApi Task getUploadedFiles() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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

describe('ILoveIMGApi Task getServer() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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

describe('ILoveIMGApi Task start() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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

		const taskInstance = new Task({ getToken: async () => 'faketoken' }, setup);
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

		const taskInstance = new Task({ getToken: async () => 'faketoken' }, setup);
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

	it('should catch API response error then rethrown error with extracted messages', async function () {
		// #todo
	});

	it('should catch axios error then rethrown error', async function () {
		// #todo
	});

	it('should catch unexpected error then rethrown error with specific message', async function () {
		// #todo
	});
});

describe('ILoveIMGApi Task addFile() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should throw Error when task id or server are not exist', async function () {
		// This test ensure start() are initiated first before upload file using addFile()
		await expect(
			task.addFile({ imageUrl: 'https://i.imgur.com/tPRdaa3.jpeg' })
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
				imageUrl: {},
				debug: 666
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.addFile({
				imageUrl: 'https://i.imgur.com/tPRdaa3.jpeg',
				debug: {}
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.addFile({
				imageUrl: false,
				debug: true
			})
		).to.be.rejectedWith(ZodError);

		await expect(
			task.addFile({
				imageUrl: null,
				debug: null
			})
		).to.be.rejectedWith(ZodError);
	});
});

describe('ILoveIMGApi Task deleteFile() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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
});

describe('ILoveIMGApi Task download() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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
});

describe('ILoveIMGApi Task details() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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
});

describe('ILoveIMGApi Task delete() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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
});

describe('ILoveIMGApi Task process() Tests', function () {
	let task = /** @type {Task} */ (undefined);

	beforeEach(function () {
		task = new Task();
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

	it('should catch API response error then rethrown error with extracted messages', async function () {
		// This test ensure error from ILoveApi should be catched and re-throw with formated message
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
						throw new SimulateAxiosError('Simulating API response error', {
							data: {
								message: 'Lorem ipsum',
								code: 400,
								status: 'Bad Request'
							},
							status: 400,
							statusText: 'Bad Request'
						});
					}
				},
				{
					post: async () => {
						throw new SimulateAxiosError('Simulating API response error', {
							data: {
								message: 'Lorem ipsum',
								code: 400
							},
							status: 400,
							statusText: 'Bad Request'
						});
					}
				},
				{
					post: async () => {
						throw new SimulateAxiosError('Simulating API response error', {
							data: {
								message: 'Lorem ipsum',
								status: 'Bad Request'
							},
							status: 400,
							statusText: 'Bad Request'
						});
					}
				},
				{
					post: async () => {
						throw new SimulateAxiosError('Simulating API response error', {
							data: {
								error: {
									message: 'Lorem ipsum',
									code: 400
								}
							},
							status: 400,
							statusText: 'Bad Request'
						});
					}
				},
				{
					post: async () => {
						throw new SimulateAxiosError('Simulating API response error', {
							data: {
								error: {
									message: 'Lorem ipsum'
								}
							},
							status: 400,
							statusText: 'Bad Request'
						});
					}
				},
				{
					post: async () => {
						throw new SimulateAxiosError('Simulating API response error', {
							data: {},
							status: 400,
							statusText: 'Bad Request'
						});
					}
				}
			]
		};

		const getErrorMessageFromResponseSpy = sinon.spy(
			TaskUtils,
			'getErrorMessageFromResponse'
		);

		task._setTaskId(setup.task_id);
		task._setTool(setup.tool);
		task._setUploadedFiles(setup.files);

		// Case where response.data.message and response.data.message are string
		// Code & status exist
		task._setServer(setup.server[0]);

		await expect(task.process()).to.be.rejectedWith(
			'ILoveApi Error (status:Bad Request, code:400): Lorem ipsum'
		);
		expect(getErrorMessageFromResponseSpy.calledOnce).to.be.true;

		getErrorMessageFromResponseSpy.resetHistory();

		// Code exist
		task._setServer(setup.server[1]);

		await expect(task.process()).to.be.rejectedWith(
			'ILoveApi Error (status:-1, code:400): Lorem ipsum'
		);
		expect(getErrorMessageFromResponseSpy.calledOnce).to.be.true;

		getErrorMessageFromResponseSpy.resetHistory();

		// Status exist
		task._setServer(setup.server[2]);

		await expect(task.process()).to.be.rejectedWith(
			'ILoveApi Error (status:Bad Request, code:-1): Lorem ipsum'
		);
		expect(getErrorMessageFromResponseSpy.calledOnce).to.be.true;

		getErrorMessageFromResponseSpy.resetHistory();

		// Case where response.data.message and response.data.message are string
		// Code exist
		task._setServer(setup.server[3]);

		await expect(task.process()).to.be.rejectedWith(
			'ILoveApi Error (code:400): Lorem ipsum'
		);
		expect(getErrorMessageFromResponseSpy.calledOnce).to.be.true;

		getErrorMessageFromResponseSpy.resetHistory();

		// Code not exist
		task._setServer(setup.server[4]);

		await expect(task.process()).to.be.rejectedWith(
			'ILoveApi Error (code:-1): Lorem ipsum'
		);
		expect(getErrorMessageFromResponseSpy.calledOnce).to.be.true;

		getErrorMessageFromResponseSpy.resetHistory();

		// Unexpected error
		task._setServer(setup.server[5]);

		await expect(task.process()).to.be.rejectedWith(
			'ILoveApi Unexpected Error: Cant retrieve any information error from ILoveApi server.'
		);
		expect(getErrorMessageFromResponseSpy.calledOnce).to.be.true;
	});

	it('should catch axios error then rethrown error', async function () {
		// This test ensure error from axios should be catched and re-throw
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
					throw new Error('Simulating Axios Error');
				}
			}
		};

		task._setTaskId(setup.task_id);
		task._setTool(setup.tool);
		task._setUploadedFiles(setup.files);
		task._setServer(setup.server);

		await expect(task.process()).to.be.rejectedWith('Simulating Axios Error');
	});

	it('should catch unexpected error then rethrown error with specific message', async function () {
		// This test ensure unexpected error should be catched and re-throw with specific message
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
					throw new Error();
				}
			}
		};

		task._setTaskId(setup.task_id);
		task._setTool(setup.tool);
		task._setUploadedFiles(setup.files);
		task._setServer(setup.server);

		await expect(task.process()).to.be.rejectedWith(
			'An unexpected error occurred.'
		);
	});
});
