import config from '../config/global.js';
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const { ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY } = config;
const ilovepdf = new ILovePDFApi(ILOVEAPI_PUBLIC_KEY, ILOVEAPI_SECRET_KEY);

/**
 * Processes an image to PDF converter using the ILovePDF API.
 * This function interacts with the ILovePDF API to convert an image to a PDF.
 * It performs the following steps:
 * 1. Creates a new `imagepdf` task.
 * 2. Starts the task.
 * 3. Uploads the image file from a public URL.
 * 4. Processes the file with the specified output filename and user-specific metadata.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting image to PDF conversion.
 * @param {string} imageUrl Public URL of the image to be processed.
 * @param {ILoveApiTypes.FileInformationProps} fileDetails Object containing file metadata, including original and output filenames.
 * @throws {Error} Throws an error if any step in the image conversion process fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolving to an object containing the server, task id, and uploaded files.
 */
const imageToPdf = async (jobId, userId, imageUrl, fileDetails) => {
	const taskI = ilovepdf.newTask('imagepdf');
	const task_id = await taskI.start();
	const { serverFilename, filename } = await taskI.addFile(imageUrl);
	await taskI.process({
		output_filename: fileDetails.output.name,
		custom_int: userId,
		custom_string: jobId,
		webhook: ''
	});

	return {
		server: null,
		task_id,
		files: [{ server_filename: serverFilename, filename }]
	};
};

/**
 * Processes an PDF merge using the ILovePDF API.
 * This function interacts with the ILovePDF API to merge multiple PDFs into a single PDF.
 * It performs the following steps:
 * 1. Creates a new `merge` task.
 * 2. Starts the task.
 * 3. Uploads the PDF files from a public URL.
 * 4. Processes the files with the specified output filename and user-specific metadata.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting PDF merge.
 * @param {Array<string>} filesUrl Array of public URL of the PDF files to be processed.
 * @param {{original:Array<ILoveApiTypes.FileInformationProps['original']>, output:ILoveApiTypes.FileInformationProps['output']}} fileDetails Object containing file metadata, including original and output filenames.
 * @throws {Error} Throws an error if any step in the PDF merge process fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolving to an object containing the server, task id, and uploaded files.
 */
const mergePdf = async (jobId, userId, filesUrl, fileDetails) => {
	const taskI = ilovepdf.newTask('merge');
	const task_id = await taskI.start();
	const files = [];
	// Sequentially upload files to ensure files order.
	for (const fileUrl of filesUrl) {
		const { filename, serverFilename } = await taskI.addFile(fileUrl);
		files.push({ filename, server_filename: serverFilename });
	}
	await taskI.process({
		output_filename: fileDetails.output.name,
		custom_int: userId,
		custom_string: jobId,
		webhook: ''
	});

	return {
		server: null,
		task_id,
		files
	};
};

/**
 * Processes an PDF compression using the ILovePDF API.
 * This function interacts with the ILovePDF API to compress PDF file.
 * It performs the following steps:
 * 1. Creates a new `compress` task.
 * 2. Starts the task.
 * 3. Uploads the PDF file from a public URL.
 * 4. Processes the file with the specified output filename and user-specific metadata.
 *
 * @param {string} jobId Job identifier.
 * @param {number} userId Unique identifier of the user requesting PDF compression.
 * @param {string} fileUrl Public URL of the PDF file to be processed.
 * @param {ILoveApiTypes.FileInformationProps} fileDetails Object containing file metadata, including original and output filenames.
 * @throws {Error} Throws an error if any step in the PDF compression process fails.
 * @returns {Promise<ILoveApiTypes.TaskCreationResult>} Resolving to an object containing the server, task id, and uploaded files.
 */
const compressPdf = async (jobId, userId, fileUrl, fileDetails) => {
	const taskI = ilovepdf.newTask('compress');
	const task_id = await taskI.start();
	const { serverFilename, filename } = await taskI.addFile(fileUrl);
	await taskI.process({
		output_filename: fileDetails.output.name,
		custom_int: userId,
		custom_string: jobId,
		webhook: ''
	});

	return {
		server: null,
		task_id,
		files: [{ server_filename: serverFilename, filename }]
	};
};

export default {
	imageToPdf,
	mergePdf,
	compressPdf
};
