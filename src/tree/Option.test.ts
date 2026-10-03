import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Literal } from './Literal.js';
import { Option } from './Option.js';
import { Sequence } from './Sequence.js';

const A = new Literal(CodePoint.of('a'));
const B = new Literal(CodePoint.of('b'));

describe('Option', () => {
  describe('value', () => {
    it('must return the value passed to the constructor', () => {
      expect(new Option(A).value()).toBe(A);
    });

    it('must return undefined when absent', () => {
      expect(new Option().value()).toBeUndefined();
    });
  });

  describe('elements', () => {
    it('must return its value as the only element when present', () => {
      expect(new Option(A).elements()).toEqual([A]);
    });

    it('must return no elements when absent', () => {
      expect(new Option().elements()).toEqual([]);
    });
  });

  describe('equals', () => {
    it('must equal an option of an equal value', () => {
      expect(new Option(A).equals(new Option(A))).toBe(true);
    });

    it('must not equal an option of a different value', () => {
      expect(new Option(A).equals(new Option(B))).toBe(false);
    });

    it('must equal another absent option', () => {
      expect(new Option().equals(new Option())).toBe(true);
    });

    it('must not equal an absent option when present, and vice versa', () => {
      expect(new Option(A).equals(new Option())).toBe(false);
      expect(new Option().equals(new Option(A))).toBe(false);
    });

    it('must not equal a different kind of node', () => {
      expect(
        new Option(A).equals(new Sequence([A]) as unknown as Option<Literal>)
      ).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its value when present', () => {
      expect(new Option(A).toString()).toBe('a');
    });

    it('must print nothing when absent', () => {
      expect(new Option().toString()).toBe('');
    });
  });
});
