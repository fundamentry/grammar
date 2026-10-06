import { describe, expect, it } from 'vitest';

import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { Characters } from './Characters.js';
import { Named } from './Named.js';

const DIGITS = RangeSet.from([
  Range.closed(CodePoint.of('0'), CodePoint.of('9')),
]);

const LETTERS = RangeSet.from([
  Range.closed(CodePoint.of('a'), CodePoint.of('z')),
]);

describe('Characters', () => {
  describe('instanceof', () => {
    it('must recognise an expectation of values within ranges', () => {
      expect(new Characters(DIGITS)).toBeInstanceOf(Characters);
    });

    it.each([
      ['another expectation', new Named('a digit')],
      ['a non-object', 0],
      ['an object it did not construct', Object.create(Characters.prototype)],
    ])('must not recognise %s', (_, value) => {
      expect(value).not.toBeInstanceOf(Characters);
    });
  });

  it('must render each of its ranges as an element', () => {
    const ranges = RangeSet.from([
      Range.closed(CodePoint.of('0'), CodePoint.of('9')),
      Range.singleton(CodePoint.of('t')),
    ]);

    expect(new Characters(ranges).elements()).toEqual(['%x30-39', '%x74']);
  });

  it('must render as the alternation of its elements', () => {
    const ranges = RangeSet.from([
      Range.closed(CodePoint.of('0'), CodePoint.of('9')),
      Range.singleton(CodePoint.of('t')),
    ]);

    expect(String(new Characters(ranges))).toBe('%x30-39 / %x74');
  });

  it('must expose its ranges', () => {
    expect(new Characters(DIGITS).ranges()).toBe(DIGITS);
  });

  it('must equal another expectation of the same ranges only', () => {
    expect(new Characters(DIGITS).equals(new Characters(DIGITS))).toBe(true);
    expect(new Characters(DIGITS).equals(new Characters(LETTERS))).toBe(false);
    expect(new Characters(DIGITS).equals(new Named('%x30-39'))).toBe(false);
  });

  describe('caseless', () => {
    const within = (...ranges: readonly Range<CodePoint>[]) =>
      new Characters(RangeSet.from(ranges));

    it('must add the other case of the letters it expects', () => {
      expect(
        String(
          within(Range.closed(CodePoint.of('a'), CodePoint.of('f'))).caseless()
        )
      ).toBe('%x41-46 / %x61-66');
    });

    it('must add only the other case of the letters within a wider range', () => {
      expect(
        String(
          within(Range.closed(CodePoint.of('0'), CodePoint.of('C'))).caseless()
        )
      ).toBe('%x30-43 / %x61-63');
    });

    it('must leave out the endpoints of an open range of letters', () => {
      expect(
        String(
          within(Range.open(CodePoint.of('A'), CodePoint.of('D'))).caseless()
        )
      ).toBe('%x42-43 / %x62-63');
    });

    it('must leave characters without case as they are', () => {
      expect(
        within(Range.closed(CodePoint.of('0'), CodePoint.of('9'))).caseless()
      ).toEqual(within(Range.closed(CodePoint.of('0'), CodePoint.of('9'))));
    });

    it('must fold only ASCII letters', () => {
      expect(
        String(within(Range.singleton(CodePoint.of('é'))).caseless())
      ).toBe('%xE9');
    });
  });
});
