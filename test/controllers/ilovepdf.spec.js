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

	describe('mergePdf()', () => {
		let spyServiceStub;
		const mockServiceValue = {
			server: null,
			task_id: 'some_task_id_from_iloveapi_servers',
			files: [
				{
					server_filename: 'lorems.pdf',
					filename: 'lorem.pdf'
				},
				{
					server_filename: 'ipsums.pdf',
					filename: 'ipsum.pdf'
				},
				{
					server_filename: 'dolors.pdf',
					filename: 'dolor.pdf'
				}
			]
		};

		before(() => {
			spyServiceStub = sinon
				.stub(ILovePDFService.default, 'mergePdf')
				.resolves(mockServiceValue);
		});

		after(() => {
			sinon.restore();
		});

		it('should resolves the mocked value from the service', async () => {
			const result = await ILovePDFService.default.mergePdf();
			expect(result).to.be.deep.equal(mockServiceValue);
		});

		it('should rejects with an Error when required parameters missing', async () => {
			await expect(
				ILovePDFController.mergePdf(null, 185150, [
					'https://api.telegram.org/others/lorem.pdf',
					'https://api.telegram.org/others/sit.pdf'
				])
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', null, [
					'https://api.telegram.org/others/lorem.pdf',
					'https://api.telegram.org/others/sit.pdf'
				])
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, null)
			).to.be.rejectedWith('Missing required parameters.');
		});

		it('should rejects with an Error when filesUrl are not an Array or length are less than 2', async () => {
			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, undefined)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, true)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, false)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, {})
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, 999)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, 'lorems')
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, [])
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.mergePdf('some_sha1_job_id', 185150, [
					'https://api.telegram.org/others/lorem.pdf'
				])
			).to.be.rejectedWith('Missing required parameters.');
		});

		it('should rejects with an Error when getOriginalFileInformationFromURL return null', async () => {
			const params = [
				'some_sha1_job_id',
				185150,
				[
					'https://api.telegram.org/others/lorem.pdf',
					'https://api.telegram.org/others/ipsum.pdf',
					'https://api.telegram.org/others/dolor.pdf'
				]
			];

			const setup = [
				[
					null,
					{ name: 'ipsum', extension: 'pdf', filename: 'ipsum.pdf' },
					null
				],
				[
					{ name: 'lorem', extension: 'pdf', filename: 'lorem.pdf' },
					null,
					{ name: 'dolor', extension: 'pdf', filename: 'dolor.pdf' }
				]
			];

			for (const x of setup) {
				const utilStub = sinon.stub(
					ILoveApiUtils.default,
					'getOriginalFileInformationFromURL'
				);

				utilStub.onCall(0).returns(x[0]);
				utilStub.onCall(1).returns(x[1]);
				utilStub.onCall(2).returns(x[2]);

				await expect(ILovePDFController.mergePdf(...params)).to.be.rejectedWith(
					'Failed to resolve original file details.'
				);

				expect(utilStub.firstCall.returnValue).to.be.deep.equal(x[0]);
				expect(utilStub.secondCall.returnValue).to.be.deep.equal(x[1]);
				expect(utilStub.thirdCall.returnValue).to.be.deep.equal(x[2]);

				utilStub.restore();
			}
		});

		it('should call service with correct parameters and return mocked value', async () => {
			spyServiceStub.resetHistory();

			const params = [
				'some_sha1_job_id',
				185150,
				[
					'https://api.telegram.org/others/lorem.pdf',
					'https://api.telegram.org/others/ipsum.pdf',
					'https://api.telegram.org/others/dolor.pdf'
				]
			];

			const result = await ILovePDFController.mergePdf(...params);

			expect(spyServiceStub.calledOnceWith(...params)).to.be.true;
			expect(result).to.be.deep.equal(mockServiceValue);
		});
	});

	describe('compressPdf()', () => {
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
				.stub(ILovePDFService.default, 'compressPdf')
				.resolves(mockServiceValue);
		});

		after(() => {
			sinon.restore();
		});

		it('should resolves the mocked value from the service', async () => {
			const result = await ILovePDFService.default.compressPdf();
			expect(result).to.be.deep.equal(mockServiceValue);
		});

		it('should rejects with an Error when required parameters missing', async () => {
			await expect(
				ILovePDFController.compressPdf(
					null,
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.compressPdf(
					'some_sha1_job_id',
					null,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Missing required parameters.');

			await expect(
				ILovePDFController.compressPdf('some_sha1_job_id', 185150, null)
			).to.be.rejectedWith('Missing required parameters.');
		});

		it('should rejects with an Error when getOriginalFileInformationFromURL return null', async () => {
			const utilStub = sinon
				.stub(ILoveApiUtils.default, 'getOriginalFileInformationFromURL')
				.returns(null);

			await expect(
				ILovePDFController.compressPdf(
					'some_sha1_job_id',
					185150,
					'https://api.telegram.org/others/lorem.pdf'
				)
			).to.be.rejectedWith('Failed to resolve original file details.');

			utilStub.restore();
		});

		it('should call service with correct parameters and return mocked value', async () => {
			spyServiceStub.resetHistory();

			const result = await ILovePDFController.compressPdf(
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
