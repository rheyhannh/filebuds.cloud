import { Worker } from 'bullmq';
import config from '../config/global.js';
import redisClient from '../config/redis.js';
import { bot } from '../bot.js';
import logger from '../utils/logger.js';
import * as ILoveIMGController from '../controllers/iloveimg.js';
import * as ILovePDFController from '../controllers/ilovepdf.js';
import * as _SupabaseService from '../services/supabase.js';
import * as TaskQueueTypes from '../queues/task.js'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line

const { IS_PRODUCTION } = config;

const SupabaseService = _SupabaseService.default;

/**
 * BullMQ worker instances for processing `Task`.
 * In order to keep running tests in CI/CD environment, worker are not created or equal to `null` when in `test` environment.
 */
const taskWorker =
	/** @type {Worker<TaskQueueTypes.TaskJobPayload, ILoveApiTypes.TaskCreationResult, ILoveApiTypes.ToolEnum> | null} */ (
		redisClient
			? new Worker(
					'taskQueue',
					async (job) => {
						const { userId, telegramUserId, tool, fileLink } = job.data;

						if (tool === 'upscaleimage') {
							return await ILoveIMGController.upscaleImage(
								job.id,
								userId || telegramUserId,
								fileLink
							);
						} else if (tool === 'removebackgroundimage') {
							return await ILoveIMGController.removeBackgroundImage(
								job.id,
								userId || telegramUserId,
								fileLink
							);
						} else if (tool === 'imagepdf') {
							return await ILovePDFController.imageToPdf(
								job.id,
								userId || telegramUserId,
								fileLink
							);
						} else if (tool === 'merge') {
							return await ILovePDFController.mergePdf(
								job.id,
								userId || telegramUserId,
								fileLink
							);
						} else if (tool === 'compress') {
							return await ILovePDFController.compressPdf(
								job.id,
								userId || telegramUserId,
								fileLink
							);
						} else {
							throw new Error('Unsupported tool.');
						}
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

if (taskWorker) {
	taskWorker.on('completed', async (job) => {
		const { ok } = await SupabaseService.addJobLog(
			'task.completed',
			job.id,
			job.data?.userId,
			job.data?.telegramUserId,
			false,
			job.name,
			job.data.toolPrice,
			job.data?.toolOptions,
			job.data.paymentMethod,
			{ file_type: job.data.fileType, file_link: job.data.fileLink },
			job.returnvalue,
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

		if (!ok) {
			if (typeof job.data?.telegramUserId === 'number') {
				await bot.telegram
					.sendMessage(
						job.data.telegramUserId,
						'Permintaanmu sedang diproses walaupun sepertinya ada yang salah diserver Filebuds sehingga resi tidak dapat diperbarui.' +
							'\nTapi tenang aja, Filebuds akan segera kirim hasilnya, Mohon ditunggu.' +
							`\n\nID: ${job.id}`
					)
					.catch((error) => {
						logger.error(
							error,
							'Failed to notify Telegram user after Supabase failed to add job log in task worker completed state'
						);
					});
			}
		}
	});

	taskWorker.on('failed', async (job) => {
		// TODO: Refund shared credits.
		const { ok } = await SupabaseService.addJobLog(
			'task.failed',
			job.id,
			job.data?.userId,
			job.data?.telegramUserId,
			true,
			job.name,
			job.data.toolPrice,
			job.data?.toolOptions,
			job.data.paymentMethod,
			{ file_type: job.data.fileType, file_link: job.data.fileLink },
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
			if (typeof job.data?.telegramUserId === 'number') {
				await bot.telegram
					.sendMessage(
						job.data.telegramUserId,
						'Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.' +
							`\n\nID: ${job.id}`
					)
					.catch((error) => {
						logger.error(
							error,
							'Failed to notify Telegram user after Supabase failed to add job log in task worker failed state'
						);
					});
			}
		}
	});
}
