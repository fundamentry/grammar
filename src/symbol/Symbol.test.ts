import { assert, describe, expect, it } from 'vitest';

import { Failure } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { SymbolMismatchError } from '#project/error';
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

    it('must mention the value and the rule in the error message', () => {
      expect(() => stub()).toThrow(`'' does not match ${Stub.name}`);
    });

    it('must mention a rule its class renames in the error message', () => {
      class Digits extends Stub {
        static override rule(): string {
          return 'digit-list';
        }
      }

      expect(() => new Digits(new Repetition([]))).toThrow(
        "'' does not match digit-list"
      );
    });
  });

  describe('instanceof', () => {
    it('must recognise an instance of its own class and of Symbol', () => {
      expect(stub(ZERO)).toBeInstanceOf(Stub);
      expect(stub(ZERO)).toBeInstanceOf(Symbol);
    });

    it('must not recognise an instance of a different symbol class', () => {
      expect(new Twin(new Repetition([ZERO]))).not.toBeInstanceOf(Stub);
    });

    it.each([
      ['a non-object', 0],
      ['an object it did not construct', Object.create(Stub.prototype)],
    ])('must not recognise %s', (_, value) => {
      expect(value).not.toBeInstanceOf(Stub);
    });
  });

  describe('rule', () => {
    it('must default to the name of the class', () => {
      expect(Stub.rule()).toBe('Stub');
    });

    it('must let a subclass name a rule its class name cannot spell', () => {
      class IpLiteral extends Twin {
        static override rule(): string {
          return 'IP-literal';
        }
      }

      expect(IpLiteral.rule()).toBe('IP-literal');
    });
  });

  describe('conversion', () => {
    const conversion = Stub.conversion();

    describe('to', () => {
      it('must succeed for a semantically valid value', () => {
        const result = conversion.to(new Repetition([ZERO]));

        assert(result.ok());
        expect(result.value()).toEqual(stub(ZERO));
      });

      it('must fail for a semantically invalid value', () => {
        expect(conversion.to(new Repetition([])).ok()).toBe(false);
      });

      it('must propagate errors that are not symbol mismatches', () => {
        expect(() => conversion.to(broken)).toThrow(error);
      });
    });

    describe('from', () => {
      it('must return the elements of a valid instance', () => {
        const elements = new Repetition([ZERO]);
        const result = conversion.from(new Stub(elements));

        assert(result.ok());
        expect(result.value()).toBe(elements);
      });

      it('must reject a value that is not an instance of this symbol, naming the value and the class', () => {
        expect(conversion.from({} as unknown as Stub)).toEqual(
          new Failure(`'[object Object]' is not ${Stub.name}`)
        );
      });

      it('must reject an instance of a different symbol class', () => {
        expect(
          conversion.from(new Twin(new Repetition([ZERO])) as unknown as Stub)
        ).toEqual(new Failure(`'0' is not ${Stub.name}`));
      });

      it('must name a rule its class renames', () => {
        class Digits extends Stub {
          static override rule(): string {
            return 'digit-list';
          }
        }

        expect(Digits.conversion().from(stub(ZERO))).toEqual(
          new Failure("'0' is not digit-list")
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
