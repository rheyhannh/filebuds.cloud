import axios, { AxiosError } from 'axios';

/**
 * Represents an error caused by an `ILoveAPI` response with a status code `>= 400`.
 * @extends {AxiosError}
 */
export class ILoveApiError extends AxiosError {
	/**
	 * Creates an instance of {@link ILoveApiError}.
	 * @param {string} message - Error message.
	 * @param {number} status - HTTP status code of the response.
	 * @param {AxiosError} error - Error thrown by Axios.
	 */
	constructor(message, status, error) {
		super(message, error.code, error.config, error.request, error.response);
		this.name = 'ILoveApiError';
		this.status = status;
	}
}

/**
 * Represents a network-related error, such as timeouts or DNS failures.
 * @extends {AxiosError}
 */
export class NetworkError extends AxiosError {
	/**
	 * Creates an instance of {@link NetworkError}.
	 * @param {string} message - Error message.
	 * @param {AxiosError} error - Error thrown by Axios.
	 */
	constructor(message, error) {
		super(message, error.code, error.config, error.request, error.response);
		this.name = 'NetworkError';
	}
}

/**
 * Classifies an error into either `ILoveApiError`, `NetworkError`, or a generic `Error`.
 *
 * - If the error originates from an API response (status `>= 400`), it is classified as `ILoveApiError`.
 * - If the error occurs due to network-related issues (e.g., timeout, no response), it is classified as `NetworkError`.
 * - Otherwise, the original error is rethrown.
 *
 * @param {AxiosError | Error} error - The error object to classify.
 * @throws {ILoveApiError | NetworkError | Error} - The classified error.
 */
export function classifyError(error) {
	if (axios.isAxiosError(error)) {
		if (error.response) {
			// The request was made, and the server responded with a status code outside 2xx.
			const { status } = error.response;
			const responseData = error.response.data || {};

			// Extract relevant message, defaulting to a fallback if undefined.
			let message = 'Unknown API error occurred.';
			let code = -1;

			if (
				typeof responseData.message === 'string' &&
				responseData.message.trim()
			) {
				message = responseData.message;
				code = responseData.code || -1;
			} else if (
				responseData.error &&
				typeof responseData.error.message === 'string' &&
				responseData.error.message.trim()
			) {
				message = responseData.error.message;
				code = responseData.error.code || -1;
			}

			const formattedMessage = `${message} (Status: ${status}, Code: ${code})`;

			throw new ILoveApiError(formattedMessage, status, error);
		}

		if (error.request) {
			// The request was sent, but no response was received.
			throw new NetworkError('No response received from the server.', error);
		}

		// Error occurred while setting up the request (e.g., invalid config)
		throw new NetworkError(
			'An error occurred while setting up the request.',
			error
		);
	}

	// If it's not an Axios error, rethrow the original error.
	throw error;
}
