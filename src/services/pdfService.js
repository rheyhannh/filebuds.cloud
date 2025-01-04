import path from 'path';
import { getFilenameAndDirname } from '../utils/paths.js';

import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile.js';

const { __dirname } = getFilenameAndDirname(import.meta.url);
const exampleImg = new ILovePDFFile(path.join(__dirname, '../public/test.jpg'));

const ilovepdf = new ILovePDFApi(
    process.env.ILOVEAPI_PUBLIC_KEY || '',
    process.env.ILOVEAPI_SECRET_KEY || ''
);

/**
 * Service handler for converting image to PDF using {@link ILovePDFApi}
 * @param {string} imageUrl An public URL image
 */
export const imageToPdf = async (imageUrl) => {
    try {
        const task = ilovepdf.newTask('imagepdf');
        await task.start();
        await task.addFile(exampleImg);
        await task.process();

        const result = await task.download();
        return result;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to convert image to PDF');
    }
}