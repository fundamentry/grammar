import { describe, expect, it } from 'vitest';

import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { Named } from './Named.js';
import { Within } from './Within.js';

const DIGITS = RangeSet.from([
  Range.closed(CodePoint.of('0'), CodePoint.of('9')),
]);

const LETTERS = RangeSet.from([
  Range.closed(CodePoint.of('a'), CodePoint.of('z')),
]);

describe('Within', () => {
  describe('instanceof', () => {
    it('must recognise an expectation of values within ranges', () => {
      expect(new Within(DIGITS)).toBeInstanceOf(Within);
    });

    it.each([
      ['another expectation', new Named('a digit')],
      ['a non-object', 0],
      ['an object it did not construct', Object.create(Within.prototype)],
    ])('must not recognise %s', (_, value) => {
      expect(value).not.toBeInstanceOf(Within);
    });
  });

  it('must render as the ranges it expects', () => {
    expect(String(new Within(DIGITS))).toBe('one of {[0..9]}');
  });

  it('must render a single value as that value', () => {
    expect(
      String(new Within(RangeSet.from([Range.singleton(CodePoint.of('t'))])))
    ).toBe("'t'");
  });

  it('must render several single values as the ranges it expects', () => {
    expect(
      String(
        new Within(
          RangeSet.from([
            Range.singleton(CodePoint.of('H')),
            Range.singleton(CodePoint.of('h')),
          ])
        )
      )
    ).toBe('one of {[H..H], [h..h]}');
  });

  it('must expose the only value it expects', () => {
    const t = CodePoint.of('t');

    expect(new Within(RangeSet.from([Range.singleton(t)])).only()).toBe(t);
    expect(new Within(DIGITS).only()).toBeUndefined();
    expect(new Within(RangeSet.from<CodePoint>([])).only()).toBeUndefined();
  });

  it('must expose its ranges', () => {
    expect(new Within(DIGITS).ranges()).toBe(DIGITS);
  });

  it('must equal another expectation of the same ranges only', () => {
    expect(new Within(DIGITS).equals(new Within(DIGITS))).toBe(true);
    expect(new Within(DIGITS).equals(new Within(LETTERS))).toBe(false);
    expect(new Within(DIGITS).equals(new Named('one of {[0..9]}'))).toBe(false);
  });
});
