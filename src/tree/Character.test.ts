import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { Option } from './Option.js';

const A = CodePoint.of('a');
const B = CodePoint.of('b');

describe('Character', () => {
  describe('codePoint', () => {
    it('must return the code point passed to the constructor', () => {
      expect(new Character(A).codePoint()).toBe(A);
    });
  });

  describe('equals', () => {
    it('must equal a character of an equal code point', () => {
      expect(new Character(A).equals(new Character(CodePoint.of('a')))).toBe(
        true
      );
    });

    it('must not equal a character of a different code point', () => {
      expect(new Character(A).equals(new Character(B))).toBe(false);
    });

    it.each([
      ['its code point', A],
      ['a different kind of node', new Option(new Character(A))],
      ['undefined', undefined],
    ])('must not equal %s', (_, other) => {
      expect(new Character(A).equals(other)).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its code point', () => {
      expect(new Character(A).toString()).toBe('a');
    });
  });
});
