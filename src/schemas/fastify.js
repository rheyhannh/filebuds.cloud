/**
 * @typedef {Object} BaseBodyResponse
 * @property {boolean} ok
 * Boolean indicating are operation was successful.
 * @property {number} statusCode
 * HTTP status code.
 * - Ex: `200`
 * @property {string} statusText
 * HTTP status text.
 * - Ex: `OK`
 */

/**
 * @template [DataType=any]
 * @template [OtherCustomType={}]
 * @typedef {BaseBodyResponse & { data: DataType } & OtherCustomType} SuccessBodyResponse
 * Represents a standarized successful response body with a generic type.
 */

/**
 * @template [ErrorType={ name: string, message: string }]
 * @template [OtherCustomType={}]
 * @typedef {BaseBodyResponse & { error: ErrorType } & OtherCustomType} ErrorBodyResponse
 * Represents a standarized error response body with a generic type.
 */

export default {};
