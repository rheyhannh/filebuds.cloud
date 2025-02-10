import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import config from '../src/config/env.js';
import {
	checkFileSize,
	checkMimeType,
	generateCallbackData
} from './utils/bot.util.js';

/**
 * Maximum allowed sended file size in bytes.
 * - Default: `5242880` (5MB)
 */
const MAX_FILE_SIZE = 5242880;

async function buildTelegramBot() {
	const {
		TELEGRAF_BOT_TOKEN,
		TELEGRAF_WEBHOOK_DOMAIN,
		TELEGRAF_WEBHOOK_PATH,
		TELEGRAF_WEBHOOK_SECRET_TOKEN,
		IS_PRODUCTION
	} = config;

	if (!TELEGRAF_BOT_TOKEN || typeof TELEGRAF_BOT_TOKEN !== 'string') {
		throw new Error('valid bot token required!');
	}

	if (
		IS_PRODUCTION &&
		(!TELEGRAF_WEBHOOK_DOMAIN || typeof TELEGRAF_WEBHOOK_DOMAIN !== 'string')
	) {
		throw new Error('valid webhook domain required when using local server!');
	}

	console.log(TELEGRAF_BOT_TOKEN);

	const bot = new Telegraf(TELEGRAF_BOT_TOKEN);
	const webhook = IS_PRODUCTION
		? await bot.createWebhook({
				domain: TELEGRAF_WEBHOOK_DOMAIN,
				path: TELEGRAF_WEBHOOK_PATH,
				secret_token: TELEGRAF_WEBHOOK_SECRET_TOKEN
			})
		: undefined;

	bot.command('test', async (ctx) => {
		console.log('from test');
		await ctx.reply('Hello from bot!');
	});

	bot.command('status', async (ctx) => {
		const adminId = 1185191684;
		if (ctx.chat.id === adminId) {
			const webhookInfo = await ctx.telegram.getWebhookInfo();
			console.log(webhookInfo);
		}
	});

	bot.on('callback_query', async (ctx) => {
		try {
			var file_id;
			const { type, task } =
				/** @type {{type:Parameters<typeof generateCallbackData>[0], task:Parameters<typeof generateCallbackData>[1]}} */ (
					JSON.parse(ctx.callbackQuery.data)
				);
			const isDocument = type.split('/')[0] === 'doc';
			const isImage = type.includes('image');

			if (isImage) {
				if (isDocument) {
					file_id = ctx.callbackQuery.message.document.file_id;
				} else {
					const images = ctx.callbackQuery.message.photo;
					const image = images[images.length - 1];
					file_id = image.file_id;
				}
			} else {
				file_id = ctx.callbackQuery.message.document.file_id;
			}

			if (file_id) {
				const fileLink = (await ctx.telegram.getFileLink(file_id)).toString();
				console.log({ type, fileLink, task });
			}
		} catch (error) {
			// *todo: handle error with notify telegram admin
			console.error(error);
			await ctx.reply('Terjadi kesalahan');
		}

		await ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
	});

	bot.on(message('photo'), async (ctx) => {
		try {
			const photos = ctx.message.photo;
			const { file_id } = photos[photos.length - 1];

			await ctx.replyWithPhoto(file_id, {
				caption: 'Mau diapain gambar ini❓',
				protect_content: true,
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: 'Bagusin ✨ (20)',
								callback_data: generateCallbackData('image', 'upscaleimage')
							}
						],
						[
							{
								text: 'Hapus Background 🌄 (10)',
								callback_data: generateCallbackData(
									'image',
									'removebackgroundimage'
								)
							}
						],
						[
							{
								text: 'Ubah ke PDF 📝 (10)',
								callback_data: generateCallbackData('image', 'imagepdf')
							}
						],
						[
							{
								text: 'Kasih Watermark ✍🏻 (2)',
								callback_data: generateCallbackData('image', 'watermarkimage')
							}
						]
					]
				}
			});
		} catch (error) {
			// *todo: handle error with notify telegram admin
			console.error(error);
			await ctx.reply('Terjadi kesalahan');
		}
	});

	bot.on(message('document'), async (ctx) => {
		try {
			const { mime_type, file_size, file_id } = ctx.message.document;
			const { isImage, isPdf } = checkMimeType(mime_type);
			const isFileSizeValid = checkFileSize(file_size, MAX_FILE_SIZE);

			if (isFileSizeValid) {
				if (isImage) {
					await ctx.replyWithDocument(file_id, {
						caption: 'Mau diapain gambar ini❓',
						protect_content: true,
						reply_parameters: {
							message_id: ctx.message.message_id
						},
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: 'Bagusin ✨ (20)',
										callback_data: generateCallbackData(
											'doc/image',
											'upscaleimage'
										)
									}
								],
								[
									{
										text: 'Hapus Background 🌄 (10)',
										callback_data: generateCallbackData(
											'doc/image',
											'removebackgroundimage'
										)
									}
								],
								[
									{
										text: 'Ubah ke PDF 📝 (10)',
										callback_data: generateCallbackData('doc/image', 'imagepdf')
									}
								],
								[
									{
										text: 'Kasih Watermark ✍🏻 (2)',
										callback_data: generateCallbackData(
											'doc/image',
											'watermarkimage'
										)
									}
								]
							]
						}
					});
				} else if (isPdf) {
					await ctx.replyWithDocument(file_id, {
						caption: 'Mau diapain PDF ini❓',
						protect_content: true,
						reply_parameters: {
							message_id: ctx.message.message_id
						},
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: 'Compress 📦 (10)',
										callback_data: generateCallbackData('pdf', 'compress')
									}
								]
							]
						}
					});
				} else {
					await ctx.deleteMessage(ctx.message.message_id);
					await ctx.reply(
						'Format file tidak didukung, pastikan file yang kamu kirimkan adalah gambar (.jpg, .png, .jpeg) atau PDF (.pdf)'
					);
				}
			} else {
				await ctx.deleteMessage(ctx.message.message_id);
				await ctx.reply(
					'Ukuran file terlalu besar, ukuran maksimal yang didukung 5MB'
				);
			}
		} catch (error) {
			// *todo: handle error with notify telegram admin
			console.error(error);
			await ctx.reply('Terjadi kesalahan');
		}
	});

	if (!IS_PRODUCTION) {
		bot.launch({
			dropPendingUpdates: true
		});
	}

	return { bot, webhook };
}

export default buildTelegramBot;
