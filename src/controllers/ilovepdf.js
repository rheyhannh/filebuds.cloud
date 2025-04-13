import * as _Service from '../services/ilovepdf.js';
import * as _Util from '../utils/iloveapi.js';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const Service = _Service.default;
const Util = _Util.default;

/**
 * Processes an image to PDF conversion and returns the operation status.
 * This function performs the following steps:
 * 1. Extracts the original file details (name, extension) from the given image URL.
 * 2. Generates `fileDetails` object to determine original and output file information.
 * 3. Calls the `Service.imageToPDF` method to convert image file to PDF.
 *
 * If any step fails, it throws an `Error` with corresponding error message.
 * Otherwise, it returns object indicating operation are success.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting image to PDF conversion.
 * @param {string} imageUrl Public URL of the image to process.
 * @throws {Error} If any step fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolve an object indicating operation are success.
 */
export const imageToPDF = async (jobId, userId, imageUrl) => {
	if (
		typeof jobId !== 'string' ||
		typeof userId !== 'number' ||
		typeof imageUrl !== 'string'
	)
		throw new Error('Missing required parameters.');

	// Extract original file information from the provided image URL.
	const originalFileDetails = Util.getOriginalFileInformationFromURL(imageUrl);
	if (!originalFileDetails) {
		throw new Error('Failed to resolve original file details.');
	}

	const fileDetails = /** @type {ILoveApiTypes.FileInformationProps} */ ({
		original: originalFileDetails,
		output: {
			name: jobId,
			extension: originalFileDetails.extension,
			filename: jobId + '.' + originalFileDetails.extension
		}
	});

	// Call the service function to convert image file to PDF.
	return await Service.imageToPDF(jobId, userId, imageUrl, fileDetails);
};
