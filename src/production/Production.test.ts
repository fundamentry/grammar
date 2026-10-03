import { assert, describe, expect, it } from 'vitest';

import { Failure, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Literal } from '#project/tree';

import { Production } from './Production.js';

const DIGITS = RangeSet.from([
  Range.closed(CodePoint.of(0x30), CodePoint.of(0x39)),
]);

const ZERO = CodePoint.of(0x30);

const LETTER = CodePoint.of(0x61);

describe('Production', () => {
  describe('literal', () => {
    const literal = Production.literal(DIGITS);

    it('must parse a code point within its ranges', () => {
      const outcome = literal.parse(Point.of([ZERO]));

      assert(outcome.ok());
      expect(outcome.value().value).toEqual(new Literal(ZERO));
      expect(outcome.value().rest.isAtEnd()).toBe(true);
    });

    it('must reject a code point outside its ranges, naming both', () => {
      const outcome = literal.parse(Point.of([LETTER]));

      assert(!outcome.ok());
      expect(outcome.error().value).toBe(
        `Expected a code point in ${DIGITS.toString()}, got 'a'`
      );
    });

    it('must print the code point of a literal within its ranges', () => {
      expect(literal.print(new Literal(ZERO))).toEqual(new Success([ZERO]));
    });

    it('must reject printing a literal outside its ranges', () => {
      expect(literal.print(new Literal(LETTER))).toEqual(
        new Failure("'a' does not belong to this rule")
      );
    });
  });
});
