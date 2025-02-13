import { z } from 'zod';
import { ToolTypes } from './Tool.js';

/**
 * @typedef {z.infer<typeof TaskStatusTypes>} TaskStatusTypesInfered
 */
export const TaskStatusTypes = z.enum([
	'TaskWaiting',
	'TaskProcessing',
	'TaskSuccess',
	'TaskSuccessWithWarnings',
	'TaskError',
	'TaskDeleted',
	'TaskNotFound'
]);

//#region Task General Options

/**
 * @typedef {z.infer<typeof TaskStartGenericOptions>} TaskStartGenericOptionsInfered
 */
export const TaskStartGenericOptions = z.object({
	/**
	 * Enables or disables debug mode, default are `false`. When set to `true`,
	 * - No credits will be deducted from your project.
	 * - No actual processing will occur, `ILoveApi` only return response from your request details.
	 * - The returned data may differ from standard response.
	 */
	debug: z.boolean().optional()
});

/**
 * @typedef {z.infer<typeof TaskStartReturnType>} TaskStartReturnTypeInfered
 */
export const TaskStartReturnType = z.object({
	/**
	 * Assigned server.
	 * - Ex: `api8g.iloveimg.com`
	 */
	server: z.string(),
	/**
	 * Task id.
	 */
	task_id: z.string(),
	/**
	 * The number of remaining files available for processing in your project.
	 * This represents the current limit on how many files you can process.
	 */
	remaining_files: z.number()
});

/**
 * @typedef {z.infer<typeof TaskAddFileGenericOptions>} TaskAddFileGenericOptionsInfered
 */
export const TaskAddFileGenericOptions = z.object({
	/**
	 * Public image URL. When you working with `URL`, you should parse to string first using `toString`.
	 */
	cloud_file: z.string(),
	/**
	 * Enables or disables debug mode, default are `false`. When set to `true`,
	 * - No credits will be deducted from your project.
	 * - No actual processing will occur, `ILoveApi` only return response from your request details.
	 * - The returned data may differ from standard response.
	 */
	debug: z.boolean().optional()
});

/**
 * @typedef {z.infer<typeof TaskAddFileReturnType>} TaskAddFileReturnTypeInfered
 */
export const TaskAddFileReturnType = z.object({
	/**
	 * Server filename that resolved from adding image file.
	 * - Ex: `loremipsumdolorsitamet.jpg`
	 */
	server_filename: z.string()
});

/**
 * @typedef {z.infer<typeof TaskRemoveFileGenericOptions>} TaskRemoveFileGenericOptionsInfered
 */
export const TaskRemoveFileGenericOptions = z.object({
	/**
	 * Server filename that resolved from adding image file.
	 * - Ex: `loremipsumdolorsitamet.jpg`
	 */
	server_filename: z.string(),
	/**
	 * Enables or disables debug mode, default are `false`. When set to `true`,
	 * - No credits will be deducted from your project.
	 * - No actual processing will occur, `ILoveApi` only return response from your request details.
	 * - The returned data may differ from standard response.
	 */
	debug: z.boolean().optional()
});

/**
 * @typedef {z.infer<typeof TaskRemoveFileReturnType>} TaskRemoveFileReturnTypeInfered
 */
export const TaskRemoveFileReturnType = z.object({
	/**
	 * Indicates whether the file removal process was successful.
	 */
	success: z.boolean()
});

/**
 * @typedef {z.infer<typeof TaskProcessRequiredOptions>} TaskProcessRequiredOptionsInfered
 */
export const TaskProcessRequiredOptions = z.object({
	task: z.string(),
	tool: ToolTypes,
	files: z
		.array(
			z.object({
				/**
				 * Server filename that resolved from adding image file.
				 * - Ex: `loremipsumdolorsitamet.jpg`
				 */
				server_filename: z.string(),
				/**
				 * Filename that can you customized, make sure extensions are correct.
				 * This will be used as default `output_filename` when you dont specify it.
				 * - Ex: `john_upscaledimage_1.jpg`
				 */
				filename: z.string()
			})
		)
		.min(1)
});

/**
 * @typedef {z.infer<typeof TaskProcessGenericOptions>} TaskProcessGenericOptionsInfered
 */
