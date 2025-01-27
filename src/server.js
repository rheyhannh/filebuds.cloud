import 'dotenv/config';
import buildFastify from './app.js';

const server = buildFastify();

server.listen(
	{ port: process.env.PORT || 3000, host: '0.0.0.0' },
	function (err) {
		if (err) {
			server.log.error(err);
			process.exit(1);
		}
	}
);
