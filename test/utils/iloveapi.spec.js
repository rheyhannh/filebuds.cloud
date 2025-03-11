import { describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import * as Utils from '../../src/utils/iloveapi.js';

const getOutputFileInformation = Utils.default.getOutputFileInformation;
const getOriginalFileInformationFromURL =
	Utils.default.getOriginalFileInformationFromURL;

describe('[Unit] ILoveApi Utils', () => {
	describe('getOutputFileInformation()', () => {
		it('should return an object with the expected properties', () => {
			const params = [
				[185150, 'pdf'],
				['132521', 'jpg']
			];

			for (const param of params) {
				const result = getOutputFileInformation(...param);

				expect(result).to.be.an('object');
				expect(result.extension).to.be.an('string');
				expect(result.filename).to.be.an('string');
				expect(result.name).to.be.an('string');
			}
		});

		it('should return null when error occurs', () => {
			sinon.stub(Math, 'floor').throws(new Error('Simulating Error'));

			expect(getOutputFileInformation('321abcd', 'pdf')).to.be.null;

			sinon.restore();
		});
	});

	describe('getOriginalFileInformationFromURL()', () => {
		it('should return an object with the expected properties', () => {
			const setup = [
				{
					param: 'https://example.com/file1.pdf',
					result: {
						name: 'file1',
						extension: 'pdf',
						filename: 'file1.pdf'
					}
				},
				{
					param: 'http://api.telegram.org/x/y/z/abcde/lorems.jpg',
					result: {
						name: 'lorems',
						extension: 'jpg',
						filename: 'lorems.jpg'
					}
				},
				{
					param: 'https://www.mydomain.biz/a/x/z/d/u/gb/abcde/321abs52cd32.png',
					result: {
						name: '321abs52cd32',
						extension: 'png',
						filename: '321abs52cd32.png'
					}
				}
			];

			for (const x of setup) {
				const result = getOriginalFileInformationFromURL(x.param);

				expect(result).to.be.an('object');
				expect(result.name).to.be.an('string').and.eq(x.result.name);
				expect(result.extension).to.be.an('string').and.eq(x.result.extension);
				expect(result.filename).to.be.an('string').and.eq(x.result.filename);
			}
		});

		it('should return null when error occurs', () => {
			const params = [
				'api.example.com/file1.pdf', // Invalid URL
				'www.api.example.com/lorem/ipsum/dolor/sit/file1.pdf', // Invalid URL
				'https://example.com/2323dfsdds1ws' // No file extension (.)
			];

			for (const param of params) {
				const result = getOriginalFileInformationFromURL(param);

				expect(result).to.be.null;
			}
		});
	});
});
