import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ILoveIMGApi from '../../../src/lib/iloveimg/ILoveIMGApi.js';
import { ZodError } from 'zod';

use(chaiAsPromised);

describe('ILoveIMGApi Tests', function () {
	it('should throw Error when publicKey not an string or not provided', function () {
		expect(() => new ILoveIMGApi(null, undefined)).to.throw(
			Error,
			'publicKey is required and must be a string.'
		);
		expect(() => new ILoveIMGApi(undefined, null)).to.throw(
			Error,
			'publicKey is required and must be a string.'
		);
		expect(() => new ILoveIMGApi({}, 'secretKey')).to.throw(
			Error,
			'publicKey is required and must be a string.'
		);
		expect(() => new ILoveIMGApi(true, 'secretKey')).to.throw(
			Error,
			'publicKey is required and must be a string.'
		);
		expect(() => new ILoveIMGApi(99, 'secretKey')).to.throw(
			Error,
			'publicKey is required and must be a string.'
		);
		expect(() => new ILoveIMGApi('', 'secretKey')).to.throw(
			Error,
			'publicKey is required and must be a string.'
		);
	});

	it('should throw Error when secretKey provided but not an string', function () {
		expect(() => new ILoveIMGApi('publicKey', [])).to.throw(
			Error,
			'secretKey must be a string.'
		);
		expect(() => new ILoveIMGApi('publicKey', {})).to.throw(
			Error,
			'secretKey must be a string.'
		);
		expect(() => new ILoveIMGApi('publicKey', true)).to.throw(
			Error,
			'secretKey must be a string.'
		);
		expect(() => new ILoveIMGApi('publicKey', 21)).to.throw(
			Error,
			'secretKey must be a string.'
		);
	});
});

describe('ILoveIMGApi.newTask() Tests', function () {
	it('should throw Error when using invalid tool', function () {
		const iloveimg = new ILoveIMGApi('publicKey', 'secretKey');

		expect(() => iloveimg.newTask()).to.throw(ZodError);
		expect(() => iloveimg.newTask(null)).to.throw(ZodError);
		expect(() => iloveimg.newTask(undefined)).to.throw(ZodError);
		expect(() => iloveimg.newTask('lorem')).to.throw(ZodError);
		expect(() => iloveimg.newTask(false)).to.throw(ZodError);
		expect(() => iloveimg.newTask({})).to.throw(ZodError);
		expect(() => iloveimg.newTask(666)).to.throw(ZodError);
	});
});

describe('ILoveIMGApi.listTasks() Tests', function () {
	let iloveimg = /** @type {ILoveIMGApi} */ (undefined);

	beforeEach(function () {
		iloveimg = new ILoveIMGApi('publicKey', 'secretKey');
	});

	it('should throw Error when secretKey not provided', async function () {
		iloveimg = new ILoveIMGApi('publicKey');

		await expect(iloveimg.listTasks()).to.be.rejectedWith(
			Error,
			'Secret key required for list tasks.'
		);
	});

	it('should throw ZodError when some attribute of options param are invalid', async function () {
		// Expect ZodError when type of options itself invalid.
		await expect(iloveimg.listTasks(null)).to.be.rejectedWith(ZodError);
		await expect(iloveimg.listTasks(1)).to.be.rejectedWith(ZodError);
		await expect(iloveimg.listTasks('lorem')).to.be.rejectedWith(ZodError);
		await expect(iloveimg.listTasks(false)).to.be.rejectedWith(ZodError);

		// Expect ZodError when some attribute of options are invalid.
		await expect(iloveimg.listTasks({ debug: null })).to.be.rejectedWith(
			ZodError
		);
		await expect(iloveimg.listTasks({ debug: 1 })).to.be.rejectedWith(ZodError);
		await expect(iloveimg.listTasks({ debug: 'xyz' })).to.be.rejectedWith(
			ZodError
		);
		await expect(iloveimg.listTasks({ debug: {} })).to.be.rejectedWith(
			ZodError
		);
	});
});
