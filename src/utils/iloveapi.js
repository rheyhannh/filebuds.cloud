import { createHash } from 'node:crypto';
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

/**
 * Generates an output filename with a unique identifier using SHA-1 hashing.
 * This function constructs a unique file identifier by hashing a combination of:
 * - The provided `id` (which could be a user ID or any unique reference).
 * - The specified file `extension`.
 * - The current Unix timestamp (in seconds) to ensure uniqueness over time.
 *
 * @param {string | number} id Identifier that can be a user ID or another unique value.
 * @param {string} extension File extension (without the dot).
 * @returns {ILoveApiTypes.FileInformationProps['output'] | null} Generated output file information, or `null` if an error occurs.
 * @example
 * ```js
 * console.log(getOutputFileInformation(185150, 'jpg'));
 * // Output: { name: 'sha1hash', extension: 'jpg', filename: 'sha1hash.jpg' }
 * ```
 */
export const getOutputFileInformation = (id, extension) => {
	try {
		const unixTimestamp = Math.floor(Date.now() / 1000);
		const dataToHash = `${id}-${extension}-${unixTimestamp}`;
		const name = createHash('sha1').update(dataToHash).digest('hex');
		const filename = `${name}.${extension}`;

		return { name, extension, filename };
	} catch {
		return null;
	}
};

/**
 * Extracts the filename, name, and extension from an public file URL.
 * @param {string | URL} url Public file URL.
 * @returns {ILoveApiTypes.FileInformationProps['original'] | null} Original file information, or `null` if an error occurs.
 * @example
 * ```js
 * let url = 'https://api.telegram.org/others/lorem.pdf';
 * console.log(getOriginalFileInformationFromURL(url));
 * // Output: { name: 'lorem', extension: 'pdf', filename: 'lorem.pdf' }
 *
 * let noExtension = 'https://api.telegram.org/others/ipsum';
 * console.log(getOriginalFileInformationFromURL(noExtension));
 * // Output: null (no extension found)
 *
 * let invalidUrl = 'api.telegram.org/invalid_url';
 * console.log(getOriginalFileInformationFromURL(invalidUrl));
 * // Output: null (invalid URL)
 *
 * ```
 */
export const getOriginalFileInformationFromURL = (url) => {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;
		const parts = pathname.split('/');
		const filename = parts.pop();

		if (!filename.includes('.')) return null; // No extension found

		const lastDotIndex = filename.lastIndexOf('.');
		const name = filename.substring(0, lastDotIndex);
		const extension = filename.substring(lastDotIndex + 1);

		return { name, extension, filename };
	} catch {
		return null; // Invalid URL
	}
};
