import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Literal } from './Literal.js';
import { Option } from './Option.js';

const A = CodePoint.of('a');
const B = CodePoint.of('b');

describe('Literal', () => {
  describe('codePoint', () => {
    it('must return the code point passed to the constructor', () => {
      expect(new Literal(A).codePoint()).toBe(A);
    });
  });

  describe('equals', () => {
    it('must equal a literal of an equal code point', () => {
      expect(new Literal(A).equals(new Literal(CodePoint.of('a')))).toBe(true);
    });

    it('must not equal a literal of a different code point', () => {
      expect(new Literal(A).equals(new Literal(B))).toBe(false);
    });

    it.each([
      ['its code point', A],
      ['a different kind of node', new Option(new Literal(A))],
      ['undefined', undefined],
    ])('must not equal %s', (_, other) => {
      expect(new Literal(A).equals(other)).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its code point', () => {
      expect(new Literal(A).toString()).toBe('a');
    });
  });
});
