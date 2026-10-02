import { assert, describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { SymbolMismatchError } from '#project/error';

import { Nonterminal } from './Nonterminal.js';
import { Symbol } from './Symbol.js';

const ACCEPTED = CodePoint.of(0x30);

class Stub extends Nonterminal<readonly (CodePoint | Stub)[]> {
  protected override isValid(elements: readonly (CodePoint | Stub)[]): boolean {
    return elements.length > 0;
  }
}

describe('Nonterminal', () => {
  describe('constructor', () => {
    it('must be a Symbol', () => {
      expect(new Stub([ACCEPTED])).toBeInstanceOf(Symbol);
    });

    it('must accept a semantically valid value', () => {
      expect(() => new Stub([ACCEPTED])).not.toThrow();
    });

    it('must throw for a semantically invalid value', () => {
      expect(() => new Stub([])).toThrow(SymbolMismatchError);
    });

    it('must mention the value and the class name in the error message', () => {
      expect(() => new Stub([])).toThrow(`'' does not match ${Stub.name}`);
    });
  });

  describe('prism', () => {
    const prism = Stub.prism();

    describe('preview', () => {
      it('must succeed for a semantically valid value', () => {
        const result = prism.preview([ACCEPTED]);

        assert(result.ok());
        expect(result.value().toString()).toBe(ACCEPTED.toString());
      });

      it('must fail for a semantically invalid value', () => {
        expect(prism.preview([]).ok()).toBe(false);
      });
    });

    describe('review', () => {
      it('must return the elements of a valid instance', () => {
        const elements = [ACCEPTED];

        expect(prism.review(new Stub(elements))).toBe(elements);
      });
    });
  });

  describe('toString', () => {
    it('must print its elements', () => {
      expect(new Stub([ACCEPTED]).toString()).toBe(ACCEPTED.toString());
    });

    it('must recursively print a symbol composed of other symbols', () => {
      expect(new Stub([new Stub([ACCEPTED]), ACCEPTED]).toString()).toBe(
        `${ACCEPTED.toString()}${ACCEPTED.toString()}`
      );
    });
  });
});