export const TaskProcessGenericOptions = z.object({
	/**
	 * Force process although some of the files are damaged or throw an error. If damaged/error files are equal to total files to process, this value does not take effect. On successful response, all files with errors will be listed as warnings.
	 * - Default: `true`
	 */
	ignore_errors: z.boolean().optional().default(true),
	/**
	 * Output filename that can accept below placeholder,
	 * - `{date}`: Current date
	 * - `{n}` : File number
	 * - `{filename}`: Original filename
	 * - `{tool}`: The current processing action
	 *
	 * Example: `{tool}_{n}_{date}`
	 */
	output_filename: z.string().optional(),
	/**
	 * If there are more than one output files, they will be compressed into a ZIP file.
	 * You can specify the filename of the compressed file that accept below placeholder,
	 * - `{date}`: Current date
	 * - `{n}` : File number
	 * - `{filename}`: Original filename
	 * - `{tool}`: The current processing action
	 *
	 * Example: `{tool}_{n}_{date}`
	 */
	packaged_filename: z.string().optional(),
	/**
	 * If specified, all previously uploaded files for the task will be uploaded encrypted.
	 * The key will be used to decrypt the files before processing and re-encrypt them after processing.
	 * Only key sizes of `16`, `24` or `32` characters are supported.
	 */
	file_encryption_key: z
		.string()
		.length(16)
		.or(z.string().length(24))
		.or(z.string().length(32))
		.optional(),
	/**
	 * When an image file fails to be processed, we try to repair it automatically.
	 * - Default: `true`
	 */
	try_image_repair: z.boolean().optional().default(true),
	/**
	 * Use this parameter to store integers as you wish. You can use it to filter your tasks in the `GET` `/task` resource,
	 * or using `listTasks` options like example below,
	 * ```js
	 * const custom_int = 5;
	 * // Ensure publicKey and secretKey are provided!
	 * const instance = new ILoveIMGApi('publicKey', 'secretKey');
	 * const tasks = await instance.listTasks({ custom_int });
	 * ```
	 */
	custom_int: z.number().optional(),
	/**
	 * Use this parameter to store integers as you wish. You can use it to filter your tasks in the `GET` `/task` resource,
	 * or using `listTasks` options like example below,
	 * ```js
	 * const custom_string = 'loremipsum';
	 * // Ensure publicKey and secretKey are provided!
	 * const instance = new ILoveIMGApi('publicKey', 'secretKey');
	 * const tasks = await instance.listTasks({ custom_string });
	 * ```
	 */
	custom_string: z.string().optional(),
	/**
	 * A callback URL. If provided, the API will close the connection immediately after starting the task
	 * and send a POST request with the task details to the specified URL once processing is complete.
	 *
	 * Alternatively, you can set this parameter to an empty string (`""`).
	 * In this case, the API will still close the connection immediately,
	 * but no callback will be sent. This allows you to check the task status manually
	 * by making periodic `GET` requests to `/task/{task}` instead.
	 */
	webhook: z.string().optional(),
	/**
	 * Enables or disables debug mode, default are `false`. When set to `true`,
	 * - No credits will be deducted from your project.
	 * - No actual processing will occur, `ILoveApi` only return response from your request details.
	 * - The returned data may differ from standard response.
	 */
	debug: z.boolean().optional()
});

/**
 * @typedef {z.infer<typeof TaskProcessReturnType>} TaskProcessReturnTypeInfered
 */
export const TaskProcessReturnType = z.object({
	/**
	 * This match to `output_filename` on process options when its provided,
	 * otherwise match to its own processed `filename` attributes. When you use `webhook` parameter, this attribute wont exist.
	 */
	download_filename: z.string().optional(),
	/**
	 * Original image file size in `bytes`. When you use `webhook` parameter, this attribute wont exist.
	 */
	filesize: z.number().optional(),
	/**
	 * Processed image file size in `bytes`. When you use `webhook` parameter, this attribute wont exist.
	 */
	output_filesize: z.number().optional(),
	/**
	 * Total image file that already been processed.
	 * When compressed in ZIP, this match to total files in ZIP archive.
	 * When you use `webhook` parameter, this attribute wont exist.
	 */
	output_filenumber: z.number().optional(),
	/**
	 * Processed image file extensions. When you use `webhook` parameter, this attribute wont exist.
	 * - Ex: `[\"jpg\"]`
	 */
	output_extensions: z.string().optional(),
	/**
	 * Process duration in string. When you use `webhook` parameter, this attribute wont exist.
	 * - Ex: `23.258`
	 */
	timer: z.string().optional(),
	/**
	 * Task status. When you use `webhook` parameter, this attribute wont exist.
	 */
	status: z.enum([
		'TaskWaiting',
		'TaskProcessing',
		'TaskSuccess',
		'TaskSuccessWithWarnings',
		'TaskError',
		'TaskDeleted',
		'TaskNotFound'
	]),
	/**
	 * Task message that only available when the `webhook` parameter is used.
	 */
	task: z.string().optional()
});

//#endregion

//#region Task Tool Based Options

/**
 * @typedef {z.infer<typeof TaskProcessConvertImageOptions>} TaskProcessConvertImageOptionsInfered
 */
