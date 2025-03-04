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
 * Generate callback data as a JSON string to determine service worker.
 * @param {'doc/image' | 'image' | 'pdf'} type
 * The type of file (image or pdf)
 * @param {'upscaleimage' | 'removebackgroundimage' | 'imagepdf' | 'watermarkimage' | 'compress'} task
 * The type of task to perform
 * @returns {string} The callback data as a JSON string
 */
export const generateCallbackData = (type, task) => {
	const callbackData = { type, task };
	return JSON.stringify(callbackData);
};
