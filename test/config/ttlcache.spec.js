import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as _TTLCache from '../../src/config/ttlcache.js';

const TTLCache = _TTLCache.default;

describe('[Unit] TTLCache', () => {
	describe('withLock()', () => {
		it('should run function immediately if no existing lock', async () => {
			const result = await TTLCache.withLock('185150255', async () => ({
				success: true
			}));

			expect(result).to.be.deep.equal({ success: true });
		});

		it('should serialize concurrent executions under the same key', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			let results = [];

			const p1 = TTLCache.withLock('185150255', async () => {
				await new Promise((res) => setTimeout(res, 725));
				results.push({ data: 'p1' });
			});

			const p2 = TTLCache.withLock('185150255', async () => {
				await new Promise((res) => setTimeout(res, 1250));
				results.push({ data: 'p2' });
			});

			const p3 = TTLCache.withLock('185150255', async () => {
				results.push({ data: 'p3' });
			});

			const p4 = TTLCache.withLock('185150255', async () => {
				results.push({ data: 'p4' });
			});

			const p5 = TTLCache.withLock('185150255', async () => {
				await new Promise((res) => setTimeout(res, 95));
				results.push({ data: 'p5' });
			});

			await Promise.all([p1, p2, p3, p4, p5]);

			expect(results).to.be.deep.equal([
				{ data: 'p1' },
				{ data: 'p2' },
				{ data: 'p3' },
				{ data: 'p4' },
				{ data: 'p5' }
			]);
		});

		it('should execute locks for different keys in parallel', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			let results = [];

			const p1 = TTLCache.withLock('185150255', async () => {
				await new Promise((res) => setTimeout(res, 1725));
				results.push({ data: 'p1' });
			});

			const p2 = TTLCache.withLock('185150311', async () => {
				await new Promise((res) => setTimeout(res, 55));
				results.push({ data: 'p2' });
			});

			const p3 = TTLCache.withLock('175150255', async () => {
				await new Promise((res) => setTimeout(res, 725));
				results.push({ data: 'p3' });
			});

			const p4 = TTLCache.withLock('175150311', async () => {
				await new Promise((res) => setTimeout(res, 485));
				results.push({ data: 'p4' });
			});

			await Promise.all([p1, p2, p3, p4]);

			expect(results).to.be.deep.equal([
				{ data: 'p2' },
				{ data: 'p4' },
				{ data: 'p3' },
				{ data: 'p1' }
			]);
		});
	});

	describe('userMessageUploadCache', () => {
		it('should store and retrieve entry before TTL expires', () => {
			TTLCache.userMessageUploadCache.set('185150232', {
				userId: 185150,
				messageId: 232,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			const entry = TTLCache.userMessageUploadCache.get('185150232');

			expect(entry).to.be.deep.equal({
				userId: 185150,
				messageId: 232,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});
		});

		it('should expire entry after TTL expires', function (done) {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			TTLCache.userMessageUploadCache.set('185150232', {
				userId: 185150,
				messageId: 232,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			setTimeout(() => {
				const expired = TTLCache.userMessageUploadCache.get('185150232');

				expect(expired).to.be.undefined;
				expect(TTLCache.userMessageUploadCache.size).to.be.equal(0);

				done();
			}, 2100); // Wait > 2s
		});

		it('should update entry without updating TTL', function (done) {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			TTLCache.userMessageUploadCache.set('185150232', {
				userId: 185150,
				messageId: 232,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			const current = TTLCache.userMessageUploadCache.get('185150232');
			const currentTtl =
				TTLCache.userMessageUploadCache.getRemainingTTL('185150232');

			expect(current).to.be.deep.equal({
				userId: 185150,
				messageId: 232,
				tool: 'merge',
				fileType: 'pdf',
				files: []
			});

			setTimeout(() => {
				TTLCache.userMessageUploadCache.set(
					'185150232',
					{
						userId: 185150,
						messageId: 232,
						tool: 'merge',
						fileType: 'pdf',
						files: ['lorem', 'ipsum', 'dolor']
					},
					{ noUpdateTTL: true }
				);

				const updated = TTLCache.userMessageUploadCache.get('185150232');
				const updatedTtl =
					TTLCache.userMessageUploadCache.getRemainingTTL('185150232');

				expect(updated).to.be.deep.equal({
					userId: 185150,
					messageId: 232,
					tool: 'merge',
					fileType: 'pdf',
					files: ['lorem', 'ipsum', 'dolor']
				});
				expect(currentTtl > updatedTtl).to.be.true;

				setTimeout(() => {
					const expired = TTLCache.userMessageUploadCache.get('185150232');

					expect(expired).to.be.undefined;
					expect(TTLCache.userMessageUploadCache.size).to.be.equal(0);

					done();
				}, 2100); // Wait > 2s
			}, 275); // Wait 0.275s
		});

		it('should evict oldest entry when max is exceeded', () => {
			const setup = [
				{
					key: '185150232',
					val: {
						userId: 185150,
						messageId: 232,
						tool: 'merge',
						fileType: 'pdf',
						files: ['lorem']
					}
				},
				{
					key: '185150235',
					val: {
						userId: 185150,
						messageId: 235,
						tool: 'merge',
						fileType: 'pdf',
						files: ['ipsum', 'dolor']
					}
				},
				{
					key: '175150122',
					val: {
						userId: 175150,
						messageId: 122,
						tool: 'merge',
						fileType: 'pdf',
						files: []
					}
				},
				{
					key: '165150115',
					val: {
						userId: 165150,
						messageId: 115,
						tool: 'merge',
						fileType: 'pdf',
						files: ['sit']
					}
				}
			];

			for (const entry of setup) {
				TTLCache.userMessageUploadCache.set(entry.key, entry.val);
			}

			expect(TTLCache.userMessageUploadCache.get(setup[0].key)).to.be.undefined;
			expect(
				TTLCache.userMessageUploadCache.get(setup[1].key)
			).to.be.deep.equal(setup[1].val);
			expect(
				TTLCache.userMessageUploadCache.get(setup[2].key)
			).to.be.deep.equal(setup[2].val);
			expect(
				TTLCache.userMessageUploadCache.get(setup[3].key)
			).to.be.deep.equal(setup[3].val);
			expect(TTLCache.userMessageUploadCache.size).to.be.equal(3);
		});
	});
});
