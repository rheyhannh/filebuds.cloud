import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Returns the filename and directory name from the given `import.meta.url`.
 * This utility is helpful for ES module projects to mimic {@link https://nodejs.org/docs/latest/api/modules.html#__filename __filename} and {@link https://nodejs.org/docs/latest/api/globals.html#__dirname __dirname} from CommonJS.
 *
 * @param {string} metaUrl - The `import.meta.url` value from the calling module.
 * @example
 * import { getFilenameAndDirname } from '@utils/paths.js';
 *
 * const { __filename, __dirname } = getFilenameAndDirname(import.meta.url);
 * console.log(__filename); // Outputs the full path of the file
 * console.log(__dirname);  // Outputs the directory path
 */
export const getFilenameAndDirname = (metaUrl) => {
	const x = {
		/** The full path of the current file */
		__filename: fileURLToPath(metaUrl),
		/** The directory of the current file. */
		__dirname: path.dirname(fileURLToPath(metaUrl))
	};

	return x;
};
