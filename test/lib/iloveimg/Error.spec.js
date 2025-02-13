import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
	ILoveApiError,
	NetworkError,
	classifyError
} from '../../../src/lib/iloveimg/Error.js';

describe('ILoveIMGApi Error.classifyError() Tests', function () {
	it('should throw ILoveApiError with response message', function () {
		const error = [
			{
				isAxiosError: true,
				response: {
					status: 404,
					data: { message: 'Not Found', code: 1001 }
				}
			},
			{
				isAxiosError: true,
				response: {
					status: 404,
					data: { message: 'Not Found', code: '' }
				}
			},
			{
				isAxiosError: true,
				response: {
					status: 404,
					data: { message: 'Not Found', code: null }
				}
			},
			{
				isAxiosError: true,
				response: {
					status: 404,
					data: { message: 'Not Found', code: undefined }
				}
			}
		];

		expect(() => classifyError(error[0])).to.throw(
			ILoveApiError,
			'Not Found (Status: 404, Code: 1001)'
		);

		expect(() => classifyError(error[1])).to.throw(
			ILoveApiError,
			'Not Found (Status: 404, Code: -1)'
		);

		expect(() => classifyError(error[2])).to.throw(
			ILoveApiError,
			'Not Found (Status: 404, Code: -1)'
		);

		expect(() => classifyError(error[3])).to.throw(
			ILoveApiError,
			'Not Found (Status: 404, Code: -1)'
		);
	});

	it('should throw ILoveApiError with error.message inside response.error', function () {
		const error = [
			{
				isAxiosError: true,
				response: {
					status: 500,
					data: { error: { message: 'Internal Server Error', code: 2001 } }
				}
			},
			{
				isAxiosError: true,
				response: {
					status: 500,
					data: { error: { message: 'Internal Server Error', code: '' } }
				}
			},
			{
				isAxiosError: true,
				response: {
					status: 500,
					data: { error: { message: 'Internal Server Error', code: null } }
				}
			},
			{
				isAxiosError: true,
				response: {
					status: 500,
					data: { error: { message: 'Internal Server Error', code: undefined } }
				}
			}
		];

		expect(() => classifyError(error[0])).to.throw(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: 2001)'
		);

		expect(() => classifyError(error[1])).to.throw(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);

		expect(() => classifyError(error[2])).to.throw(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);

		expect(() => classifyError(error[3])).to.throw(
			ILoveApiError,
			'Internal Server Error (Status: 500, Code: -1)'
		);
	});

	it('should throw ILoveApiError with default message if no message is available', function () {
		const error = {
			isAxiosError: true,
			response: {
				status: 400,
				data: { unknownField: 'no error message' }
			}
		};

		expect(() => classifyError(error)).to.throw(
			ILoveApiError,
			'Unknown API error occurred. (Status: 400, Code: -1)'
		);
	});

	it('should throw ILoveApiError with response but no payload', function () {
		const error = {
			isAxiosError: true,
			response: {
				status: 422,
				data: null
			}
		};

		expect(() => classifyError(error)).to.throw(
			ILoveApiError,
			'Unknown API error occurred. (Status: 422, Code: -1)'
		);
	});

	it('should throw NetworkError when request is made but no response received', function () {
		const error = {
			isAxiosError: true,
			request: {}
		};

		expect(() => classifyError(error)).to.throw(
			NetworkError,
			'No response received from the server.'
		);
	});

	it('should throw NetworkError when request setup fails', function () {
		const error = {
			isAxiosError: true
		};

		expect(() => classifyError(error)).to.throw(
			NetworkError,
			'An error occurred while setting up the request.'
		);
	});

	it("should rethrow generic Error when it's not an AxiosError", function () {
		const error = new Error('Generic system failure');

		expect(() => classifyError(error)).to.throw(
			Error,
			'Generic system failure'
		);
	});
});
