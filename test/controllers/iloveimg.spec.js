import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as ILoveIMGService from '../../src/services/iloveimg.js';
import * as ILoveIMGController from '../../src/controllers/iloveimg.js';
import * as ILoveApiUtils from '../../src/utils/iloveapi.js';

use(chaiAsPromised);

describe('[Integration] ILoveIMG Controllers', () => {
	describe('removeBackgroundImage()', () => {
		let spyServiceStub;
		const mockServiceValue = {
			server: 'api8g.iloveimg.com',
			task_id: 'some_task_id_from_iloveimg_servers',
			files: [
				{
					server_filename: 'loremipsumdolor.pdf',
					filename: 'lorem.pdf'
				}
			]
		};

		before(() => {
			spyServiceStub = sinon
				.stub(ILoveIMGService.default, 'removeBackgroundImage')
				.resolves(mockServiceValue);
		});

		after(() => {
			sinon.restore();
		});

		it('should resolves the mocked value from the service', async () => {
			const result = await ILoveIMGService.default.removeBackgroundImage();
			expect(result).to.be.deep.equal(mockServiceValue);
		});

		it('should rejects with an Error when required parameters missing', async () => {
			await expect(
				ILoveIMGController.removeBackgroundImage(
					null,
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILoveIMGController.removeBackgroundImage(
					'some_sha1_job_id',
					null,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILoveIMGController.removeBackgroundImage(
					'some_sha1_job_id',
					185150,
					null
				)
			).to.be.rejectedWith('Missing required parameters.');
		});

		it('should rejects with an Error when getOriginalFileInformationFromURL return null', async () => {
			const utilStub = sinon
				.stub(ILoveApiUtils.default, 'getOriginalFileInformationFromURL')
				.returns(null);

			await expect(
				ILoveIMGController.removeBackgroundImage(
					'some_sha1_job_id',
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Failed to resolve original file details.');

			utilStub.restore();
		});

		it('should call service with correct parameters and return mocked value', async () => {
			spyServiceStub.resetHistory();

			const result = await ILoveIMGController.removeBackgroundImage(
				'some_sha1_job_id',
				185150,
				'https://api.telegram.org/others/lorem.pdf'
			);

			expect(
				spyServiceStub.calledOnceWith(
					'some_sha1_job_id',
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.true;
			expect(result).to.be.deep.equal(mockServiceValue);
		});
	});

	describe('upscaleImage()', () => {
		let spyServiceStub;
		const mockServiceValue = {
			server: 'api8g.iloveimg.com',
			task_id: 'some_task_id_from_iloveimg_servers',
			files: [
				{
					server_filename: 'loremipsumdolor.pdf',
					filename: 'lorem.pdf'
				}
			]
		};

		before(() => {
			spyServiceStub = sinon
				.stub(ILoveIMGService.default, 'upscaleImage')
				.resolves(mockServiceValue);
		});

		after(() => {
			sinon.restore();
		});

		it('should resolves the mocked value from the service', async () => {
			const result = await ILoveIMGService.default.upscaleImage();
			expect(result).to.be.deep.equal(mockServiceValue);
		});

		it('should rejects with an Error when required parameters missing', async () => {
			await expect(
				ILoveIMGController.upscaleImage(
					null,
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILoveIMGController.upscaleImage(
					'some_sha1_job_id',
					null,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILoveIMGController.upscaleImage('some_sha1_job_id', 185150, null)
			).to.be.rejectedWith('Missing required parameters.');
		});

		it('should rejects with an Error when getOriginalFileInformationFromURL return null', async () => {
			const utilStub = sinon
				.stub(ILoveApiUtils.default, 'getOriginalFileInformationFromURL')
				.returns(null);

			await expect(
				ILoveIMGController.upscaleImage(
					'some_sha1_job_id',
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Failed to resolve original file details.');

			utilStub.restore();
		});

		it('should call service with correct parameters and return mocked value', async () => {
			spyServiceStub.resetHistory();

			const result = await ILoveIMGController.upscaleImage(
				'some_sha1_job_id',
				185150,
				'https://api.telegram.org/others/lorem.pdf'
			);

			expect(
				spyServiceStub.calledOnceWith(
					'some_sha1_job_id',
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.true;
			expect(result).to.be.deep.equal(mockServiceValue);
		});
	});
});