export const TaskProcessConvertImageOptions = z
	.object({
		/**
		 * The format to convert to. Accepted values are `jpg`, `png`, `gif`, `gif_animation` and `heic`.
		 * Convert to jpg can be (almost) from any image format. Convert to png and gif can be only from jpg images.
		 *
		 * - Default: `jpg`
		 */
		to: z
			.enum(['jpg', 'png', 'gif', 'gif_animation', 'heic'])
			.optional()
			.default('jpg'),
		/**
		 * Define the seconds per image, in hundredths of a second. Required when `to` are `gif` or `gif_animation`.
		 *
		 * - Default: `50`
		 */
		gif_time: z.number().optional().default(50),
		/**
		 * Set if animation stops at the end or loops forever. Required when `to` are `gif` or `gif_animation`.
		 *
		 * - Default: `true`
		 */
		gif_loop: z.boolean().optional().default(true)
	})
	.optional();

/**
 *
 * @typedef {z.infer<typeof TaskProcessUpscaleImageOptions>} TaskProcessUpscaleImageOptionsInfered
 */
export const TaskProcessUpscaleImageOptions = z.object({
	/**
	 * Image upscale multiplier. Accepted values are `2`, `4`.
	 */
	multiplier: z.number().refine((val) => [2, 4].includes(val))
});

/**
 * @typedef {z.infer<typeof TaskProcessWatermarkImageElementsProps>} TaskProcessWatermarkImageElementsPropsInfered
 */
export const TaskProcessWatermarkImageElementsProps = z
	.object({
		/**
		 * The type for the element. Accepted values are `image` or `text`.
		 */
		type: z.enum(['image', 'text']),
		/**
		 * The text to stamp, required when type are `text`
		 */
		text: z.string().optional(),
		/**
		 * The stamp image that must be uploaded in the Upload resource that required when type are `image`.
		 * This image parameter must referer to the `server_filename` either JPG or PNG.
		 */
		image: z.string().optional(),
		/**
		 * - Default: `Center`
		 */
		gravity: z
			.enum([
				'North',
				'NorthEast',
				'NorthWest',
				'Center',
				'CenterEast',
				'CenterWest',
				'East',
				'West',
				'South',
				'SouthEast',
				'SouthWest'
			])
			.optional()
			.default('Center'),
		/**
		 * Adjust how much space must modify the position of the position defined in `gravity`,
		 * based on a percent of the base image, it accepts positive and negative values.
		 * - Default: `0`
		 */
		vertical_adjustment_percent: z.number().optional().default(0),
		/**
		 * Adjust how much space must modify the position of the position defined in `gravity`,
		 * based on a percent of the base image, it accepts positive and negative values.
		 * - Default: `0`
		 */
		horizontal_adjustment_percent: z.number().optional().default(0),
		/**
		 * Angle of rotation. Accepted integer range are `0-360`.
		 * - Default: `0`
		 */
		rotation: z.number().min(0).max(360).optional().default(0),
		/**
		 * - Default: `Arial`
		 */
		font_family: z
			.enum([
				'Arial',
				'Arial Unicode MS',
				'Verdana',
				'Courier',
				'Times New Roman',
				'Comic Sans MS',
				'WenQuanYi Zen Hei',
				'Lohit Marathi'
			])
			.optional()
			.default('Arial'),
		/**
		 * Optionally you can use `null` for regular normal usage.
		 * - Default: `null`
		 */
		font_style: z.enum(['Bold', 'Italic']).nullable().optional().default(null),
		/**
		 * - Default: `14`
		 */
		font_size: z.number().optional().default(14),
		/**
		 * Hexadecimal color.
		 * - Default : `#000000`
		 */
		font_color: z.string().optional().default('#000000'),
		/**
		 * Percentage of opacity for stamping text or image. Accepted range are `1-100`.
		 * - Default: `100`
		 */
		transparency: z.number().min(1).max(100).optional().default(100),
		/**
		 * If `true`, it will overrides all position parameters and stamps the image or text 9 times per page.
		 * - Default: `false`
		 */
		mosaic: z.boolean().optional().default(false)
	})
	.refine(
		(data) => {
			if (data.type === 'text') return !!data.text;
			if (data.type === 'image') return !!data.image;
			return true;
		},
		{
			message:
				'text is required when type is text, image is required when type is image',
			path: ['type']
		}
	);

/**
 * @typedef {z.infer<typeof TaskProcessWatermarkImageOptions>} TaskProcessWatermarkImageOptionsInfered
 */
export const TaskProcessWatermarkImageOptions = z.object({
	/**
	 * At least one element required
	 */
	elements: z.array(TaskProcessWatermarkImageElementsProps).min(1)
});

/**
 * @typedef {z.infer<typeof TaskProcessToolOptions>} TaskProcessToolOptionsInfered
 */
export const TaskProcessToolOptions = z.object({
	/** When tool type are `convertimage`, this options are optional. */
	convertimage: TaskProcessConvertImageOptions,
	/** When tool type are `removebackgroundimage`, this options are optional. */
	removebackgroundimage: z.object({}).optional(),
	/** When tool type are `upscaleimage`, some options are required. */
	upscaleimage: TaskProcessUpscaleImageOptions,
	/** When tool type are `watermarkimage`, some options are required. */
	watermarkimage: TaskProcessWatermarkImageOptions
});

//#endregion
