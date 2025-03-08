import { describe, it } from 'mocha';
import { expect } from 'chai';
import { isValidRequest } from '../../src/utils/fastify.js';
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
});
