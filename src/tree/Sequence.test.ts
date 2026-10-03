import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Literal } from './Literal.js';
import { Repetition } from './Repetition.js';
import { Sequence } from './Sequence.js';

const A = new Literal(CodePoint.of('a'));
const B = new Literal(CodePoint.of('b'));

describe('Sequence', () => {
  describe('elements', () => {
    it('must return the elements passed to the constructor', () => {
      const elements = [A, B] as const;

      expect(new Sequence(elements).elements()).toBe(elements);
    });
  });

  describe('equals', () => {
    it('must equal a sequence of equal elements', () => {
      expect(new Sequence([A, B]).equals(new Sequence([A, B]))).toBe(true);
    });

    it('must not equal a sequence with a different element', () => {
      expect(new Sequence([A, B]).equals(new Sequence([A, A]))).toBe(false);
    });

    it('must not equal a sequence of a different length', () => {
      expect(new Sequence([A]).equals(new Sequence([A, B]))).toBe(false);
      expect(new Sequence([A, B]).equals(new Sequence([A]))).toBe(false);
    });

    it('must compare nested nodes structurally', () => {
      expect(
        new Sequence([new Sequence([A]), B]).equals(
          new Sequence([new Sequence([A]), B])
        )
      ).toBe(true);
      expect(
        new Sequence([new Sequence([A]), B]).equals(new Sequence([A, B]))
      ).toBe(false);
    });

    it('must not equal a different kind of node with the same elements', () => {
      expect(
        new Sequence([A]).equals(
          new Repetition([A]) as unknown as Sequence<readonly Literal[]>
        )
      ).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its elements in order', () => {
      expect(new Sequence([A, new Sequence([B, A])]).toString()).toBe('aba');
    });
  });
});
