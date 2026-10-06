import { describe, expect, it } from 'vitest';

import { EndOfInput, Named } from '#project/expectation';

import { Mismatch } from './Mismatch.js';

const digit = new Named('a digit');

const letter = new Named('a letter');

describe('Mismatch', () => {
  describe('offset', () => {
    it('must return how many tokens precede where it occurred', () => {
      expect(new Mismatch(3, [digit], "'x'").offset()).toBe(3);
    });
  });

  describe('expected', () => {
    it('must return what was expected where it occurred', () => {
      expect(new Mismatch(3, [digit, letter], "'x'").expected()).toEqual([
        digit,
        letter,
      ]);
    });
  });

  describe('toString', () => {
    it('must list the alternatives that were expected and what was found', () => {
      expect(
        String(new Mismatch(1, [digit, letter, new EndOfInput()], "'!'"))
      ).toBe("Expected a digit, a letter, or end of input, got '!'");
    });
  });

  describe('equals', () => {
    it('must equal a mismatch at the same offset with the same content', () => {
      expect(
        new Mismatch(1, [digit], "'!'").equals(
          new Mismatch(1, [new Named('a digit')], "'!'")
        )
      ).toBe(true);
    });

    it('must not equal a mismatch at another offset or with other content', () => {
      expect(
        new Mismatch(1, [digit], "'!'").equals(new Mismatch(2, [digit], "'!'"))
      ).toBe(false);
      expect(
        new Mismatch(1, [digit], "'!'").equals(new Mismatch(1, [letter], "'!'"))
      ).toBe(false);
      expect(
        new Mismatch(1, [digit], "'!'").equals(new Mismatch(1, [digit], "'?'"))
      ).toBe(false);
      expect(
        new Mismatch(1, [digit], "'!'").equals("Expected a digit, got '!'")
      ).toBe(false);
    });
  });
});
