import * as TelegramBotTypes from '../schemas/bot.js'; // eslint-disable-line
import * as ILoveApiTypes from '../schemas/iloveapi.js'; // eslint-disable-line
import * as SupabaseTypes from '../schemas/supabase.js'; // eslint-disable-line
import * as TelegrafTypes from 'telegraf'; // eslint-disable-line

/**
 * Checks the MIME type of a file.
 *
 * @param {string | undefined} mimeType The MIME type of the file.
 * @returns {{ isImage: boolean, isPdf: boolean }} An object containing the results of the MIME type checks.
 */
const checkMimeType = (mimeType) => {
	if (typeof mimeType !== 'string') {
		return { isImage: false, isPdf: false };
	}

	const validImageTypes = ['image/jpeg', 'image/png'];
	const validPdfType = 'application/pdf';

	return {
		isImage: validImageTypes.includes(mimeType?.toLowerCase()),
		isPdf: mimeType === validPdfType
	};
};

/**
 * Checks if a file size is within the allowed limit.
 *
 * @param {number} fileSize The size of the file in bytes.
 * @param {number} [maxFileSize=0] The maximum allowed file size in bytes.
 * @returns {boolean} Whether the file size is less than or equal to the maximum allowed file size.
 * @throws {Error} If fileSize or maxFileSize is not a non-negative integer.
 */
const checkFileSize = (fileSize, maxFileSize = 0) => {
	if (!Number.isInteger(fileSize) || fileSize < 0) {
		throw new Error('File size must be a non-negative integer');
	}

	if (!Number.isInteger(maxFileSize) || maxFileSize < 0) {
		throw new Error('Maximum file size must be a non-negative integer');
	}

	return maxFileSize === 0 || fileSize <= maxFileSize;
};

/**
 * Get the expected output file type based on the `ILoveAPI` tool used, for example:
 * - If the tool is `pdfjpg`, it means PDF is converted to JPG => output type is `image`.
 * - If the tool is `imagepdf`, it means images are converted to PDF => output type is `pdf`.
 *
 * @param {ILoveApiTypes.ToolEnum} tool Tool used.
 * @returns {'image' | 'pdf' | null} Resulting file type after processing, or `null` if unknown.
 */
const getOutputFileTypeFromTool = (tool) => {
	const toolsProducingImage = [
		'upscaleimage',
		'removebackgroundimage',
		'pdfjpg'
	];
	const toolsProducingPdf = ['merge', 'compress', 'imagepdf'];

	if (toolsProducingImage.includes(tool)) return 'image';
	if (toolsProducingPdf.includes(tool)) return 'pdf';

	return null;
};

/**
 * Generate inline keyboard button callback data as a JSON string to determine tool type to perform.
 * @param {TelegramBotTypes.FileTypeEnum} type Uploaded file mime type, see {@link TelegramBotTypes.FileTypeEnum file type}.
 * @param {'upscaleimage' | 'removebackgroundimage' | 'imagepdf' | 'watermarkimage' | 'compress'} task Task tool to perform.
 * @returns {string} Callback data as a JSON string
 */
const generateCallbackData = (type, task) => {
	const callbackData = { type, task };
	return JSON.stringify(callbackData);
};

/**
 * Generate inline keyboard markup that include button with text and callback data.
 * Its allow user to select tool to perform on uploaded file.
 * @param {TelegramBotTypes.FileTypeEnum} fileType Uploaded file mime type, see {@link TelegramBotTypes.FileTypeEnum file type}.
 * @param {boolean} [mapResult] Whether to map the result, default is `false`.
 * @param {Array<ILoveApiTypes.ToolEnum>} [toolFilter] Array containing tools name to filter, default is `[]`.
 * @param {Record<ILoveApiTypes.ToolEnum, string>} [toolCustomText] Custom text for each tool, default is `{}`.
 */
