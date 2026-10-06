import { describe, expect, it } from 'vitest';

import { Range } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { HexValue } from './HexValue.js';

describe('HexValue', () => {
  describe('range', () => {
    it('must render a range of code points', () => {
      expect(
        String(
          HexValue.range(Range.closed(CodePoint.of('A'), CodePoint.of('Z')))
        )
      ).toBe('%x41-5A');
    });

    it('must leave out the endpoints of an open range', () => {
      expect(
        String(HexValue.range(Range.open(CodePoint.of('@'), CodePoint.of('['))))
      ).toBe('%x41-5A');
    });

    it('must bound an unbounded range by the first and last code points', () => {
      expect(String(HexValue.range(Range.atLeast(CodePoint.of('A'))))).toBe(
        '%x41-10FFFF'
      );
      expect(String(HexValue.range(Range.lessThan(CodePoint.of('A'))))).toBe(
        '%x00-40'
      );
    });

    it('must render a single code point, padded to two digits', () => {
      expect(String(HexValue.range(Range.singleton(CodePoint.of(9))))).toBe(
        '%x09'
      );
    });
  });

  describe('sequence', () => {
    it('must render code points one after another', () => {
      expect(String(HexValue.sequence(Array.from('a"b', CodePoint.of)))).toBe(
        '%x61.22.62'
      );
    });
  });

  describe('equals', () => {
    it('must equal a value that renders alike only', () => {
      const a = CodePoint.of('a');

      expect(
        HexValue.range(Range.singleton(a)).equals(HexValue.sequence([a]))
      ).toBe(true);
      expect(
        HexValue.range(Range.singleton(a)).equals(
          HexValue.sequence([CodePoint.of('b')])
        )
      ).toBe(false);
      expect(HexValue.sequence([a]).equals('%x61')).toBe(false);
    });
  });
});
