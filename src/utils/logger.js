import pino from 'pino';

// TODO: Find way to store logs in files.
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
	pino.multistream([{ level: 'trace', stream: prettyStream }])
);
