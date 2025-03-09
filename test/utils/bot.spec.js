import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
	checkMimeType,
	checkFileSize,
	generateCallbackData,
	generateInlineKeyboard
} from '../../src/utils/bot.js';

describe('[Unit] Bot Utils', () => {
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
				const result = checkMimeType(setup.param);

				expect(result).to.be.an('object');
				expect(result).to.deep.equal(setup.result);
			}
		});
	});

	describe('checkFileSize()', () => {
		it('should throw Error when fileSize is invalid', () => {
			[null, {}, [], '255', -105, 12.5].forEach((invalidValue) => {
				expect(() => checkFileSize(invalidValue, 100)).to.throw(
					'File size must be a non-negative integer'
				);
			});
		});

		it('should throw Error when maxFileSize is invalid', () => {
			[null, {}, [], '200', -135, 12.5].forEach((invalidValue) => {
				expect(() => checkFileSize(551, invalidValue)).to.throw(
					'Maximum file size must be a non-negative integer'
				);
			});
		});

		it('should return true when fileSize is within limit or no max limit', () => {
			expect(checkFileSize(100, 200)).to.be.true;
			expect(checkFileSize(50, 50)).to.be.true;
			expect(checkFileSize(500)).to.be.true; // No max limit
		});

		it('should return false when fileSize exceeds maxFileSize', () => {
			expect(checkFileSize(300, 200)).to.be.false;
			expect(checkFileSize(300, 299)).to.be.false;
		});
	});

	describe('generateCallbackData()', () => {
		it('should return a valid JSON string for given type and task', () => {
			const result = generateCallbackData('image', 'upscaleimage');
			expect(result).to.equal(
				JSON.stringify({ type: 'image', task: 'upscaleimage' })
			);
		});

		it('should work with different types and tasks', () => {
			const result = generateCallbackData('pdf', 'watermarkimage');
			expect(result).to.equal(
				JSON.stringify({ type: 'pdf', task: 'watermarkimage' })
			);
		});

		it('should return correct structure when task is null', () => {
			const result = generateCallbackData('doc/image', null);
			expect(result).to.equal(
				JSON.stringify({ type: 'doc/image', task: null })
			);
		});

		it('should return correct structure when type is null', () => {
			const result = generateCallbackData(null, 'removebackgroundimage');
			expect(result).to.equal(
				JSON.stringify({ type: null, task: 'removebackgroundimage' })
			);
		});

		it('should handle both type and task as null', () => {
			const result = generateCallbackData(null, null);
			expect(result).to.equal(JSON.stringify({ type: null, task: null }));
		});

		it('should handle objects as type and task', () => {
			const result = generateCallbackData({ a: 1 }, { b: 2 });
			expect(result).to.equal(
				JSON.stringify({ type: { a: 1 }, task: { b: 2 } })
			);
		});
	});

	describe('generateInlineKeyboard()', () => {
		const defaultOutput = [
			{
				text: 'Bagusin ✨ (20)',
				callback_data: JSON.stringify({ type: 'image', task: 'upscaleimage' })
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
				callback_data: JSON.stringify({ type: 'image', task: 'convertimage' })
			},
			{
				text: 'Kasih Watermark ✍🏻 (2)',
				callback_data: JSON.stringify({ type: 'image', task: 'watermarkimage' })
			}
		];

		it('should return default keyboard when no filters or custom text are provided', () => {
			const result = generateInlineKeyboard('image');
			expect(result).to.deep.equal(defaultOutput);
		});

		it('should filter out specific tools using toolFilter', () => {
			const result = generateInlineKeyboard('image', false, [
				'upscaleimage',
				'convertimage'
			]);
			expect(result).to.deep.equal([
				{
					text: 'Hapus Background 🌄 (10)',
					callback_data: JSON.stringify({
						type: 'image',
						task: 'removebackgroundimage'
					})
				},
				{
					text: 'Kasih Watermark ✍🏻 (2)',
					callback_data: JSON.stringify({
						type: 'image',
						task: 'watermarkimage'
					})
				}
			]);
		});

		it('should replace tool text when toolCustomText is provided', () => {
			const result = generateInlineKeyboard('image', false, [], {
				upscaleimage: 'Enhance 🔥 (50)'
			});
			expect(result).to.deep.equal([
				{
					text: 'Enhance 🔥 (50)',
					callback_data: JSON.stringify({ type: 'image', task: 'upscaleimage' })
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
					callback_data: JSON.stringify({ type: 'image', task: 'convertimage' })
				},
				{
					text: 'Kasih Watermark ✍🏻 (2)',
					callback_data: JSON.stringify({
						type: 'image',
						task: 'watermarkimage'
					})
				}
			]);
		});

		it('should return a mapped result when mapResult is true', () => {
			const result = generateInlineKeyboard('image', true);
			expect(result).to.deep.equal(defaultOutput.map((item) => [item]));
		});

		it('should return an empty array when all tools are filtered out', () => {
			const result = generateInlineKeyboard('image', false, [
				'upscaleimage',
				'removebackgroundimage',
				'convertimage',
				'watermarkimage'
			]);
			expect(result).to.deep.equal([]);
		});

		it('should handle an empty toolFilter gracefully', () => {
			const result = generateInlineKeyboard('image', false, []);
			expect(result).to.deep.equal(defaultOutput);
		});

		it('should handle an empty toolCustomText object gracefully', () => {
			const result = generateInlineKeyboard('image', false, [], {});
			expect(result).to.deep.equal(defaultOutput);
		});

		it('should work when both filtering and custom text are applied', () => {
			const result = generateInlineKeyboard('image', false, ['convertimage'], {
				upscaleimage: 'HD Enhance 🎥 (30)'
			});
			expect(result).to.deep.equal([
				{
					text: 'HD Enhance 🎥 (30)',
					callback_data: JSON.stringify({ type: 'image', task: 'upscaleimage' })
				},
				{
					text: 'Hapus Background 🌄 (10)',
					callback_data: JSON.stringify({
						type: 'image',
						task: 'removebackgroundimage'
					})
				},
				{
					text: 'Kasih Watermark ✍🏻 (2)',
					callback_data: JSON.stringify({
						type: 'image',
						task: 'watermarkimage'
					})
				}
			]);
		});

		it('should return correct structure for non-image fileType', () => {
			const result = generateInlineKeyboard('document');
			expect(result).to.deep.equal([
				{
					text: 'Bagusin ✨ (20)',
					callback_data: JSON.stringify({
						type: 'document',
						task: 'upscaleimage'
					})
				},
				{
					text: 'Hapus Background 🌄 (10)',
					callback_data: JSON.stringify({
						type: 'document',
						task: 'removebackgroundimage'
					})
				},
				{
					text: 'Ubah ke PDF 📝 (10)',
					callback_data: JSON.stringify({
						type: 'document',
						task: 'convertimage'
					})
				},
				{
					text: 'Kasih Watermark ✍🏻 (2)',
					callback_data: JSON.stringify({
						type: 'document',
						task: 'watermarkimage'
					})
				}
			]);
		});
	});
});
