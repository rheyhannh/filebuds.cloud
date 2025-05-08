import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as _TTLCache from '../../src/config/ttlcache.js';

const TTLCache = _TTLCache.default;

describe('[Unit] TTLCache', () => {
	describe('withLock()', () => {
		it('should run function immediately if no existing lock and cleanup locks', async () => {
			const result = await TTLCache.withLock('185150255', async () => ({
				success: true
			}));

			expect(result).to.be.deep.equal({ success: true });
			expect(TTLCache.locks.has('185150255')).to.be.false;
		});

		it('should able to run function and cleanup locks in sequentially', async function () {
			// Adjust timeout to prevent early exit.
			this.timeout(5000);

			const result = [];

			await TTLCache.withLock('185150236', async () => {
				result.push({ data: '185150236-1' });
			});
			expect(TTLCache.locks.has('185150236')).to.be.false;

			await TTLCache.withLock('185150312', async () => {
				await new Promise((res) => setTimeout(res, 750));
				result.push({ data: '185150312-1' });
			});
			expect(TTLCache.locks.has('185150312')).to.be.false;

			await TTLCache.withLock('185150236', async () => {
				await new Promise((res) => setTimeout(res, 75));
				result.push({ data: '185150236-2' });
			});
			expect(TTLCache.locks.has('185150236')).to.be.false;

			await TTLCache.withLock('125150211', async () => {
				await new Promise((res) => setTimeout(res, 25));
				result.push({ data: '125150211-1' });
			});
			expect(TTLCache.locks.has('125150211')).to.be.false;

			await TTLCache.withLock('185150236', async () => {
				await new Promise((res) => setTimeout(res, 225));
				result.push({ data: '185150236-3' });
			});
			expect(TTLCache.locks.has('185150236')).to.be.false;

			expect(result).to.be.deep.equal([
				{ data: '185150236-1' },
				{ data: '185150312-1' },
				{ data: '185150236-2' },
				{ data: '125150211-1' },
				{ data: '185150236-3' }
			]);
			expect(TTLCache.locks.size).to.be.equal(0);
		});

		it('should serialize concurrent executions under the same key and cleanup locks in parallel', async function () {
			// Adjust timeout to prevent early exit
			this.timeout(5000);

			// Helper method to shuffle array.
			const shuffle = (arr) => {
				const copy = [...arr];
				for (let i = copy.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[copy[i], copy[j]] = [copy[j], copy[i]];
				}
				return copy;
			};

			let overallOrder = [];
			let orderByUsers = {
				user1: [],
				user2: [],
				user3: [],
				user4: []
			};

			const p1 = TTLCache.withLock('user1', async () => {
				await new Promise((res) => setTimeout(res, 725));
				overallOrder.push({ data: 'p1' });
				orderByUsers.user1.push({ data: 'p1' });
			});

			const p2 = TTLCache.withLock('user1', async () => {
				await new Promise((res) => setTimeout(res, 1250));
				overallOrder.push({ data: 'p2' });
				orderByUsers.user1.push({ data: 'p2' });
			});

			const p3 = TTLCache.withLock('user4', async () => {
				await new Promise((res) => setTimeout(res, 625));
				overallOrder.push({ data: 'p3' });
				orderByUsers.user4.push({ data: 'p3' });
			});

			const p4 = TTLCache.withLock('user2', async () => {
				await new Promise((res) => setTimeout(res, 1000));
				overallOrder.push({ data: 'p4' });
				orderByUsers.user2.push({ data: 'p4' });
			});

			const p5 = TTLCache.withLock('user1', async () => {
				overallOrder.push({ data: 'p5' });
				orderByUsers.user1.push({ data: 'p5' });
			});

			const p6 = TTLCache.withLock('user3', async () => {
				await new Promise((res) => setTimeout(res, 900));
				overallOrder.push({ data: 'p6' });
				orderByUsers.user3.push({ data: 'p6' });
			});

			const p7 = TTLCache.withLock('user4', async () => {
				overallOrder.push({ data: 'p7' });
				orderByUsers.user4.push({ data: 'p7' });
			});

			const p8 = TTLCache.withLock('user4', async () => {
				await new Promise((res) => setTimeout(res, 300));
				overallOrder.push({ data: 'p8' });
				orderByUsers.user4.push({ data: 'p8' });
			});

			const p9 = TTLCache.withLock('user3', async () => {
				overallOrder.push({ data: 'p9' });
				orderByUsers.user3.push({ data: 'p9' });
			});

			const p10 = TTLCache.withLock('user2', async () => {
				await new Promise((res) => setTimeout(res, 15));
				overallOrder.push({ data: 'p10' });
				orderByUsers.user2.push({ data: 'p10' });
			});

			const p11 = TTLCache.withLock('user1', async () => {
				overallOrder.push({ data: 'p11' });
				orderByUsers.user1.push({ data: 'p11' });
			});

			const p12 = TTLCache.withLock('user3', async () => {
				await new Promise((res) => setTimeout(res, 1256));
				overallOrder.push({ data: 'p12' });
				orderByUsers.user3.push({ data: 'p12' });
			});

			const p13 = TTLCache.withLock('user2', async () => {
				await new Promise((res) => setTimeout(res, 512));
				overallOrder.push({ data: 'p13' });
				orderByUsers.user2.push({ data: 'p13' });
			});

			const p14 = TTLCache.withLock('user4', async () => {
				await new Promise((res) => setTimeout(res, 1423));
				overallOrder.push({ data: 'p14' });
				orderByUsers.user4.push({ data: 'p14' });
			});

			const p15 = TTLCache.withLock('user1', async () => {
				await new Promise((res) => setTimeout(res, 95));
				overallOrder.push({ data: 'p15' });
				orderByUsers.user1.push({ data: 'p15' });
			});

			await Promise.all(
				shuffle([
					p1,
					p2,
					p3,
					p4,
					p5,
					p6,
					p7,
					p8,
					p9,
					p10,
					p11,
					p12,
					p13,
					p14,
					p15
				])
			);

			expect(orderByUsers).to.be.deep.equal({
				user1: [
					{ data: 'p1' }, // 725
					{ data: 'p2' }, // 1250
					{ data: 'p5' }, // 0
					{ data: 'p11' }, // 0
					{ data: 'p15' } // 95
				],
				user2: [
					{ data: 'p4' }, // 1000
					{ data: 'p10' }, // 15
					{ data: 'p13' } // 512
				],
				user3: [
					{ data: 'p6' }, // 900
					{ data: 'p9' }, // 0
					{ data: 'p12' } // 1256
				],
				user4: [
					{ data: 'p3' }, // 625
					{ data: 'p7' }, // 0
					{ data: 'p8' }, // 300
					{ data: 'p14' } // 1423
				]
			});
			expect(overallOrder).to.be.deep.equal([
				{ data: 'p3' },
				{ data: 'p7' },
				{ data: 'p1' },
				{ data: 'p6' },
				{ data: 'p9' },
				{ data: 'p8' },
				{ data: 'p4' },
				{ data: 'p10' },
				{ data: 'p13' },
				{ data: 'p2' },
				{ data: 'p5' },
				{ data: 'p11' },
				{ data: 'p15' },
				{ data: 'p12' },
				{ data: 'p14' }
			]);
			expect(TTLCache.locks.has('user1')).to.be.false;
			expect(TTLCache.locks.has('user2')).to.be.false;
			expect(TTLCache.locks.has('user3')).to.be.false;
			expect(TTLCache.locks.has('user4')).to.be.false;
			expect(TTLCache.locks.size).to.be.equal(0);
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
