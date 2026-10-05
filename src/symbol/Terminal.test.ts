import { assert, describe, expect, it } from 'vitest';

import { Failure, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { SymbolMismatchError } from '#project/error';
import { Misprint } from '#project/misprint';
import { Literal } from '#project/tree';

import { Symbol } from './Symbol.js';
import { Terminal } from './Terminal.js';

const DIGITS = RangeSet.from([
  Range.closed(CodePoint.of(0x30), CodePoint.of(0x39)),
]);

class Digit extends Terminal {
  protected static override readonly domain = DIGITS;
}

class Twin extends Terminal {
  protected static override readonly domain = DIGITS;
}

class Undeclared extends Terminal {}

const FIVE = new Literal(CodePoint.of('5'));

const LETTER = new Literal(CodePoint.of('a'));

describe('Terminal', () => {
  describe('constructor', () => {
    it('must be a Symbol', () => {
      expect(new Digit(FIVE)).toBeInstanceOf(Symbol);
    });

    it('must accept a literal within its domain', () => {
      expect(() => new Digit(FIVE)).not.toThrow();
    });

    it('must throw for a literal outside its domain', () => {
      expect(() => new Digit(LETTER)).toThrow(
        new SymbolMismatchError(`'a' does not match ${Digit.name}`)
      );
    });

    it('must reject every literal when its domain is not declared', () => {
      expect(() => new Undeclared(FIVE)).toThrow(SymbolMismatchError);
    });
  });

  describe('production', () => {
    const production = Digit.production();

    it('must parse a code point within its domain into the terminal', () => {
      expect(production.parse([CodePoint.of('5')])).toEqual(
        new Success(new Digit(FIVE))
      );
    });

    it('must reject a code point outside its domain, naming the domain', () => {
      const outcome = production.parse([CodePoint.of('a')]);

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        `Expected one of ${DIGITS.toString()}, got 'a'`
      );
    });

    it('must print the terminal back to its code point', () => {
      expect(
        production.print(new Digit(FIVE)).map(tokens => [...tokens])
      ).toEqual(new Success([CodePoint.of('5')]));
    });

    it('must reject printing a terminal of a different class', () => {
      expect(production.print(new Twin(FIVE))).toEqual(
        new Failure(
          Misprint.of(`'5' is not ${Digit.name}`).within({
            node: 'rule',
            name: Digit.name,
          })
        )
      );
    });
  });

  describe('equals', () => {
    it('must equal a terminal of the same class with an equal literal', () => {
      expect(new Digit(FIVE).equals(new Digit(FIVE))).toBe(true);
    });

    it('must not equal a terminal of a different class with an equal literal', () => {
      expect(new Digit(FIVE).equals(new Twin(FIVE))).toBe(false);
    });
  });
});
