import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as _Utils from '../../src/utils/bot.js';

const Utils = _Utils.default;

describe('[Unit] Telegram Bot Utils', () => {
	describe('checkMimeType()', () => {
		it('should return an object with the expected properties', () => {
			const setups = [
				{ param: 'image/png', result: { isImage: true, isPdf: false } },
				{ param: 'image/jpeg', result: { isImage: true, isPdf: false } },
				{ param: 'application/pdf', result: { isImage: false, isPdf: true } },
				{ param: 'mp3', result: { isImage: false, isPdf: false } },
				{ param: 666, result: { isImage: false, isPdf: false } },
				{ param: null, result: { isImage: false, isPdf: false } },
				{ param: undefined, result: { isImage: false, isPdf: false } }
			];

			for (const setup of setups) {
				const result = Utils.checkMimeType(setup.param);

				expect(result).to.be.an('object');
				expect(result).to.deep.equal(setup.result);
			}
		});
	});

	describe('checkFileSize()', () => {
		it('should throw Error when fileSize is invalid', () => {
			[null, {}, [], '255', -105, 12.5].forEach((invalidValue) => {
				expect(() => Utils.checkFileSize(invalidValue, 100)).to.throw(
					'File size must be a non-negative integer'
				);
			});
		});

		it('should throw Error when maxFileSize is invalid', () => {
			[null, {}, [], '200', -135, 12.5].forEach((invalidValue) => {
				expect(() => Utils.checkFileSize(551, invalidValue)).to.throw(
					'Maximum file size must be a non-negative integer'
				);
			});
		});

		it('should return true when fileSize is within limit or no max limit', () => {
			expect(Utils.checkFileSize(100, 200)).to.be.true;
			expect(Utils.checkFileSize(50, 50)).to.be.true;
			expect(Utils.checkFileSize(500)).to.be.true; // No max limit
		});

		it('should return false when fileSize exceeds maxFileSize', () => {
			expect(Utils.checkFileSize(300, 200)).to.be.false;
			expect(Utils.checkFileSize(300, 299)).to.be.false;
		});
	});

	describe('generateCallbackData()', () => {
		it('should return a valid JSON string for given type and task', () => {
			const result = Utils.generateCallbackData('image', 'upscaleimage');
			expect(result).to.equal(
				JSON.stringify({ type: 'image', task: 'upscaleimage' })
			);
		});

		it('should work with different types and tasks', () => {
			const result = Utils.generateCallbackData('pdf', 'watermarkimage');
			expect(result).to.equal(
				JSON.stringify({ type: 'pdf', task: 'watermarkimage' })
			);
		});

		it('should return correct structure when task is null', () => {
			const result = Utils.generateCallbackData('doc/image', null);
			expect(result).to.equal(
				JSON.stringify({ type: 'doc/image', task: null })
			);
		});

		it('should return correct structure when type is null', () => {
			const result = Utils.generateCallbackData(null, 'removebackgroundimage');
			expect(result).to.equal(
				JSON.stringify({ type: null, task: 'removebackgroundimage' })
			);
		});

		it('should handle both type and task as null', () => {
			const result = Utils.generateCallbackData(null, null);
			expect(result).to.equal(JSON.stringify({ type: null, task: null }));
		});

		it('should handle objects as type and task', () => {
			const result = Utils.generateCallbackData({ a: 1 }, { b: 2 });
			expect(result).to.equal(
				JSON.stringify({ type: { a: 1 }, task: { b: 2 } })
			);
		});
	});

	describe('generateInlineKeyboard()', () => {
		const defaultImageTools = [
			{
				text: 'Bagusin ✨ (20)',
				callback_data: JSON.stringify({
					type: 'image',
					task: 'upscaleimage'
				})
			},
			{
				text: 'Hapus Background 🌄 (10)',
				callback_data: JSON.stringify({
					type: 'image',
					task: 'removebackgroundimage'
				})
			},
			{
				text: 'Ubah ke PDF 📝 (10)',
				callback_data: JSON.stringify({
					type: 'image',
					task: 'imagepdf'
				})
			}
		];

		const defaultDocImageTools = [
			{
				text: 'Bagusin ✨ (20)',
				callback_data: JSON.stringify({
					type: 'doc/image',
					task: 'upscaleimage'
				})
			},
			{
				text: 'Hapus Background 🌄 (10)',
				callback_data: JSON.stringify({
					type: 'doc/image',
					task: 'removebackgroundimage'
				})
			},
			{
				text: 'Ubah ke PDF 📝 (10)',
				callback_data: JSON.stringify({
					type: 'doc/image',
					task: 'imagepdf'
				})
			}
		];

		const defaultPdfTools = [
			{
				text: 'Gabungin 📚 (5)',
				callback_data: JSON.stringify({ type: 'pdf', task: 'merge' })
			},
			{
				text: 'Compress 📦 (10)',
				callback_data: JSON.stringify({ type: 'pdf', task: 'compress' })
			},
			{
				text: 'Ubah ke Gambar 📸 (10)',
				callback_data: JSON.stringify({ type: 'pdf', task: 'pdfjpg' })
			}
		];

		it('should return undefined when fileType are not an image or PDF', () => {
			const params = [null, undefined, 'mp3', 'avi', 'txt'];

			for (const param in params) {
				const result = Utils.generateInlineKeyboard(param);
				expect(result).to.be.undefined;
			}
		});

		it('should return default inline keyboard when no filters or custom text are provided', () => {
			const setup = [
				{ params: ['image', false], result: defaultImageTools },
				{ params: ['doc/image', false], result: defaultDocImageTools },
				{ params: ['pdf', false], result: defaultPdfTools }
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});

		it('should filter out specific tools using toolFilter', () => {
			const setup = [
				{
					params: ['image', false, ['upscaleimage', 'removebackgroundimage']],
					result: [
						{
							text: 'Ubah ke PDF 📝 (10)',
							callback_data: JSON.stringify({
								type: 'image',
								task: 'imagepdf'
							})
						}
					]
				},
				{
					params: ['doc/image', false, ['removebackgroundimage']],
					result: [
						{
							text: 'Bagusin ✨ (20)',
							callback_data: JSON.stringify({
								type: 'doc/image',
								task: 'upscaleimage'
							})
						},
						{
							text: 'Ubah ke PDF 📝 (10)',
							callback_data: JSON.stringify({
								type: 'doc/image',
								task: 'imagepdf'
							})
						}
					]
				},
				{
					params: ['pdf', false, ['merge', 'compress']],
					result: [
						{
							text: 'Ubah ke Gambar 📸 (10)',
							callback_data: JSON.stringify({ type: 'pdf', task: 'pdfjpg' })
						}
					]
				}
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});

		it('should replace tool text when toolCustomText is provided', () => {
			const setup = [
				{
					params: [
						'image',
						false,
						[],
						{ removebackgroundimage: 'Enhance 🔥 (50)' }
					],
					result: [
						{
							text: 'Bagusin ✨ (20)',
							callback_data: JSON.stringify({
								type: 'image',
								task: 'upscaleimage'
							})
						},
						{
							text: 'Enhance 🔥 (50)',
							callback_data: JSON.stringify({
								type: 'image',
								task: 'removebackgroundimage'
							})
						},
						{
							text: 'Ubah ke PDF 📝 (10)',
							callback_data: JSON.stringify({
								type: 'image',
								task: 'imagepdf'
							})
						}
					]
				},
				{
					params: [
						'doc/image',
						false,
						[],
						{
							imagepdf: 'Lorem Ipsum 📦 (100)',
							removebackgroundimage: 'Enhance 🔥 (50)'
						}
					],
					result: [
						{
							text: 'Bagusin ✨ (20)',
							callback_data: JSON.stringify({
								type: 'doc/image',
								task: 'upscaleimage'
							})
						},
						{
							text: 'Enhance 🔥 (50)',
							callback_data: JSON.stringify({
								type: 'doc/image',
								task: 'removebackgroundimage'
							})
						},
						{
							text: 'Lorem Ipsum 📦 (100)',
							callback_data: JSON.stringify({
								type: 'doc/image',
								task: 'imagepdf'
							})
						}
					]
				},
				{
					params: [
						'pdf',
						false,
						[],
						{
							merge: 'Lorem Ipsum 📦 (AAA)',
							compress: 'Dolor Sit 📸 (XX)',
							pdfjpg: 'Amet 📝 (75)'
						}
					],
					result: [
						{
							text: 'Lorem Ipsum 📦 (AAA)',
							callback_data: JSON.stringify({ type: 'pdf', task: 'merge' })
						},
						{
							text: 'Dolor Sit 📸 (XX)',
							callback_data: JSON.stringify({ type: 'pdf', task: 'compress' })
						},
						{
							text: 'Amet 📝 (75)',
							callback_data: JSON.stringify({ type: 'pdf', task: 'pdfjpg' })
						}
					]
				}
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});

		it('should return a mapped result when mapResult is true', () => {
			const setup = [
				{
					params: ['image', true],
					result: defaultImageTools.map((item) => [item])
				},
				{
					params: ['doc/image', true],
					result: defaultDocImageTools.map((item) => [item])
				},
				{ params: ['pdf', true], result: defaultPdfTools.map((item) => [item]) }
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});

		it('should return an empty array when all tools are filtered out', () => {
			const setup = [
				{
					params: [
						'image',
						false,
						['upscaleimage', 'removebackgroundimage', 'imagepdf']
					]
				},
				{
					params: [
						'doc/image',
						false,
						['upscaleimage', 'removebackgroundimage', 'imagepdf']
					]
				},
				{
					params: ['pdf', false, ['merge', 'compress', 'pdfjpg']]
				}
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.deep.equal([]);
			}
		});

		it('should handle an empty toolFilter gracefully', () => {
			const setup = [
				{
					params: ['image', false, []],
					result: defaultImageTools
				},
				{
					params: ['doc/image', false, []],
					result: defaultDocImageTools
				},
				{
					params: ['pdf', false, []],
					result: defaultPdfTools
				}
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});

		it('should handle an empty toolCustomText object gracefully', () => {
			const setup = [
				{
					params: ['image', false, [], {}],
					result: defaultImageTools
				},
				{
					params: ['doc/image', false, [], {}],
					result: defaultDocImageTools
				},
				{
					params: ['pdf', false, [], {}],
					result: defaultPdfTools
				}
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});

		it('should work when both filtering and custom text are applied', () => {
			const setup = [
				{
					params: [
						'image',
						false,
						['imagepdf'],
						{ upscaleimage: 'Lorem Ipsum' }
					],
					result: [
						{
							text: 'Lorem Ipsum',
							callback_data: JSON.stringify({
								type: 'image',
								task: 'upscaleimage'
							})
						},
						{
							text: 'Hapus Background 🌄 (10)',
							callback_data: JSON.stringify({
								type: 'image',
								task: 'removebackgroundimage'
							})
						}
					]
				},
				{
					params: [
						'doc/image',
						true,
						['imagepdf', 'upscaleimage'],
						{ removebackgroundimage: 'Lorem Ipsum' }
					],
					result: [
						{
							text: 'Lorem Ipsum',
							callback_data: JSON.stringify({
								type: 'doc/image',
								task: 'removebackgroundimage'
							})
						}
					].map((item) => [item])
				},
				{
					params: [
						'pdf',
						true,
						['imagepdf', 'compress'],
						{ merge: 'Lorem Ipsum', pdfjpg: 'Dolor Sit Amet' }
					],
					result: [
						{
							text: 'Lorem Ipsum',
							callback_data: JSON.stringify({ type: 'pdf', task: 'merge' })
						},
						{
							text: 'Dolor Sit Amet',
							callback_data: JSON.stringify({ type: 'pdf', task: 'pdfjpg' })
						}
					].map((item) => [item])
				}
			];

			for (const x of setup) {
				const result = Utils.generateInlineKeyboard(...x.params);
				expect(result).to.be.deep.equal(x.result);
			}
		});
	});

	describe('generateJobTrackingMessage()', () => {
		it('should return expected properties by providing the jobLog entry.', () => {
			const setup =
				/** @type {Array<{jobLog:import('../../src/schemas/supabase.js').JobLogEntry, text:string, extra:Object}>} */ ([
					{
						jobLog: {
							job_id: '2e169854ce7375ca8b10dca779d8c0e11375d197',
							tool: 'upscaleimage',
							task_worker_state: 'completed'
						},
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: 2e169854ce7375ca8b10dca779d8c0e11375d197` +
							`\nTipe: upscaleimage` +
							`\nStatus (3/4): Segera Dikirim🚚` +
							`\nKeterangan: Permintaanmu telah diproses, hasilnya akan segera dikirim ke chat ini.` +
							`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
						extra: {
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: 'Perbarui Resi 🔄',
											callback_data: JSON.stringify({
												jid: '2e169854ce7375ca8b10dca779d8c0e11375d197'
											})
										}
									]
								]
							}
						}
					},
					{
						jobLog: {
							job_id: 'ffc4f64d857c5ab4344bd0584b1261e53f1273bd',
							tool: 'upscaleimage',
							task_worker_state: 'completed',
							downloader_worker_state: 'completed'
						},
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: ffc4f64d857c5ab4344bd0584b1261e53f1273bd` +
							`\nTipe: upscaleimage` +
							`\nStatus (4/4): Selesai✅` +
							`\nKeterangan: Yeay! Permintaanmu telah berhasil diselesaikan. Terima kasih telah menggunakan Filebuds🚀`,
						extra: {}
					},
					{
						jobLog: {
							job_id: '60c0c9877888b0ab459297a49dc4966398dda417',
							tool: 'removebackgroundimage',
							task_worker_state: 'failed'
						},
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: 60c0c9877888b0ab459297a49dc4966398dda417` +
							`\nTipe: removebackgroundimage` +
							`\nStatus (-1): Gagal❌` +
							`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
						extra: {}
					},
					{
						jobLog: {
							job_id: '322ed852423bcba502782e28f7b48ab7d003989a',
							tool: 'upscaleimage',
							task_worker_state: 'completed',
							downloader_worker_state: 'failed'
						},
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: 322ed852423bcba502782e28f7b48ab7d003989a` +
							`\nTipe: upscaleimage` +
							`\nStatus (-1): Gagal❌` +
							`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
						extra: {}
					}
				]);

			setup.forEach(({ jobLog, text, extra }) => {
				const result = Utils.generateJobTrackingMessage(jobLog);

				expect(result.text).to.be.equal(text);
				expect(result.extra).to.be.deep.equal(extra);
			});
		});

		it('should return expected properties by filling in other parameters.', () => {
			const setup =
				/** @type {Array<{params:Parameters<typeof Utils.generateJobTrackingMessage>, text:ReturnType<typeof Utils.generateJobTrackingMessage>['text'], extra:ReturnType<typeof Utils.generateJobTrackingMessage>['extra']}>} */ ([
					{
						params: [null, 'first-job-id', 'upscaleimage', '1', false, true],
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: first-job-id` +
							`\nTipe: upscaleimage` +
							`\nStatus (1/4): Antrian⏳` +
							`\nKeterangan: Server Filebuds sedang sibuk, permintaanmu masuk dalam antrian. Proses ini mungkin akan memakan waktu lebih lama dari biasanya.` +
							`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
						extra: {}
					},
					{
						params: [
							undefined,
							'second-job-id',
							'removebackgroundimage',
							'2',
							false,
							false
						],
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: second-job-id` +
							`\nTipe: removebackgroundimage` +
							`\nStatus (2/4): Sedang Diproses⚡` +
							`\nKeterangan: Permintaanmu sedang dalam tahap pemrosesan.`,
						extra: {}
					},
					{
						params: [null, undefined, 'upscaleimage', '3', true, false],
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: -` +
							`\nTipe: upscaleimage` +
							`\nStatus (3/4): Segera Dikirim🚚` +
							`\nKeterangan: Permintaanmu telah diproses, hasilnya akan segera dikirim ke chat ini.`,
						extra: {
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: 'Perbarui Resi 🔄',
											callback_data: JSON.stringify({ jid: '-' })
										}
									]
								]
							}
						}
					},
					{
						params: [undefined, undefined, undefined, '4', true, true],
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: -` +
							`\nTipe: -` +
							`\nStatus (4/4): Selesai✅` +
							`\nKeterangan: Yeay! Permintaanmu telah berhasil diselesaikan. Terima kasih telah menggunakan Filebuds🚀` +
							`\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`,
						extra: {
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: 'Perbarui Resi 🔄',
											callback_data: JSON.stringify({ jid: '-' })
										}
									]
								]
							}
						}
					},
					{
						params: [],
						text:
							'📝 Resi Filebuds' +
							`\n━━━━━━━━━━━━━━━━━` +
							`\nID: -` +
							`\nTipe: -` +
							`\nStatus (-1): Gagal❌` +
							`\nKeterangan: Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.`,
						extra: {}
					}
				]);

			setup.forEach(({ params, text, extra }) => {
				const result = Utils.generateJobTrackingMessage(...params);

				expect(result.text).to.be.equal(text);
				expect(result.extra).to.be.deep.equal(extra);
			});
		});
	});
});