const generateInlineKeyboard = (
	fileType,
	mapResult = false,
	toolFilter = [],
	toolCustomText = {}
) => {
	const isImage = fileType === 'doc/image' || fileType === 'image';
	const isPdf = fileType === 'pdf';

	if (!isImage && !isPdf) {
		return undefined;
	}

	const imageTools =
		/** @type {Record<ILoveApiTypes.ImageToolEnum, string>} */ ({
			upscaleimage: toolCustomText?.upscaleimage || 'Bagusin ✨ (20)',
			removebackgroundimage:
				toolCustomText?.removebackgroundimage || 'Hapus Background 🌄 (10)',
			imagepdf: toolCustomText?.imagepdf || 'Ubah ke PDF 📝 (10)'
		});

	const pdfTools = /** @type {Record<ILoveApiTypes.PDFToolEnum, string>} */ ({
		merge: toolCustomText?.merge || 'Gabungin 📚 (5)',
		compress: toolCustomText?.compress || 'Compress 📦 (10)',
		pdfjpg: toolCustomText?.pdfjpg || 'Ubah ke Gambar 📸 (10)'
	});

	const filtered = Object.entries(isImage ? imageTools : pdfTools)
		.filter(([key]) => !toolFilter.includes(key))
		.map(([key, val]) => ({
			text: val,
			callback_data: JSON.stringify({ type: fileType, task: key })
		}));

	return mapResult ? filtered.map((item) => [item]) : filtered;
};

/**
 * @typedef {Object} generateJobTrackingMessageReturnType
 * @property {string} text
 * Formatted job tracking message.
 * @property {Pick<TelegrafTypes.Types.ExtraReplyMessage, 'reply_markup'>} extra
 * Additional parameters to be provided in the Telegram `sendMessage` API context.
 * This controls whether inline keyboard markup should be generated or not.
 */

/**
 * Generates a formatted job tracking message along with extra parameters to be sent using the Telegram `sendMessage` API.
 *
 * #### Job attributes can be:
 * - **Automatically created** by providing the `jobLog` entry.
 * - **Manually customized** by filling in other parameters.
 *
 * #### Job States (`step` parameter):
 * - `-1`: Job failed.
 * - `1`: Job is in the queue, waiting to be processed.
 * - `2`: Job is being processed by the `Task` worker.
 * - `3`: Job is processed and waiting for the `Downloader` worker to download the result and send it to the user.
 * - `4`: Job is completed, downloaded, and sent to the user.
 *
 * #### Behaviour
 * - If `jobLog` is provided, other parameters are ignored, as they will be inferred from the job log entry.
 * - If neither `jobLog` nor other parameters are provided, the function defaults to a failed job state (`-1`).
 * Ensure that at least one of these inputs is provided to accurately represent the job state.
 *
 * @param {SupabaseTypes.JobLogEntry} [jobLog=null] Job log entry. If provided, overrides other parameters.
 * @param {string} [jobId='-'] Job identifier.
 * @param {ILoveApiTypes.ToolEnum} [tool='-'] Tool used for the job.
 * @param {'-1' | '1' | '2' | '3' | '4'} [step='-1'] Job state, represented as a string number.
 * @param {boolean} [useInlineKeyboard=false] Whether to generate an inline keyboard button for fetching job logs.
 * @param {boolean} [useDescription=false] Whether to include a job description in the message.
 * @returns {generateJobTrackingMessageReturnType} Formatted job tracking message and additional parameters.
 * @example
 * ```js
 * // Edit Message with '-1' job state tracking message
 * bot.on('callback_query', async(ctx) => {
 * 	const jtm = generateJobTrackingMessage();
 * 	ctx.editMessageText(jtm.text, jtm.extra);
 * })
 *
 * // Reply Callback Query with '1' job state tracking message
 * // with inline keyboard and description
 * bot.on('callback_query', async(ctx) => {
 * 	const jtm = generateJobTrackingMessage(null, 'jobId', 'upscaleimage', '1', true, true);
 * 	ctx.reply(jtm.text, jtm.extra);
 * })
 *
 * // Edit Message with job log entry
 * const jobLog = {
 * 	job_id: 'hashed_sha1',
 * 	tool: 'removebackgroundimage',
 * 	task_worker_state: 'completed',
 * 	downloader_worker_state: 'completed',
 * 	// ... other job log attributes
 * 	// see `JobLogEntry` at schemas/supabase.js
 * }
 * // Above jobLog equal to '4' job state
 * bot.on('callback_query', async(ctx) => {
 * 	const jtm = generateJobTrackingMessage(jobLog);
 * 	ctx.editMessageText(jtm.text, jtm.extra);
 * })
 * ```
 */
