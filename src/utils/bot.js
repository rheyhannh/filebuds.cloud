import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

/**
 * Checks the MIME type of a file.
 *
 * @param {string | undefined} mimeType The MIME type of the file.
 * @returns {{ isImage: boolean, isPdf: boolean }} An object containing the results of the MIME type checks.
 */
export const checkMimeType = (mimeType) => {
	if (typeof mimeType !== 'string') {
		return { isImage: false, isPdf: false };
	}

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
	if (!Number.isInteger(fileSize) || fileSize < 0) {
		throw new Error('File size must be a non-negative integer');
	}

	if (!Number.isInteger(maxFileSize) || maxFileSize < 0) {
		throw new Error('Maximum file size must be a non-negative integer');
	}

	return maxFileSize === 0 || fileSize <= maxFileSize;
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

/**
 * Generate inline keyboard markup that include button with text and callback data.
 * Its allow user to select tool to perform on uploaded file.
 * @param {TelegramBotTypes.FileTypeEnum} fileType Uploaded file mime type, see {@link TelegramBotTypes.FileTypeEnum file type}.
 * @param {boolean} [mapResult] Whether to map the result, default is `false`.
 * @param {Array<ILoveApiTypes.ToolEnum>} [toolFilter] Array containing tools name to filter, default is `[]`.
 * @param {Record<ILoveApiTypes.ToolEnum, string>} [toolCustomText] Custom text for each tool, default is `{}`.
 */
export const generateInlineKeyboard = (
	fileType,
	mapResult = false,
	toolFilter = [],
	toolCustomText = {}
) => {
	const general = {
		upscaleimage: toolCustomText?.upscaleimage || 'Bagusin ✨ (20)',
		removebackgroundimage:
			toolCustomText?.removebackgroundimage || 'Hapus Background 🌄 (10)',
		convertimage: toolCustomText?.convertimage || 'Ubah ke PDF 📝 (10)',
		watermarkimage: toolCustomText?.watermarkimage || 'Kasih Watermark ✍🏻 (2)'
	};

	const filtered = Object.entries(general)
		.filter(([key]) => !toolFilter.includes(key))
		.map(([key, val]) => ({
			text: val,
			callback_data: JSON.stringify({ type: fileType, task: key })
		}));

	return mapResult ? filtered.map((item) => [item]) : filtered;
};
