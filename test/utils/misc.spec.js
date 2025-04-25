import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as _Utils from '../../src/utils/misc.js';

const Utils = _Utils.default;

describe('[Unit] Miscellaneous Utils', () => {
	describe('areArraysEqualByIndex()', () => {
		const objA = { fileName: 'fileA.pdf', fileLink: 'www.a.pdf' };
		const objB = { fileName: 'fileB.pdf', fileLink: 'www.b.pdf' };

		it('should return true for equal arrays with same order', () => {
			const arr1 = [objA, objB];
			const arr2 = [objA, objB];

			expect(Utils.areArraysEqualByIndex(arr1, arr2, true)).to.be.true;
		});

		it('should return false for equal arrays with different order when strictOrder is true', () => {
			const arr1 = [objA, objB];
			const arr2 = [objB, objA];

			expect(Utils.areArraysEqualByIndex(arr1, arr2, true)).to.be.false;
		});

		it('should return true for equal arrays with different order when strictOrder is false', () => {
			const arr1 = [objA, objB];
			const arr2 = [objB, objA];

			expect(Utils.areArraysEqualByIndex(arr1, arr2, false)).to.be.true;
		});

		it('should return false for arrays with different lengths', () => {
			const arr1 = [objA];
			const arr2 = [objA, objB];

			expect(Utils.areArraysEqualByIndex(arr1, arr2, true)).to.be.false;
			expect(Utils.areArraysEqualByIndex(arr1, arr2, false)).to.be.false;
		});

		it('should return true for deeply equal nested objects', () => {
			const deepA = { ...objA, meta: { created: '2021-01-01' } };
			const deepB = { ...objA, meta: { created: '2021-01-01' } };

			expect(Utils.areArraysEqualByIndex([deepA], [deepB], true)).to.be.true;
		});

		it('should return false if nested values differ', () => {
			const deepA = { ...objA, meta: { created: '2021-01-01' } };
			const deepB = { ...objA, meta: { created: '2022-01-01' } };

			expect(Utils.areArraysEqualByIndex([deepA], [deepB], true)).to.be.false;
		});

		it('should return true for empty arrays', () => {
			expect(Utils.areArraysEqualByIndex([], [], true)).to.be.true;
			expect(Utils.areArraysEqualByIndex([], [], false)).to.be.true;
		});

		it('should return false for mismatched types or nulls', () => {
			expect(Utils.areArraysEqualByIndex(null, [], true)).to.be.false;
			expect(Utils.areArraysEqualByIndex([], null, false)).to.be.false;
			expect(Utils.areArraysEqualByIndex(undefined, undefined, true)).to.be
				.false;
		});
	});
});
