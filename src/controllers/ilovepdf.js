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
 * 3. Calls the `Service.imageToPdf` method to convert image file to PDF.
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
export const imageToPdf = async (jobId, userId, imageUrl) => {
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
			extension: 'pdf',
			filename: jobId + '.pdf'
		}
	});

	// Call the service function to convert image file to PDF.
	return await Service.imageToPdf(jobId, userId, imageUrl, fileDetails);
};

/**
 * Processes an PDF merge and returns the operation status.
 * This function performs the following steps:
 * 1. Extracts the original file details (name, extension) from the given files URL.
 * 2. Generates `fileDetails` object to determine original and output files information.
 * 3. Calls the `Service.mergePdf` method to merge PDF files.
 *
 * If any step fails, it throws an `Error` with corresponding error message.
 * Otherwise, it returns object indicating operation are success.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting PDF merge.
 * @param {Array<string>} filesUrl Array of public URL of PDF files to process.
 * @throws {Error} If any step fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolve an object indicating operation are success.
 */
export const mergePdf = async (jobId, userId, filesUrl) => {
	if (
		typeof jobId !== 'string' ||
		typeof userId !== 'number' ||
		!Array.isArray(filesUrl) ||
		filesUrl.length < 2
	)
		throw new Error('Missing required parameters.');

	// Extract original file information from the provided file URL.
	const originalFileDetails = filesUrl.map((fileUrl) =>
		Util.getOriginalFileInformationFromURL(fileUrl)
	);
	if (
		!originalFileDetails ||
		!Array.isArray(originalFileDetails) ||
		originalFileDetails.some((x) => !x)
	) {
		throw new Error('Failed to resolve original file details.');
	}

	const fileDetails =
		/** @type {{original:Array<ILoveApiTypes.FileInformationProps['original']>, output:ILoveApiTypes.FileInformationProps['output']}} */ ({
			original: originalFileDetails,
			output: {
				name: jobId,
				extension: 'pdf',
				filename: jobId + '.pdf'
			}
		});

	// Call the service function to merge PDFs.
	return await Service.mergePdf(jobId, userId, filesUrl, fileDetails);
};
