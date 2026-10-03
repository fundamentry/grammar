import { assert, describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { PrintMismatchError, SymbolMismatchError } from '#project/error';
import { Literal, Repetition } from '#project/tree';

import { Symbol } from './Symbol.js';

const ZERO = new Literal(CodePoint.of(0x30));

const ONE = new Literal(CodePoint.of(0x31));

const broken = new Repetition<Literal | Stub>([ZERO]);

const error = new Error('Oops!');

class Stub extends Symbol<Repetition<Literal | Stub>> {
  protected override isValid(elements: Repetition<Literal | Stub>): boolean {
    if (elements === broken) throw error;

    return elements.elements().length > 0;
  }

  value() {
    return this.elements();
  }
}

class Twin extends Symbol<Repetition<Literal | Stub>> {
  protected override isValid(): boolean {
    return true;
  }
}

const stub = (...elements: readonly (Literal | Stub)[]): Stub =>
  new Stub(new Repetition(elements));

describe('Symbol', () => {
  describe('constructor', () => {
    it('must accept a semantically valid value', () => {
      expect(() => stub(ZERO)).not.toThrow();
    });

    it('must throw for a semantically invalid value', () => {
      expect(() => stub()).toThrow(SymbolMismatchError);
    });

    it('must mention the value and the class name in the error message', () => {
      expect(() => stub()).toThrow(`'' does not match ${Stub.name}`);
    });
  });

  describe('prism', () => {
    const prism = Stub.prism();

    describe('preview', () => {
      it('must succeed for a semantically valid value', () => {
        const result = prism.preview(new Repetition([ZERO]));

        assert(result.ok());
        expect(result.value()).toEqual(stub(ZERO));
      });

      it('must fail for a semantically invalid value', () => {
        expect(prism.preview(new Repetition([])).ok()).toBe(false);
      });

      it('must propagate errors that are not symbol mismatches', () => {
        expect(() => prism.preview(broken)).toThrow(error);
      });
    });

    describe('review', () => {
      it('must return the elements of a valid instance', () => {
        const elements = new Repetition([ZERO]);

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
      const elements = new Repetition([ZERO]);

      expect(new Stub(elements).value()).toBe(elements);
    });
  });

  describe('equals', () => {
    it('must equal a symbol of the same class with equal elements', () => {
      expect(stub(ZERO, ONE).equals(stub(ZERO, ONE))).toBe(true);
    });

    it('must not equal a symbol of the same class with different elements', () => {
      expect(stub(ZERO, ONE).equals(stub(ONE, ZERO))).toBe(false);
    });

    it('must not equal a symbol of a different class with equal elements', () => {
      const elements = new Repetition([ZERO]);

      expect(new Stub(elements).equals(new Twin(elements))).toBe(false);
    });

    it('must compare nested symbols structurally', () => {
      expect(stub(stub(ZERO), ONE).equals(stub(stub(ZERO), ONE))).toBe(true);
      expect(stub(stub(ZERO), ONE).equals(stub(stub(ONE), ONE))).toBe(false);
    });

    it('must tell nesting apart even when it prints the same', () => {
      const nested = stub(stub(ZERO, ONE));
      const flat = stub(ZERO, ONE);

      expect(nested.toString()).toBe(flat.toString());
      expect(nested.equals(flat)).toBe(false);
    });

    it.each([
      ['its elements', new Repetition([ZERO])],
      ['undefined', undefined],
    ])('must not equal %s', (_, other) => {
      expect(stub(ZERO).equals(other)).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its elements', () => {
      expect(stub(ZERO).toString()).toBe('0');
    });

    it('must recursively print a symbol composed of other symbols', () => {
      expect(stub(stub(ZERO), ONE).toString()).toBe('01');
    });
  });
});
