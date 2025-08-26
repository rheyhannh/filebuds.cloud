import { Worker } from 'bullmq';
import config from '../config/global.js';
import redisClient from '../config/redis.js';
import { bot } from '../bot.js';
import logger from '../utils/logger.js';
import * as _ILoveAPIService from '../services/iloveapi.js';
import * as _SupabaseService from '../services/supabase.js';
import * as _BotUtils from '../utils/bot.js';
import * as DownloaderQueueTypes from '../queues/downloader.js'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const { IS_PRODUCTION } = config;

const ILoveAPIService = _ILoveAPIService.default;
const SupabaseService = _SupabaseService.default;
const BotUtils = _BotUtils.default;

/**
 * BullMQ worker instances for processing `Downloader`.
 * In order to keep running tests in CI/CD environment, worker are not created or equal to `null` when in `test` environment.
 */
const downloaderWorker =
	/** @type {Worker<DownloaderQueueTypes.DownloaderJobPayload, undefined, ILoveApiTypes.CallbackEventEnum> | null} */ (
		redisClient
			? new Worker(
					'downloaderQueue',
					async (job) => {
						const {
							tool,
							task: taskId,
							server: taskServer,
							custom_int: telegramUserId
						} = job.data.data.task;

						if (job?.name !== 'task.completed') {
							throw new Error(
								'Received uncompleted task result from ILoveAPI server.'
							);
						}

						// Download processed files.
						const { data: fileStream } =
							await ILoveAPIService.getProcessedFiles(
								taskId,
								taskServer.replace(/\\/g, '')
							);

						// Adjust caption and inline keyboard message by used tool type.
						const fileType = BotUtils.getOutputFileTypeFromTool(tool);
						const caption = fileType
							? 'File berhasil diproses, mau diapain lagi file ini❓' +
								`\n\nID: ${job.id}` +
								`\n\n🚧 Opsi dibawah bisa digunakan sampai 1 hari kedepan.`
							: 'File berhasil diproses.' + `\n\nID: ${job.id}`;
						const inline_keyboard = BotUtils.generateInlineKeyboard(
							fileType === 'image' ? 'doc/image' : fileType,
							true,
							['merge']
						);

						// Forwards the downloaded files to the user's Telegram chat.
						await bot.telegram.sendDocument(
							telegramUserId,
							{
								source: fileStream,
								filename: job.data.data.task.download_filename
							},
							{ caption, reply_markup: { inline_keyboard } }
						);
					},
					{
						connection: redisClient,
						concurrency: IS_PRODUCTION ? 10 : 2,
						lockDuration: 40000,
						lockRenewTime: 20000,
						stalledInterval: 60000
					}
				)
			: null
	);

if (downloaderWorker) {
	downloaderWorker.on('completed', async (job) => {
		await SupabaseService.updateWorkerJobLog(
			'downloader.completed',
			{ job_id: job.id, tg_user_id: job.data.data.task.custom_int },
			true,
			job.data,
			null,
			{
				created_at: job.timestamp,
				processed_at: job.processedOn,
				finished_at: job.finishedOn,
				ats: job.attemptsStarted,
				atm: job.attemptsMade,
				delay: job.delay,
				priority: job.priority
			}
		);
	});

	downloaderWorker.on('failed', async (job) => {
		// TODO: Refund shared credits.
		const { ok } = await SupabaseService.updateWorkerJobLog(
			'downloader.failed',
			{ job_id: job.id, tg_user_id: job.data.data.task.custom_int },
			true,
			null,
			{
				failed_reason: job.failedReason,
				stacktrace: job.stacktrace
			},
			{
				created_at: job.timestamp,
				processed_at: job.processedOn,
				finished_at: job.finishedOn,
				ats: job.attemptsStarted,
				atm: job.attemptsMade,
				delay: job.delay,
				priority: job.priority
			}
		);

		if (!ok) {
			await bot.telegram
				.sendMessage(
					job.data.data.task.custom_int,
					'Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.' +
						`\n\nID: ${job.id}`
				)
				.catch((error) => {
					logger.error(
						error,
						'Failed to notify Telegram user after Supabase failed to update job log in downloader worker failed state'
					);
				});
		}
	});
}
