import fs from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';
import config from '../config/global.js';
import { getFilenameAndDirname } from './fastify.js';

const { __dirname } = getFilenameAndDirname(import.meta.url);
const { IS_PRODUCTION, IS_TEST } = config;

const logFilePath = resolve(__dirname, '../../logs/app.log');
const logFileStream = IS_TEST
	? undefined
	: fs.createWriteStream(logFilePath, { flags: 'a' });
const prettyStream = pino.transport({
	target: 'pino-pretty',
	options: {
		colorize: true,
		translateTime: 'HH:MM:ss Z',
		ignore: 'pid,hostname,severity'
	}
});

export default pino(
	{
		level: 'trace',
		timestamp: pino.stdTimeFunctions.isoTime,
		formatters: {
			level(label, number) {
				return { severity: label.toUpperCase(), level: number };
			}
		}
	},
	pino.multistream([
		logFileStream ? { level: 'trace', stream: logFileStream } : undefined,
		{ level: IS_PRODUCTION ? 'info' : 'trace', stream: prettyStream }
	])
);
