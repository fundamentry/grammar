import { assert, describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { PrintMismatchError, SymbolMismatchError } from '#project/error';

import { Symbol } from './Symbol.js';

const ACCEPTED = CodePoint.of(0x30);

const broken: readonly (CodePoint | Stub)[] = [ACCEPTED];

const error = new Error('Oops!');

class Stub extends Symbol<readonly (CodePoint | Stub)[]> {
  protected override isValid(elements: readonly (CodePoint | Stub)[]): boolean {
    if (elements === broken) throw error;

    return elements.length > 0;
  }

  value() {
    return this.elements();
  }
}

describe('Symbol', () => {
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

      it('must propagate errors that are not symbol mismatches', () => {
        expect(() => prism.preview(broken)).toThrow(error);
      });
    });

    describe('review', () => {
      it('must return the elements of a valid instance', () => {
        const elements = [ACCEPTED];

        expect(prism.review(new Stub(elements))).toBe(elements);
      });

      it('must throw for a value that is not an instance of this symbol', () => {
        expect(() => prism.review({} as unknown as Stub)).toThrow(
          PrintMismatchError
        );
      });

      it('must mention the value and the class name in the error message', () => {
        expect(() => prism.review({} as unknown as Stub)).toThrow(
          `'[object Object]' is not ${Stub.name}`
        );
      });
    });
  });

  describe('elements', () => {
    it('must return the elements passed to the constructor', () => {
      const elements = [ACCEPTED];

      expect(new Stub(elements).value()).toBe(elements);
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
