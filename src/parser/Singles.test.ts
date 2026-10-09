import { assert, describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { Range } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Repetition,
  Rule,
  Separated,
  Terminal,
} from '#project/expression';
import { Character, Choice, Nonterminal, Sequence } from '#project/tree';

import { Singles } from './Singles.js';

const character = (name: string, pattern: RegExp) =>
  new Terminal(
    PartialIso.of<CodePoint, Character, string, string>(
      token =>
        pattern.test(token.toString())
          ? new Success(new Character(token))
          : new Failure(`Expected ${name}`),
      value => new Success(value.codePoint())
    ),
    new Named(name)
  );

const digit = character('a digit', /\d/u);

const letter = character('a letter', /[a-z]/u);

describe('Singles', () => {
  describe('of', () => {
    it('must match a token by a terminal', () => {
      const single = new Singles<CodePoint>().of(digit);

      assert(single);
      expect(single.match(CodePoint.of('1'))).toEqual(
        new Character(CodePoint.of('1'))
      );
      expect(single.match(CodePoint.of('x'))).toBeUndefined();
      expect(single.expected).toEqual([new Named('a digit')]);
    });

    it('must match a token into a sequence of one element', () => {
      const single = new Singles<CodePoint>().of(new Concatenation([digit]));

      assert(single);
      expect(single.match(CodePoint.of('1'))).toEqual(
        new Sequence([new Character(CodePoint.of('1'))])
      );
      expect(single.match(CodePoint.of('x'))).toBeUndefined();
    });

    it('must not match a token by a sequence of two elements', () => {
      expect(
        new Singles<CodePoint>().of(new Concatenation([digit, digit]))
      ).toBeUndefined();
    });

    it('must not match a token by an empty sequence', () => {
      expect(
        new Singles<CodePoint>().of(new Concatenation([]))
      ).toBeUndefined();
    });

    it('must match a token into the choice of the first alternative that matches it', () => {
      const single = new Singles<CodePoint>().of(
        new Alternation([letter, digit, digit])
      );

      assert(single);
      expect(single.match(CodePoint.of('1'))).toEqual(
        new Choice(1, new Character(CodePoint.of('1')))
      );
      expect(single.match(CodePoint.of('!'))).toBeUndefined();
      expect(single.expected).toEqual([
        new Named('a letter'),
        new Named('a digit'),
        new Named('a digit'),
      ]);
    });

    it('must not match a token by an alternation with an alternative that may not consume one', () => {
      expect(
        new Singles<CodePoint>().of(
          new Alternation([digit, new Optional(digit)])
        )
      ).toBeUndefined();
    });

    it('must not match a token by an option', () => {
      expect(new Singles<CodePoint>().of(new Optional(digit))).toBeUndefined();
    });

    it('must not match a token by a repetition', () => {
      expect(
        new Singles<CodePoint>().of(
          new Repetition(digit, Range.singleton(Integer.of(1)))
        )
      ).toBeUndefined();
    });

    it('must not match a token by a list', () => {
      expect(
        new Singles<CodePoint>().of(
          new Separated(digit, letter, Range.singleton(Integer.of(1)))
        )
      ).toBeUndefined();
    });

    it('must expect a label instead of what it labels', () => {
      const single = new Singles<CodePoint>().of(
        new Label(digit, new Named('a number'))
      );

      assert(single);
      expect(single.match(CodePoint.of('1'))).toEqual(
        new Character(CodePoint.of('1'))
      );
      expect(single.expected).toEqual([new Named('a number')]);
    });

    it('must match a token into a nonterminal of a rule', () => {
      const rule = { name: () => 'DIGIT' };
      const single = new Singles<CodePoint>().of(new Rule(digit, () => rule));

      assert(single);
      expect(single.match(CodePoint.of('1'))).toEqual(
        new Nonterminal(rule, new Character(CodePoint.of('1')))
      );
      expect(single.match(CodePoint.of('x'))).toBeUndefined();
      expect(single.expected).toEqual([new Named('DIGIT')]);
    });

    it('must match a token through a reference', () => {
      const single = new Singles<CodePoint>().of(new Reference(() => digit));

      assert(single);
      expect(single.match(CodePoint.of('1'))).toEqual(
        new Character(CodePoint.of('1'))
      );
    });

    it('must not match a token by an expression that refers to itself', () => {
      const rule: Expression<CodePoint> = new Alternation([
        new Reference(() => rule),
        digit,
      ]);

      expect(new Singles<CodePoint>().of(rule)).toBeUndefined();
    });

    it('must not match a token by expressions that refer to each other', () => {
      const grammar: {
        readonly first: Expression<CodePoint>;
        readonly second: Expression<CodePoint>;
      } = {
        first: new Alternation([new Reference(() => grammar.second), digit]),
        second: new Alternation([new Reference(() => grammar.first), letter]),
      };
      const singles = new Singles<CodePoint>();

      expect(singles.of(grammar.first)).toBeUndefined();
      expect(singles.of(grammar.second)).toBeUndefined();
    });

    it('must analyse an expression once', () => {
      const singles = new Singles<CodePoint>();

      expect(singles.of(digit)).toBe(singles.of(digit));
    });
  });
});
