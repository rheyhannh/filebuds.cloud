import { z } from 'zod';

/**
 * @typedef {z.infer<typeof FileStatus>} FileStatusInfered
 */
export const FileStatus = z.enum([
	'FileSuccess',
	'FileWaiting',
	'WrongPassword',
	'TimeOut',
	'ServerFileNotFound',
	'DamagedFile',
	'NoImages',
	'OutOfRange',
	'NonConformant',
	'UnknownError'
]);
