import fs from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';
import config from '../config/global.js';
import { getFilenameAndDirname } from './fastify.js';

const { __dirname } = getFilenameAndDirname(import.meta.url);
const { IS_PRODUCTION, IS_DEV, LOGTAIL_URL, LOGTAIL_TOKEN } = config;

const filePath = resolve(__dirname, '../../logs/app.log');
const fileTransport = IS_DEV
	? fs.createWriteStream(filePath, { flags: 'a' })
	: undefined;

const logtailTransport =
	IS_PRODUCTION && LOGTAIL_URL && LOGTAIL_TOKEN
		? pino.transport({
				target: '@logtail/pino',
				options: {
					sourceToken: LOGTAIL_TOKEN,
					options: { endpoint: LOGTAIL_URL }
				}
			})
		: undefined;

const prettyTransport = pino.transport({
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
		fileTransport ? { level: 'trace', stream: fileTransport } : undefined,
		logtailTransport ? { level: 'trace', stream: logtailTransport } : undefined,
		{ level: IS_PRODUCTION ? 'info' : 'trace', stream: prettyTransport }
	])
);
