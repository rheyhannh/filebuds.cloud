import config from '../config/global.js';
import { Task } from '@rheyhannh/iloveimg-nodejs';

const { ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY, ILOVEIMG_SELF_JWT_ISS } =
	config;

/**
 * Retrieves task details from the `ILoveIMG` and `ILovePDF` API.
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

/**
 * Downloads processed files from the `ILoveIMG` and `ILovePDF` API.
 * @param {string} taskId Unique identifier of the task.
 * @param {string} taskServer Assigned server to the task.
 * @throws {Error} Throws an error if the request fails.
 * @returns A promise that resolve to an `AxiosResponse` containing processed file stream.
 */
const getProcessedFiles = async (taskId, taskServer) => {
	const task = new Task(
		ILOVEAPI_PUBLIC_KEY,
		ILOVEAPI_SECRET_KEY,
		taskId,
		taskServer,
		{ iss: ILOVEIMG_SELF_JWT_ISS }
	);

	return await task.download();
};

export default {
	getTaskDetails,
	getProcessedFiles
};
