import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Characters, Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  Label,
  Optional,
  Reference,
  Repetition,
  Rule,
  Terminal,
} from '#project/expression';
import { Character } from '#project/tree';

import { Parts } from './Parts.js';

const conversion = PartialIso.of<CodePoint, Character, string, string>(
  codePoint => new Success(new Character(codePoint)),
  character => new Success(character.codePoint())
);

const letter = (character: string) =>
  new Terminal(
    conversion,
    new Characters(RangeSet.from([Range.singleton(CodePoint.of(character))]))
  );

describe('Parts', () => {
  describe('at', () => {
    it('must find the element of a concatenation at the index', () => {
      const b = letter('b');

      expect(new Parts(new Concatenation([letter('a'), b])).at(1)).toBe(b);
    });

    it('must find the alternative of an alternation at the index', () => {
      const b = letter('b');

      expect(new Parts(new Alternation([letter('a'), b])).at(1)).toBe(b);
    });

    it('must find the element of an option', () => {
      const a = letter('a');

      expect(new Parts(new Optional(a)).at(0)).toBe(a);
    });

    it('must find the element of a repetition', () => {
      const a = letter('a');

      expect(
        new Parts(new Repetition(a, Range.atLeast(Integer.of(0)))).at(0)
      ).toBe(a);
    });

    it('must find the body of a rule', () => {
      const a = letter('a');

      expect(new Parts(new Rule(a, () => ({ name: () => 'A' }))).at(0)).toBe(a);
    });

    it('must see through a label', () => {
      const b = letter('b');

      expect(
        new Parts(
          new Label(new Concatenation([letter('a'), b]), new Named('pair'))
        ).at(1)
      ).toBe(b);
    });

    it('must see through a reference', () => {
      const b = letter('b');

      expect(
        new Parts(new Reference(() => new Concatenation([letter('a'), b]))).at(
          1
        )
      ).toBe(b);
    });

    it('must refuse an index it has no part at', () => {
      expect(() => new Parts(letter('a')).at(0)).toThrow(
        new RangeError('No part at 0')
      );
    });
  });
});
