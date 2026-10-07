import { assert, describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { Choice } from './Choice.js';
import { Option } from './Option.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

class SpecificChoice extends Choice<[Character, Character]> {}

describe('Choice', () => {
  describe('instanceof', () => {
    it('must recognise an instance of its own class', () => {
      expect(new Choice(0, A)).toBeInstanceOf(Choice);
      expect(new SpecificChoice(0, A)).toBeInstanceOf(Choice);
    });

    it('must not recognise an instance of the base class as a subclass', () => {
      expect(new Choice(0, A)).not.toBeInstanceOf(SpecificChoice);
    });

    it('must not recognise other values', () => {
      expect(new Option(A)).not.toBeInstanceOf(Choice);
      expect(undefined).not.toBeInstanceOf(Choice);
    });
  });

  describe('index', () => {
    it('must return the index of the alternative taken', () => {
      expect(new Choice<[Character, Character]>(1, B).index()).toBe(1);
    });
  });

  describe('alternative', () => {
    it('must preview the value of the alternative taken', () => {
      const previewed = Choice.alternative<[Character, Character], 1>(
        1
      ).preview(new Choice<[Character, Character]>(1, B));

      assert(previewed.ok());
      expect(previewed.value()).toBe(B);
    });

    it('must not preview another alternative', () => {
      expect(
        Choice.alternative<[Character, Character], 0>(0)
          .preview(new Choice<[Character, Character]>(1, B))
          .ok()
      ).toBe(false);
    });

    it('must review a value as a choice of the alternative', () => {
      expect(
        Choice.alternative<[Character, Character], 1>(1).review(A)
      ).toEqual(new Choice<[Character, Character]>(1, A));
    });

    it('must type the focus by its alternative', () => {
      expectTypeOf(
        Choice.alternative<[Character, Option<Character>], 1>(1).review(
          new Option(A)
        )
      ).toEqualTypeOf<Choice<[Character, Option<Character>]>>();
    });
  });

  describe('value', () => {
    it('must return the value of the alternative taken', () => {
      expect(new Choice<[Character, Character]>(1, B).value()).toBe(B);
    });

    it('must type the value as any of the alternatives', () => {
      expectTypeOf(
        new Choice<[Character, Option<Character>]>(0, A).value()
      ).toEqualTypeOf<Character | Option<Character>>();
    });
  });

  describe('match', () => {
    it('must hand the value to the case of the alternative taken', () => {
      expect(
        new Choice<[Character, Character, Character]>(1, B).match([
          () => 'first',
          value => `second ${String(value)}`,
          () => 'third',
        ])
      ).toBe('second b');
    });

    it('must type each case by its alternative', () => {
      new Choice<[Character, Option<Character>]>(1, new Option(A)).match([
        literal => expectTypeOf(literal).toEqualTypeOf<Character>(),
        option => expectTypeOf(option).toEqualTypeOf<Option<Character>>(),
      ]);
    });

    it('must require a case for every alternative', () => {
      expectTypeOf<
        Choice.Cases<[Character, Option<Character>], number>
      >().toEqualTypeOf<
        readonly [
          (value: Character) => number,
          (value: Option<Character>) => number,
        ]
      >();
    });

    it('must throw where no case covers the alternative taken', () => {
      expect(() => new Choice(2, A).match([() => 'first'])).toThrow(
        new RangeError('No case for alternative 2 of 1')
      );
    });
  });

  describe('children', () => {
    it('must have the value of the alternative taken as its only child', () => {
      expect(new Choice<[Character, Character]>(1, B).children()).toEqual([B]);
    });
  });

  describe('equals', () => {
    it('must equal a choice of the same alternative with an equal value', () => {
      expect(
        new Choice(0, A).equals(new Choice(0, new Character(CodePoint.of('a'))))
      ).toBe(true);
    });

    it('must not equal a choice of the same alternative with a different value', () => {
      expect(
        new Choice<[Character, Character]>(1, A).equals(
          new Choice<[Character, Character]>(1, B)
        )
      ).toBe(false);
    });

    it('must not equal a choice of another alternative with an equal value', () => {
      expect(
        new Choice<[Character, Character]>(0, A).equals(
          new Choice<[Character, Character]>(1, A)
        )
      ).toBe(false);
    });

    it('must not equal anything that is not a choice', () => {
      expect(new Choice(0, A).equals(A)).toBe(false);
    });
  });

  describe('toString', () => {
    it('must be the text of its value, without the index', () => {
      expect(String(new Choice<[Character, Character]>(1, B))).toBe('b');
    });
  });
});
