import axios from 'axios';
import config from '../../config/env.js';
import Auth from './Auth.js';
import TaskI from './TaskI.js';
import * as Schema from './schema/ILoveIMGApi.js';
import * as ToolSchema from './schema/Tool.js';
import { classifyError } from './Error.js';

const { ILOVEIMG_API_URL, ILOVEIMG_API_URL_PROTOCOL, ILOVEIMG_API_VERSION } =
	config;

class ILoveIMGApi {
	/**
	 * Projects public key used for authentication, obtained from {@link https://www.iloveapi.com/user/projects here}.
	 * @private Internal usage only.
	 */
	#publicKey;
	/**
	 * Projects secret key used for local token generation, obtained from {@link https://www.iloveapi.com/user/projects here}.
	 * @private Internal usage only.
	 */
	#secretKey;
	/**
	 * An instance of {@link Auth} that issuing, verify and refresh the authentication token used to `ILoveApi` server.
	 * @private Internal usage only.
	 */
	#auth;
	/**
	 * An instance of `AxiosInstance` that create HTTP requests to `ILoveApi` fixed server.
	 * @private Internal usage only.
	 */
	#fixedServer;

	/**
	 * Create an instance of `ILoveIMGApi` using your project public and secret key (optional).
	 * With this instance, you can add task for specific image tool using `newTask` or list your tasks using `listTasks` (secret key required).
	 * @param {string} publicKey Projects public key used for authentication, obtained from {@link https://www.iloveapi.com/user/projects here}.
	 * @param {string} [secretKey=''] Projects secret key used for local token generation, obtained from {@link https://www.iloveapi.com/user/projects here}.
	 * @param {Object} [params={}] Additional parameters.
	 * @param {string} [params.file_encryption_key] Encryption key for files.
	 */
	constructor(publicKey, secretKey = '', params = {}) {
		this.#publicKey = publicKey;
		this.#secretKey = secretKey;
		this.#auth = new Auth(this.#publicKey, this.#secretKey, params);
		this.#fixedServer = axios.create({
			baseURL: `${ILOVEIMG_API_URL_PROTOCOL}://${ILOVEIMG_API_URL}/${ILOVEIMG_API_VERSION}`,
			headers: { 'Content-Type': 'application/json;charset=UTF-8' }
		});
	}

	/**
	 * Creates a new task for a specific `ILoveIMG` tool.
	 * @param {ToolSchema.ToolTypesInfered} type Tool type to run.
	 * @returns {TaskI} Task instance
	 * @throws {import('zod').ZodError} If the tool type is not valid.
	 */
	newTask(type) {
		ToolSchema.ToolTypes.parse(type);

		return new TaskI(this.#auth, this.#fixedServer, type);
	}

	/**
	 * Returns a task lists from `ILoveApi` servers ordered from newest to older.
	 * You need to provide secret key to get the task lists, otherwise this method will throw an error.
	 * @param {Schema.ListTasksOptionsInfered} [options] Options to get the task list.
	 * @returns {Promise<Array<Schema.ListTasksReturnTypeInfered>>} List of tasks.
	 * @throws {Error} If secret key not provided or requests failed.
	 * @throws {import('zod').ZodError} If any incorrect or invalid `options` type.
	 */
	async listTasks(options = {}) {
		if (!this.#secretKey || typeof this.#secretKey !== 'string')
			throw new Error('Secret key required for list tasks.');

		/**
		 * Generic options that already validated by zod.
		 */
		const _vOptions = await Schema.ListTasksOptions.parseAsync(options);

		try {
			const token = await this.#auth.getToken();
			this.#fixedServer.defaults.headers['Authorization'] = `Bearer ${token}`;
			const response = await this.#fixedServer.post('/task', {
				secret_key: this.#secretKey,
				..._vOptions
			});

			return response.data;
		} catch (error) {
			classifyError(error);
		}
	}
}

export default ILoveIMGApi;
