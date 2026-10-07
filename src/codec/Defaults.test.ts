import { assert, describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { type Result, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Characters, type Expectation, Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Repetition,
  Rule,
  Terminal,
} from '#project/expression';
import { Character } from '#project/tree';

import { Defaults } from './Defaults.js';

const conversion = PartialIso.of<CodePoint, Character, string, string>(
  codePoint => new Success(new Character(codePoint)),
  character => new Success(character.codePoint())
);

const characters = (...ranges: readonly Range<CodePoint>[]) =>
  new Terminal(conversion, new Characters(RangeSet.from(ranges)));

const letter = (character: string) =>
  characters(Range.singleton(CodePoint.of(character)));

const digit = characters(Range.closed(CodePoint.of('0'), CodePoint.of('9')));

const text = (expression: Expression<CodePoint>) => {
  const result = new Defaults().text(expression);

  assert(result.ok());

  return result.value();
};

const missing = (result: Result<string, Expectation>) => {
  assert(!result.ok());

  return String(result.error());
};

describe('Defaults', () => {
  describe('text', () => {
    it('must default a terminal of one character to it', () => {
      expect(text(letter('a'))).toBe('a');
    });

    it('must default a terminal of one character in a half-open range', () => {
      expect(
        text(characters(Range.closedOpen(CodePoint.of('a'), CodePoint.of('b'))))
      ).toBe('a');
    });

    it('must not default a terminal of several characters', () => {
      expect(missing(new Defaults().text(digit))).toBe('%x30-39');
    });

    it('must not default a terminal of several ranges', () => {
      expect(
        new Defaults()
          .text(
            characters(
              Range.singleton(CodePoint.of('a')),
              Range.singleton(CodePoint.of('c'))
            )
          )
          .ok()
      ).toBe(false);
    });

    it('must not default a terminal of unbounded characters', () => {
      expect(
        new Defaults().text(characters(Range.atLeast(CodePoint.of('a')))).ok()
      ).toBe(false);
    });

    it('must not default a terminal of anything but characters', () => {
      expect(
        missing(new Defaults().text(new Terminal(conversion, new Named('x'))))
      ).toBe('x');
    });

    it('must default a concatenation to the defaults of its elements', () => {
      expect(text(new Concatenation([letter('a'), letter('b')]))).toBe('ab');
    });

    it('must not default a concatenation with an element without one', () => {
      expect(
        new Defaults().text(new Concatenation([letter('a'), digit])).ok()
      ).toBe(false);
    });

    it('must default an alternation to its first alternative with one', () => {
      expect(text(new Alternation([digit, letter('b'), letter('c')]))).toBe(
        'b'
      );
    });

    it('must default an alternation to its shortest default', () => {
      expect(
        text(
          new Alternation([
            new Concatenation([letter('a'), letter('b')]),
            letter('c'),
            letter('d'),
          ])
        )
      ).toBe('c');
    });

    it('must not default an alternation without an alternative with one', () => {
      expect(new Defaults().text(new Alternation([digit, digit])).ok()).toBe(
        false
      );
    });

    it('must default an option to nothing', () => {
      expect(text(new Optional(digit))).toBe('');
    });

    it('must default a repetition to its fewest elements', () => {
      expect(
        text(
          new Repetition(
            letter('a'),
            Range.closed(Integer.of(2), Integer.of(4))
          )
        )
      ).toBe('aa');
    });

    it('must default a repetition that may be empty to nothing', () => {
      expect(text(new Repetition(digit, Range.atLeast(Integer.of(0))))).toBe(
        ''
      );
    });

    it('must default a repetition without a fewest count to nothing', () => {
      expect(text(new Repetition(digit, Range.atMost(Integer.of(3))))).toBe('');
    });

    it('must see through a label and a reference', () => {
      expect(
        text(new Label(new Reference(() => letter('a')), new Named('a')))
      ).toBe('a');
    });

    it('must default a rule to the default of its body', () => {
      expect(text(new Rule(letter('a'), () => ({ name: () => 'A' })))).toBe(
        'a'
      );
    });

    it('must not default a rule by way of itself', () => {
      const identity = { name: () => 'loop' };
      const loop: Expression<CodePoint> = new Rule(
        new Concatenation([letter('a'), new Reference(() => loop)]),
        () => identity
      );

      expect(missing(new Defaults().text(loop))).toBe('loop');
    });

    it('must default a rule by way of another alternative than itself', () => {
      const identity = { name: () => 'list' };
      const list: Expression<CodePoint> = new Rule(
        new Alternation([
          new Concatenation([new Reference(() => list), letter(',')]),
          letter('a'),
        ]),
        () => identity
      );

      expect(text(list)).toBe('a');
    });
  });
});
