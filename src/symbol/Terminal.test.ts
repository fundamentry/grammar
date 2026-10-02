import { assert, describe, expect, it } from 'vitest';

import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { SymbolMismatchError } from '#project/error';

import { Symbol } from './Symbol.js';
import { Terminal } from './Terminal.js';

const ACCEPTED = CodePoint.of(0x30);

const REJECTED = CodePoint.of(0x31);

class Stub extends Terminal {
  protected override domain(): RangeSet<CodePoint> {
    return RangeSet.from([Range.singleton(ACCEPTED)]);
  }
}

describe('Terminal', () => {
  describe('constructor', () => {
    it('must be a Symbol', () => {
      expect(new Stub(ACCEPTED)).toBeInstanceOf(Symbol);
    });

    it('must accept a semantically valid value', () => {
      expect(() => new Stub(ACCEPTED)).not.toThrow();
    });

    it('must throw for a semantically invalid value', () => {
      expect(() => new Stub(REJECTED)).toThrow(SymbolMismatchError);
    });

    it('must mention the value and the class name in the error message', () => {
      expect(() => new Stub(REJECTED)).toThrow(
        `'${REJECTED.toString()}' does not match ${Stub.name}`
      );
    });
  });

  describe('prism', () => {
    const prism = Stub.prism();

    describe('preview', () => {
      it('must succeed for a semantically valid value', () => {
        const result = prism.preview(ACCEPTED);

        assert(result.ok());
        expect(result.value().toString()).toBe(ACCEPTED.toString());
      });

      it('must fail for a semantically invalid value', () => {
        expect(prism.preview(REJECTED).ok()).toBe(false);
      });
    });

    describe('review', () => {
      it('must return the elements of a valid instance', () => {
        expect(prism.review(new Stub(ACCEPTED)).toString()).toBe(
          ACCEPTED.toString()
        );
      });
    });
  });

  describe('toString', () => {
    it('must print its elements', () => {
      expect(new Stub(ACCEPTED).toString()).toBe(ACCEPTED.toString());
    });
  });
});
