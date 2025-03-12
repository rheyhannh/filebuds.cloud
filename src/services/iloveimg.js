import config from '../config/global.js';
import ILoveIMGApi, { Task } from '@rheyhannh/iloveimg-nodejs';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const { ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY, ILOVEIMG_SELF_JWT_ISS } =
	config;

const iloveimg = new ILoveIMGApi(ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY, {
	iss: ILOVEIMG_SELF_JWT_ISS
});

/**
 * @typedef {Object} ServiceReturnType
 * @property {string} server
 * Assigned `ILoveApi` server.
 * - Ex: `api8g.iloveimg.com`
 * @property {string} task_id
 * Assigned task id from `ILoveApi` server.
 * @property {Array<{server_filename:string, filename:string}>} files
 * Uploaded files for this task.
 */

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
 * @returns {Promise<ServiceReturnType>} Resolving to an object containing the server, task id, and uploaded files.
 */
const removeBackgroundImage = async (jobId, userId, imageUrl, fileDetails) => {
	const taskI = iloveimg.newTask('removebackgroundimage');
	const { server, task_id } = await taskI.start();
	await taskI.addFile({
		cloud_file: imageUrl,
		filename: fileDetails.original.filename
	});
	await taskI.process({
		output_filename: fileDetails.output.filename,
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
 * @returns {Promise<ServiceReturnType>} Resolving to an object containing the server, task id, and uploaded files.
 */
const upscaleImage = async (jobId, userId, imageUrl, fileDetails) => {
	const taskI = iloveimg.newTask('upscaleimage');
	const { server, task_id } = await taskI.start();
	await taskI.addFile({
		cloud_file: imageUrl,
		filename: fileDetails.original.filename
	});
	await taskI.process(
		{
			output_filename: fileDetails.output.filename,
			custom_int: userId,
			custom_string: jobId,
			webhook: ''
		},
		{ multiplier: 4 }
	);

	return { server, task_id, files: taskI.getUploadedFiles() };
};

/**
 * Downloads processed files from the ILoveIMG API.
 * @param {string} taskId Unique identifier of the task.
 * @param {string} taskServer Assigned server to the task.
 * @throws {Error} Throws an error if the request fails.
 * @returns A promise that resolve to an `AxiosResponse` containing processed file stream.
 */
const downloadResult = async (taskId, taskServer) => {
	const task = new Task(
		ILOVEAPI_PUBLIC_KEY,
		ILOVEAPI_SECRET_KEY,
		taskId,
		taskServer,
		{ iss: ILOVEIMG_SELF_JWT_ISS }
	);

	return await task.download();
};

/**
 * Retrieves task details from the ILoveIMG API.
 * @param {string} taskId Unique identifier of the task.
 * @param {string} taskServer Assigned server to the task.
 * @throws {Error} Throws an error if the request fails.
 * @returns A promise that resolve an object containing task details.
 */
const getTaskDetails = async (taskId, taskServer) => {
	const task = new Task(
		ILOVEAPI_PUBLIC_KEY,
		ILOVEAPI_SECRET_KEY,
		taskId,
		taskServer,
		{ iss: ILOVEIMG_SELF_JWT_ISS }
	);

	return await task.details();
};

export default {
	removeBackgroundImage,
	upscaleImage,
	downloadResult,
	getTaskDetails
};
