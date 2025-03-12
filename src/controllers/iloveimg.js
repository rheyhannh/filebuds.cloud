import * as _Service from '../services/iloveimg.js';
import * as _Util from '../utils/iloveapi.js';

const Service = _Service.default;
const Util = _Util.default;

/**
 * Processes an image to remove its background and returns the operation status.
 * This function performs the following steps:
 * 1. Extracts the original file details (name, extension) from the given image URL.
 * 2. Generates a unique output file name based on the `userId` and the original file extension.
 * 3. Calls the `Service.removeBackgroundImage` method to remove the background.
 *
 * If any step fails, it throws an `Error` with corresponding error message.
 * Otherwise, it returns object indicating operation are success.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting background removal.
 * @param {string} imageUrl Public URL of the image to process.
 * @throws {Error} If any step fails.
 * @returns {_Service.ServiceReturnType} Object indicating operation are success.
 */
export const removeBackgroundImage = async (jobId, userId, imageUrl) => {
	// Extract original file information from the provided image URL.
	if (
		typeof jobId !== 'string' ||
		typeof userId !== 'number' ||
		typeof imageUrl !== 'string'
	)
		throw new Error('Missing required parameters.');

	const originalFileDetails = Util.getOriginalFileInformationFromURL(imageUrl);
	if (!originalFileDetails) {
		throw new Error('Failed to resolve original file details.');
	}

	// Generate output file details based on the user ID and file extension.
	const outputFileDetails = Util.getOutputFileInformation(
		userId,
		originalFileDetails.extension
	);
	if (!outputFileDetails) {
		throw new Error('Failed to resolve output file details.');
	}

	const fileDetails = {
		original: originalFileDetails,
		output: outputFileDetails
	};

	// Call the service function to remove the background.
	return await Service.removeBackgroundImage(
		jobId,
		userId,
		imageUrl,
		fileDetails
	);
};

/**
 * Processes an image to upscale its quality and returns the operation status.
 * This function performs the following steps:
 * 1. Extracts the original file details (name, extension) from the given image URL.
 * 2. Generates a unique output file name based on the `userId` and the original file extension.
 * 3. Calls the `Service.upscaleImage` method to upscale its quality.
 *
 * If any step fails, it throws an `Error` with corresponding error message.
 * Otherwise, it returns object indicating operation are success.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting upscale image.
 * @param {string} imageUrl Public URL of the image to process.
 * @throws {Error} If any step fails.
 * @returns {_Service.ServiceReturnType} Object indicating operation are success.
 */
export const upscaleImage = async (jobId, userId, imageUrl) => {
	// Extract original file information from the provided image URL.
	if (
		typeof jobId !== 'string' ||
		typeof userId !== 'number' ||
		typeof imageUrl !== 'string'
	)
		throw new Error('Missing required parameters.');

	const originalFileDetails = Util.getOriginalFileInformationFromURL(imageUrl);
	if (!originalFileDetails) {
		throw new Error('Failed to resolve original file details.');
	}

	// Generate output file details based on the user ID and file extension.
	const outputFileDetails = Util.getOutputFileInformation(
		userId,
		originalFileDetails.extension
	);
	if (!outputFileDetails) {
		throw new Error('Failed to resolve output file details.');
	}

	const fileDetails = {
		original: originalFileDetails,
		output: outputFileDetails
	};

	// Call the service function to remove the background.
	return await Service.upscaleImage(jobId, userId, imageUrl, fileDetails);
};
