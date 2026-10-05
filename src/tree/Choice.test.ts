import { describe, expect, expectTypeOf, it } from 'vitest';

import { Left, Right } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { Choice } from './Choice.js';
import { Literal } from './Literal.js';
import { Option } from './Option.js';
import { Sequence } from './Sequence.js';

const A = new Literal(CodePoint.of('a'));
const B = new Literal(CodePoint.of('b'));
const C = new Literal(CodePoint.of('c'));

class SpecificChoice extends Choice<Literal, Literal> {}

describe('Choice', () => {
  describe('instanceof', () => {
    it('must recognise an instance of its own class', () => {
      expect(new Choice(new Left(A))).toBeInstanceOf(Choice);
      expect(new SpecificChoice(new Left(A))).toBeInstanceOf(Choice);
    });

    it('must not recognise an instance of the base class as a subclass', () => {
      expect(new Choice(new Left(A))).not.toBeInstanceOf(SpecificChoice);
    });

    it('must not recognise other values', () => {
      expect(new Option(A)).not.toBeInstanceOf(Choice);
      expect(new Left(A)).not.toBeInstanceOf(Choice);
      expect(undefined).not.toBeInstanceOf(Choice);
    });
  });

  describe('either', () => {
    it('must return the side it was made with', () => {
      const either = new Right(B);

      expect(new Choice(either).either()).toBe(either);
    });
  });

  describe('value', () => {
    it('must return the value of either side', () => {
      expect(new Choice(new Left(A)).value()).toBe(A);
      expect(new Choice(new Right(B)).value()).toBe(B);
    });

    it('must unwrap nested choices on either side', () => {
      expect(new Choice(new Left(new Choice(new Right(B)))).value()).toBe(B);
      expect(new Choice(new Right(new Choice(new Left(A)))).value()).toBe(A);
    });

    it('must not unwrap a choice nested inside another node', () => {
      const sequence = new Sequence([new Choice(new Left(A))]);

      expect(new Choice(new Left(sequence)).value()).toBe(sequence);
    });
  });

  describe('equals', () => {
    it('must equal a choice of the same side with an equal value', () => {
      expect(
        new Choice(new Left(A)).equals(
          new Choice(new Left(new Literal(CodePoint.of('a'))))
        )
      ).toBe(true);
    });

    it('must not equal a choice of the same side with a different value', () => {
      expect(new Choice(new Right(A)).equals(new Choice(new Right(B)))).toBe(
        false
      );
    });

    it('must not equal a choice of the other side with an equal value', () => {
      expect(new Choice(new Left(A)).equals(new Choice(new Right(A)))).toBe(
        false
      );
      expect(new Choice(new Right(A)).equals(new Choice(new Left(A)))).toBe(
        false
      );
    });

    it('must not equal anything that is not a choice', () => {
      expect(new Choice(new Left(A)).equals(A)).toBe(false);
      expect(new Choice(new Left(A)).equals(new Left(A))).toBe(false);
    });
  });

  describe('toString', () => {
    it('must be the text of its value, without the side', () => {
      expect(String(new Choice(new Left(A)))).toBe('a');
      expect(String(new Choice(new Right(new Choice(new Left(C)))))).toBe('c');
    });
  });

  describe('Of', () => {
    it('must nest alternatives the way chained alternation does', () => {
      expectTypeOf<Choice.Of<[Literal, Option<Literal>]>>().toEqualTypeOf<
        Choice<Literal, Option<Literal>>
      >();
      expectTypeOf<
        Choice.Of<[Literal, Option<Literal>, Sequence<readonly [Literal]>]>
      >().toEqualTypeOf<
        Choice<Choice<Literal, Option<Literal>>, Sequence<readonly [Literal]>>
      >();
    });
  });

  describe('Merged', () => {
    it('must flatten nested choices into a union of their values', () => {
      expectTypeOf<
        Choice.Merged<
          Choice.Of<[Literal, Option<Literal>, Sequence<readonly [Literal]>]>
        >
      >().toEqualTypeOf<
        Literal | Option<Literal> | Sequence<readonly [Literal]>
      >();
    });

    it('must leave a value that is not a choice as it is', () => {
      expectTypeOf<Choice.Merged<Literal>>().toEqualTypeOf<Literal>();
    });
  });
});
