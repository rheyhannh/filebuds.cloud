/**
 * Encapsulates the `/iloveapi/*` routes
 * @param {import('fastify').FastifyInstance} fastify
 * Fastify instance
 * @param {Object} options
 * Plugin options, refer to {@link https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options plugin options}
 */
async function routes(fastify) {
	fastify.post('/iloveapi', async (request, reply) => {
		// *todo: Handle iloveapi webhook
		// Check are origin from iloveimg or ilovepdf api?
		// if false, return 403 status code.
		// if true, check are task.completed or task.fail
		// [task.fail case]
		// (bot) send: 'Duh ada yang salah diserver kita! Tapi tenang aja pulsa kamu engga berkurang. Coba lagi deh sekarang. Kalau masih gagal, tunggu sebentar dan coba lagi nanti.'
		// (redis) add user & server credit back.
		// [task.completed case]
		// pdf-compress (bot) send: 'Mau diapain lagi PDF ini❓' inlineQuery: [[], [share, download, forward]]
		// image-upscale (bot) send: 'Mau diapain lagi gambar ini❓' inlineQuery: [[removebg, convertimage, watermark], [share, download, forward]]

		return reply.code(200).send({ ok: true });
	});
}

export default routes;