const generateJobTrackingMessage = (
	jobLog = null,
	jobId = '-',
	tool = '-',
	step = '-1',
	useInlineKeyboard = false,
	useDescription = false
) => {
	const statusByStep = {
		1: 'Antrian⏳',
		2: 'Sedang Diproses⚡',
		3: 'Segera Dikirim🚚',
		4: 'Selesai✅',
		'-1': 'Gagal❌'
	};

	const keteranganByStep = {
		1: 'Server Filebuds sedang sibuk, permintaanmu masuk dalam antrian. Proses ini mungkin akan memakan waktu lebih lama dari biasanya.',
		2: 'Permintaanmu sedang dalam tahap pemrosesan.',
		3: 'Permintaanmu telah diproses, hasilnya akan segera dikirim ke chat ini.',
		4: 'Yeay! Permintaanmu telah berhasil diselesaikan. Terima kasih telah menggunakan Filebuds🚀',
		'-1': 'Sepertinya ada yang salah di server Filebuds sehingga permintaanmu gagal diproses😟. Silahkan coba lagi, jika masih gagal silahkan kirim ulang file yang ingin diproses.'
	};

	if (jobLog) {
		const isFailed =
			jobLog?.task_worker_state === 'failed' ||
			jobLog?.downloader_worker_state === 'failed';
		const isProcessed = jobLog?.task_worker_state === 'completed';
		const isDownloaded = jobLog?.downloader_worker_state === 'completed';

		jobId = jobLog?.job_id || '-';
		tool = jobLog?.tool || '-';

		if (isFailed) {
			// When job failed, set step to '-1' (state of failed jobs), disable inline keyboard and description generation
			// to prevent user from refetch job logs.
			step = '-1';
			useInlineKeyboard = false;
			useDescription = false;
		} else {
			// When `Task` worker completed, set step to '3' (state of processed jobs), enable inline keyboard and description generation
			// to allow user to refetch job logs.
			if (isProcessed) {
				step = '3';
				useInlineKeyboard = true;
				useDescription = true;
			}

			// When `Downloader` worker completed, set step to '4' (state of processed & downloaded jobs), disable inline keyboard and description generation
			// to prevent user from refetch job logs.
			if (isDownloaded) {
				step = '4';
				useInlineKeyboard = false;
				useDescription = false;
			}
		}
	}

	const text =
		'📝 Resi Filebuds' +
		`\n━━━━━━━━━━━━━━━━━` +
		`\nID: ${jobId}` +
		`\nTipe: ${tool}` +
		`\nStatus (${step}${step === '-1' ? '' : '/4'}): ${statusByStep[step]}` +
		`\nKeterangan: ${keteranganByStep[step]}` +
		(useDescription
			? `\n\n🚧 Resi ini tidak diperbarui otomatis. Kamu dapat memperbarui resi hingga 1 hari setelah pesan ini dikirim dengan menekan tombol di bawah.`
			: '');

	const extra = useInlineKeyboard
		? {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: 'Perbarui Resi 🔄',
								callback_data: JSON.stringify({ jid: jobId })
							}
						]
					]
				}
			}
		: {};

	return { text, extra };
};

/**
 * Extracts and returns the best representation of a user's name from Telegraf context.
 *
 * - Returns first name and last name if both exist (e.g. John Doe).
 * - Returns just first name or last name if only one exists (e.g. John, Doe).
 * - Falls back to username if name not available (e.g. johndoe55).
 * - Returns "anonymous" if no identifiable user info is found.
 *
 * @param {TelegrafTypes.Context} ctx Telegraf context object.
 * @returns {string} Resolved user name or "anonymous".
 */
const getUserFromContext = (ctx) => {
	if (!ctx || typeof ctx !== 'object') return 'anonymous';

	const {
		first_name: firstName,
		last_name: lastName,
		username
	} = ctx?.from || {};
	const fullName = [firstName, lastName].filter(Boolean).join(' ');

	return fullName || username || 'anonymous';
};

export default {
	checkMimeType,
	checkFileSize,
	getOutputFileTypeFromTool,
	generateCallbackData,
	generateInlineKeyboard,
	generateJobTrackingMessage,
	getUserFromContext
};
