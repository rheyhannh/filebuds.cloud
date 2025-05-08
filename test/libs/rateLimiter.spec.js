import { describe, it } from 'mocha';
import { expect } from 'chai';
import RateLimiter from '../../src/libs/rateLimiter.js';

describe('[Unit] RateLimiter', () => {
	let rateLimiter =
		/** @type {InstanceType<typeof RateLimiter<string,number>>} */ (undefined);

	beforeEach(() => {
		rateLimiter = new RateLimiter({
			ttl: 2000,
			max: 5,
			maxAttempt: 3
		});
	});

	describe('constructor', () => {
		it('should strictly set updateAgeOnGet to false', () => {
			const limiter = new RateLimiter({
				ttl: 2000,
				max: 5,
				maxAttempt: 3
			});

			expect(limiter.updateAgeOnGet).to.be.equal(false);
		});

		it('should strictly set checkAgeOnGet to true', () => {
			const limiter = new RateLimiter({
				ttl: 2000,
				max: 5,
				maxAttempt: 3
			});

			expect(limiter.checkAgeOnGet).to.be.equal(true);
		});

		it('should strictly set noUpdateTTL to true', () => {
			const limiter = new RateLimiter({
				ttl: 2000,
				max: 5,
				maxAttempt: 3
			});

			expect(limiter.noUpdateTTL).to.be.equal(true);
		});

		it('should set default maxAttempt to 3 when invalid value is passed', () => {
			const vals = ['my_string', {}, [], -1, true, false, undefined, null];

			for (const val of vals) {
				const limiter = new RateLimiter({
					ttl: 1000,
					max: 5,
					maxAttempt: val
				});

				expect(limiter.maxAttempt).to.be.equal(3);
			}
		});

		it('should set default max to 250 when invalid value is passed', () => {
			const vals = [undefined, null];

			for (const val of vals) {
				const limiter = new RateLimiter({
					ttl: 1000,
					max: val,
					maxAttempt: 5
				});

				expect(limiter.max).to.be.equal(250);
			}
		});

		it('should set default ttl to 60000ms (1 minutes) when invalid value is passed', () => {
			const vals = [undefined, null];

			for (const val of vals) {
				const limiter = new RateLimiter({
					ttl: val,
					max: 5,
					maxAttempt: 5
				});

				expect(limiter.ttl).to.be.equal(60000);
			}
		});

		it('should use default options value when some of attributes are invalid', () => {
			const options = [
				{ ttl: undefined, max: 5, maxAttempt: 5 },
				{ ttl: 1000, max: undefined, maxAttempt: 5 },
				{ ttl: 1000, max: 5, maxAttempt: undefined },
				{ ttl: null, max: 5, maxAttempt: 5 },
				{ ttl: 1000, max: null, maxAttempt: 5 },
				{ ttl: 1000, max: 5, maxAttempt: null }
			];

			for (const option of options) {
				const limiter = new RateLimiter(option);

				expect(limiter.ttl).to.be.equal(option?.ttl ?? 60000);
				expect(limiter.max).to.be.equal(option?.max ?? 250);
				expect(limiter.maxAttempt).to.be.equal(option?.maxAttempt ?? 3);
			}
		});

		it('should use default options when options it self not provided', () => {
			const limiter = new RateLimiter();

			expect(limiter.ttl).to.be.equal(60000);
			expect(limiter.max).to.be.equal(250);
			expect(limiter.maxAttempt).to.be.equal(3);
		});

		it('should accept valid options attributes value', () => {
			const limiter = new RateLimiter({
				ttl: 25000,
				max: 500,
				maxAttempt: 25
			});

			expect(limiter.ttl).to.be.equal(25000);
			expect(limiter.max).to.be.equal(500);
			expect(limiter.maxAttempt).to.be.equal(25);
		});
	});

	describe('attempt()', () => {
		it('should allow first attempt for a new key', () => {
			const result = rateLimiter.attempt('user1');
			expect(result).to.be.true;

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(1);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(1);
		});

		it('should allow multiple attempts up to maxAttempt', () => {
			expect(rateLimiter.attempt('user1')).to.be.true;
			expect(rateLimiter.attempt('user1')).to.be.true;
			expect(rateLimiter.attempt('user1')).to.be.true;

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(1);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(3);
		});

		it('should block attempt after reaching maxAttempt', () => {
			rateLimiter.attempt('user1');
			rateLimiter.attempt('user1');
			rateLimiter.attempt('user1');
			const result = rateLimiter.attempt('user1');
			expect(result).to.be.false;

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(1);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(3);
		});

		it('should block attempt after reaching maxAttempt in concurrent operations', async () => {
			const results = await Promise.all([
				Promise.resolve(rateLimiter.attempt('user1')),
				Promise.resolve(rateLimiter.attempt('user1')),
				Promise.resolve(rateLimiter.attempt('user1')),
				Promise.resolve(rateLimiter.attempt('user1'))
			]);

			expect(results).to.be.deep.equal([true, true, true, false]);

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(1);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(3);
		});

		it('should return false if cache is full and a new key is tried', () => {
			const users = ['user1', 'user2', 'user3', 'user4', 'user5'];

			// Fill cache until its full (max = 5)
			for (const user of users) {
				rateLimiter.attempt(user);
			}

			const result = rateLimiter.attempt('new_user');
			expect(result).to.be.false;

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(5);
			for (const user of users) {
				expect(rateLimiter.has(user)).to.be.true;
				expect(rateLimiter.get(user)).to.be.equal(1);
			}
		});

		it('should return false if cache is full and a new key is tried in concurrent operations', async () => {
			const users = Array.from({ length: 10 }, (_, i) => `user${i + 1}`);

			const results = await Promise.all(
				users.map((user) => Promise.resolve(rateLimiter.attempt(user)))
			);

			expect(results).to.deep.equal(
				Array(5).fill(true).concat(Array(5).fill(false))
			);

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(5);
			users.slice(0, 5).forEach((user) => {
				expect(rateLimiter.has(user)).to.be.true;
				expect(rateLimiter.get(user)).to.be.equal(1);
			});
		});

		it('should allow attempts on existing keys even when cache is full', () => {
			const users = ['user1', 'user2', 'user3', 'user4', 'user5'];

			// Fill cache until its full (max = 5)
			for (const user of users) {
				rateLimiter.attempt(user);
			}

			const result = rateLimiter.attempt('user1'); // Existing key
			expect(result).to.be.true;

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(5);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(2);
			for (const user of users.filter((x) => x !== 'user1')) {
				expect(rateLimiter.has(user)).to.be.true;
				expect(rateLimiter.get(user)).to.be.equal(1);
			}
		});

		it('should allow attempts on existing keys even when cache is full in concurrent operations', async () => {
			const users = [
				'user1',
				'user2',
				'user3',
				'user4',
				'user5',
				'user2',
				'user3',
				'user3'
			];

			const results = await Promise.all(
				users.map((user) => Promise.resolve(rateLimiter.attempt(user)))
			);

			expect(results).to.be.deep.equal(Array(8).fill(true));

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(5);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(1);
			expect(rateLimiter.has('user2')).to.be.true;
			expect(rateLimiter.get('user2')).to.be.equal(2);
			expect(rateLimiter.has('user3')).to.be.true;
			expect(rateLimiter.get('user3')).to.be.equal(3);
			expect(rateLimiter.has('user4')).to.be.true;
			expect(rateLimiter.get('user4')).to.be.equal(1);
			expect(rateLimiter.has('user5')).to.be.true;
			expect(rateLimiter.get('user5')).to.be.equal(1);
		});

		it('should reset after TTL expires and treated as new entry', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			rateLimiter.attempt('user1');
			rateLimiter.attempt('user2');
			rateLimiter.attempt('user3');
			rateLimiter.attempt('user2');
			rateLimiter.attempt('user3');
			rateLimiter.attempt('user3');

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(3);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.has('user2')).to.be.true;
			expect(rateLimiter.has('user3')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(1);
			expect(rateLimiter.get('user2')).to.be.equal(2);
			expect(rateLimiter.get('user3')).to.be.equal(3);

			// Wait 2.1s for TTL expire
			await new Promise((res) => setTimeout(res, 2100));

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(0);
			expect(rateLimiter.has('user1')).to.be.false;
			expect(rateLimiter.has('user2')).to.be.false;
			expect(rateLimiter.has('user3')).to.be.false;

			// Attempt with same user.
			expect(rateLimiter.attempt('user1')).to.be.true;
			expect(rateLimiter.attempt('user2')).to.be.true;
			expect(rateLimiter.attempt('user3')).to.be.true;

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(3);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.has('user2')).to.be.true;
			expect(rateLimiter.has('user3')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(1);
			expect(rateLimiter.get('user2')).to.be.equal(1);
			expect(rateLimiter.get('user3')).to.be.equal(1);
		});

		it('should reset after TTL expires and treated as new entry in concurrent operations', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			await Promise.all([
				Promise.resolve(rateLimiter.attempt('user1')),
				Promise.resolve(rateLimiter.attempt('user2'))
			]);

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(2);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.has('user2')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(1);
			expect(rateLimiter.get('user2')).to.be.equal(1);

			// Wait 2.1s for TTL expire
			await new Promise((res) => setTimeout(res, 2100));

			await Promise.all([
				Promise.resolve(rateLimiter.attempt('user1')),
				Promise.resolve(rateLimiter.attempt('user1')),
				Promise.resolve(rateLimiter.attempt('user4')),
				Promise.resolve(rateLimiter.attempt('user5'))
			]);

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(3);
			expect(rateLimiter.has('user2')).to.be.false;
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.has('user4')).to.be.true;
			expect(rateLimiter.has('user5')).to.be.true;
			expect(rateLimiter.get('user1')).to.be.equal(2);
			expect(rateLimiter.get('user4')).to.be.equal(1);
			expect(rateLimiter.get('user5')).to.be.equal(1);
		});

		it('should handle correctly in bulk concurrent operations', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const users = [
				'user1',
				'user2',
				'user3',
				'user4',
				'user5',
				'user2',
				'user6', // Attempt to assign new user when cache already full
				'user3', // Attempt to assign existing user when cache already full
				'user3', // Attempt to assign existing user when cache already full
				'user7' // Attempt to assign new user when cache already full
			];

			const results = await Promise.all(
				users.map((user) => Promise.resolve(rateLimiter.attempt(user)))
			);

			expect(results).to.be.deep.equal(
				Array(5).fill(true).concat([true, false, true, true, false])
			);

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(5);
			expect(rateLimiter.has('user1')).to.be.true;
			expect(rateLimiter.has('user2')).to.be.true;
			expect(rateLimiter.has('user3')).to.be.true;
			expect(rateLimiter.has('user4')).to.be.true;
			expect(rateLimiter.has('user5')).to.be.true;
			expect(rateLimiter.has('user6')).to.be.false;
			expect(rateLimiter.has('user7')).to.be.false;
			expect(rateLimiter.get('user1')).to.be.equal(1);
			expect(rateLimiter.get('user2')).to.be.equal(2);
			expect(rateLimiter.get('user3')).to.be.equal(3);
			expect(rateLimiter.get('user4')).to.be.equal(1);
			expect(rateLimiter.get('user5')).to.be.equal(1);

			// Wait 2.1s for TTL expire.
			await new Promise((res) => setTimeout(res, 2100));

			// Expect rateLimiter meet some criteria.
			expect(rateLimiter.size).to.be.equal(0);
			expect(rateLimiter.has('user1')).to.be.false;
			expect(rateLimiter.has('user2')).to.be.false;
			expect(rateLimiter.has('user3')).to.be.false;
			expect(rateLimiter.has('user4')).to.be.false;
			expect(rateLimiter.has('user5')).to.be.false;

			// Attempt assign same and different user.
			expect(rateLimiter.attempt('user3')).to.be.true;
			expect(rateLimiter.attempt('user6')).to.be.true;
			expect(rateLimiter.attempt('user7')).to.be.true;

			// Expect entries treated as new entry.
			expect(rateLimiter.size).to.be.equal(3);
			expect(rateLimiter.has('user3')).to.be.true;
			expect(rateLimiter.has('user6')).to.be.true;
			expect(rateLimiter.has('user7')).to.be.true;
			expect(rateLimiter.get('user3')).to.be.equal(1);
			expect(rateLimiter.get('user6')).to.be.equal(1);
			expect(rateLimiter.get('user7')).to.be.equal(1);
		});
	});

	describe('setMaxAttempt()', () => {
		it('should fallback to 3 if newMaxAttempt is not a number', () => {
			const params = [undefined, null, {}, [], false, true, 'my_string'];

			for (const param of params) {
				const limiter = new RateLimiter({
					ttl: 2500,
					max: 25,
					maxAttempt: 10
				});

				expect(limiter.maxAttempt).to.be.equal(10);

				limiter.setMaxAttempt(param);
				expect(limiter.maxAttempt).to.be.equal(3);
			}
		});

		it('should fallback to 3 if newMaxAttempt is invalid', () => {
			const params = [-15, -7, 0];

			for (const param of params) {
				const limiter = new RateLimiter({
					ttl: 2500,
					max: 25,
					maxAttempt: 7
				});

				expect(limiter.maxAttempt).to.be.equal(7);

				limiter.setMaxAttempt(param);
				expect(limiter.maxAttempt).to.be.equal(3);
			}
		});

		it('should set a valid new maxAttempt value', () => {
			const limiter = new RateLimiter({
				ttl: 2500,
				max: 25,
				maxAttempt: 12
			});

			expect(limiter.maxAttempt).to.be.equal(12);

			limiter.setMaxAttempt(25);
			expect(limiter.maxAttempt).to.be.equal(25);
		});
	});
});
