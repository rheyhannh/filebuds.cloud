import config from '../config/global.js';
import ILoveIMGApi from '@rheyhannh/iloveimg-nodejs';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const { ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY, ILOVEIMG_SELF_JWT_ISS } =
	config;

const iloveimg = new ILoveIMGApi(ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY, {
	iss: ILOVEIMG_SELF_JWT_ISS
});

/**
 * Processes an image to remove its background using the ILoveIMG API.
 * This function interacts with the ILoveIMG API to remove the background from an image.
 * It performs the following steps:
 * 1. Creates a new `removebackgroundimage` task.
 * 2. Starts the task.
 * 3. Uploads the image file from a public URL.
 * 4. Processes the file with the specified output filename and user-specific metadata.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting background removal.
 * @param {string} imageUrl Public URL of the image to be processed.
 * @param {ILoveApiTypes.FileInformationProps} fileDetails Object containing file metadata, including original and output filenames.
 * @throws {Error} Throws an error if any step in the background removal process fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolving to an object containing the server, task id, and uploaded files.
 */
const removeBackgroundImage = async (jobId, userId, imageUrl, fileDetails) => {
	const taskI = iloveimg.newTask('removebackgroundimage');
	const { server, task_id } = await taskI.start();
	await taskI.addFile({
		cloud_file: imageUrl,
		filename: fileDetails.output.filename
	});
	await taskI.process({
		output_filename: fileDetails.output.name,
		custom_int: userId,
		custom_string: jobId,
		webhook: ''
	});

	return { server, task_id, files: taskI.getUploadedFiles() };
};

/**
 * Processes an image to upscale its quality using the ILoveIMG API.
 * This function interacts with the ILoveIMG API to upscale the quality from an image.
 * It performs the following steps:
 * 1. Creates a new `upscaleimage` task.
 * 2. Starts the task.
 * 3. Uploads the image file from a public URL.
 * 4. Processes the file with the specified output filename and user-specific metadata.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting upscale image.
 * @param {string} imageUrl Public URL of the image to be processed.
 * @param {ILoveApiTypes.FileInformationProps} fileDetails Object containing file metadata, including original and output filenames.
 * @throws {Error} Throws an error if any step in the upscale image process fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolving to an object containing the server, task id, and uploaded files.
 */
const upscaleImage = async (jobId, userId, imageUrl, fileDetails) => {
	const taskI = iloveimg.newTask('upscaleimage');
	const { server, task_id } = await taskI.start();
	await taskI.addFile({
		cloud_file: imageUrl,
		filename: fileDetails.output.filename
	});
	await taskI.process(
		{
			output_filename: fileDetails.output.name,
			custom_int: userId,
			custom_string: jobId,
			webhook: ''
		},
		{ multiplier: 4 }
	);

	return { server, task_id, files: taskI.getUploadedFiles() };
};

export default {
	removeBackgroundImage,
	upscaleImage
};
