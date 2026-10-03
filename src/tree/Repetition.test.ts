import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Literal } from './Literal.js';
import { Repetition } from './Repetition.js';
import { Sequence } from './Sequence.js';

const A = new Literal(CodePoint.of('a'));
const B = new Literal(CodePoint.of('b'));

describe('Repetition', () => {
  describe('elements', () => {
    it('must return the elements passed to the constructor', () => {
      const elements = [A, B];

      expect(new Repetition(elements).elements()).toBe(elements);
    });
  });

  describe('equals', () => {
    it('must equal a repetition of equal elements', () => {
      expect(new Repetition([A, B]).equals(new Repetition([A, B]))).toBe(true);
    });

    it('must equal another empty repetition', () => {
      expect(new Repetition([]).equals(new Repetition([]))).toBe(true);
    });

    it('must not equal a repetition with a different element', () => {
      expect(new Repetition([A, B]).equals(new Repetition([A, A]))).toBe(false);
    });

    it('must not equal a repetition of a different length', () => {
      expect(new Repetition([A]).equals(new Repetition([A, A]))).toBe(false);
    });

    it('must not equal a different kind of node with the same elements', () => {
      expect(
        new Repetition([A]).equals(
          new Sequence([A]) as unknown as Repetition<Literal>
        )
      ).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its elements in order', () => {
      expect(new Repetition([A, B, A]).toString()).toBe('aba');
    });
  });
});
