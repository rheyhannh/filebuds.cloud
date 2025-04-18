import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as ILovePDFService from '../../src/services/ilovepdf.js';
import * as ILovePDFController from '../../src/controllers/ilovepdf.js';
import * as ILoveApiUtils from '../../src/utils/iloveapi.js';

use(chaiAsPromised);

describe('[Integration] ILovePDF Controllers', () => {
	describe('imageToPdf()', () => {
		let spyServiceStub;
		const mockServiceValue = {
			server: null,
			task_id: 'some_task_id_from_iloveapi_servers',
			files: [
				{
					server_filename: 'loremipsumdolor.pdf',
					filename: 'lorem.pdf'
				}
			]
		};

		before(() => {
			spyServiceStub = sinon
				.stub(ILovePDFService.default, 'imageToPdf')
				.resolves(mockServiceValue);
		});

		after(() => {
			sinon.restore();
		});

		it('should resolves the mocked value from the service', async () => {
			const result = await ILovePDFService.default.imageToPdf();
			expect(result).to.be.deep.equal(mockServiceValue);
		});

		it('should rejects with an Error when required parameters missing', async () => {
			await expect(
				ILovePDFController.imageToPdf(
					null,
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.imageToPdf(
					'some_sha1_job_id',
					null,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.imageToPdf('some_sha1_job_id', 185150, null)
			).to.be.rejectedWith('Missing required parameters.');
		});

		it('should rejects with an Error when getOriginalFileInformationFromURL return null', async () => {
			const utilStub = sinon
				.stub(ILoveApiUtils.default, 'getOriginalFileInformationFromURL')
				.returns(null);

			await expect(
				ILovePDFController.imageToPdf(
					'some_sha1_job_id',
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Failed to resolve original file details.');

			utilStub.restore();
		});

		it('should call service with correct parameters and return mocked value', async () => {
			spyServiceStub.resetHistory();

			const result = await ILovePDFController.imageToPdf(
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
