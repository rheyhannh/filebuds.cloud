import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

/**
 * Checks the MIME type of a file.
 *
 * @param {string | undefined} mimeType The MIME type of the file.
 * @returns {{ isImage: boolean, isPdf: boolean }} An object containing the results of the MIME type checks.
 */
export const checkMimeType = (mimeType) => {
	const validImageTypes = ['image/jpeg', 'image/png'];
	const validPdfType = 'application/pdf';

	return {
		isImage: validImageTypes.includes(mimeType?.toLowerCase()),
		isPdf: mimeType === validPdfType
	};
};

/**
 * Checks if a file size is within the allowed limit.
 *
 * @param {number} fileSize The size of the file in bytes.
 * @param {number} [maxFileSize=0] The maximum allowed file size in bytes.
 * @returns {boolean} Whether the file size is less than or equal to the maximum allowed file size.
 * @throws {Error} If fileSize or maxFileSize is not a non-negative integer.
 */
export const checkFileSize = (fileSize, maxFileSize = 0) => {
	// Check if fileSize is a non-negative integer
	if (typeof fileSize !== 'number' || fileSize < 0 || fileSize % 1 !== 0) {
		throw new Error('File size must be a non-negative integer');
	}

	// Check if maxFileSize is a non-negative integer
	if (
		typeof maxFileSize !== 'number' ||
		maxFileSize < 0 ||
		maxFileSize % 1 !== 0
	) {
		throw new Error('Maximum file size must be a non-negative integer');
	}

	if (maxFileSize === 0) return true;
	return fileSize <= maxFileSize;
};

/**
 * Generate inline keyboard button callback data as a JSON string to determine tool type to perform.
 * @param {TelegramBotTypes.FileTypeEnum} type Uploaded file mime type, see {@link TelegramBotTypes.FileTypeEnum file type}.
 * @param {'upscaleimage' | 'removebackgroundimage' | 'imagepdf' | 'watermarkimage' | 'compress'} task Task tool to perform.
 * @returns {string} Callback data as a JSON string
 */
export const generateCallbackData = (type, task) => {
	const callbackData = { type, task };
	return JSON.stringify(callbackData);
};
