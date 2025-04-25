import _ from 'lodash';

/**
 * Compares two arrays of objects to check if they are equal in length
 * and if all corresponding items are deeply equal. Allows control over order sensitivity.
 *
 * @param {Array<any>} arr1 First array to compare.
 * @param {Array<any>} arr2 Second array to compare.
 * @param {boolean} [strictOrder=true] If `true`, checks that items are equal and in the same order, If `false`, checks for equality regardless of order, default `true`.
 * @returns {boolean} Returns true if arrays are equal according to the specified order sensitivity.
 */
const areArraysEqualByIndex = (arr1, arr2, strictOrder = true) => {
	if (
		!Array.isArray(arr1) ||
		!Array.isArray(arr2) ||
		arr1.length !== arr2.length
	)
		return false;

	if (strictOrder) {
		return arr1.every((item, index) => _.isEqual(item, arr2[index]));
	}

	const sortedArr1 = [...arr1].sort((a, b) =>
		JSON.stringify(a).localeCompare(JSON.stringify(b))
	);
	const sortedArr2 = [...arr2].sort((a, b) =>
		JSON.stringify(a).localeCompare(JSON.stringify(b))
	);

	return sortedArr1.every((item, index) => _.isEqual(item, sortedArr2[index]));
};

export default {
	areArraysEqualByIndex
};
