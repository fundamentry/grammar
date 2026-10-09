import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Characters, Named } from '#project/expectation';
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

import { Gaps } from './Gaps.js';

const conversion = PartialIso.of<CodePoint, Character, string, string>(
  codePoint => new Success(new Character(codePoint)),
  character => new Success(character.codePoint())
);

const letter = new Terminal(
  conversion,
  new Characters(RangeSet.from([Range.singleton(CodePoint.of('a'))]))
);

const TARGET = { name: () => 'target' };
const OTHER = { name: () => 'other' };

const target = new Rule(letter, () => TARGET);

const gaps = (expression: Expression<CodePoint>) =>
  new Gaps([TARGET]).from(expression);

describe('Gaps', () => {
  describe('from', () => {
    it('must find none in the target itself', () => {
      expect(gaps(target)).toEqual([]);
    });

    it('must find one where the target does not occur', () => {
      expect(gaps(letter)).toEqual(['/']);
    });

    it('must find none in a concatenation with the target in it', () => {
      expect(gaps(new Concatenation([letter, target]))).toEqual([]);
    });

    it('must find the concatenation itself when none of its elements holds the target', () => {
      expect(gaps(new Concatenation([letter, new Optional(target)]))).toEqual([
        '/',
      ]);
    });

    it('must find none in an alternation whose every alternative holds the target', () => {
      expect(
        gaps(new Alternation([target, new Concatenation([letter, target])]))
      ).toEqual([]);
    });

    it('must find each alternative without the target', () => {
      expect(gaps(new Alternation([letter, target, letter]))).toEqual([
        '/choice[0]',
        '/choice[2]',
      ]);
    });

    it('must find an option, even of the target', () => {
      expect(gaps(new Optional(target))).toEqual(['/option']);
    });

    it('must find a repetition, even of the target', () => {
      expect(
        gaps(new Repetition(target, Range.closed(Integer.of(1), Integer.of(2))))
      ).toEqual(['/']);
    });

    it('must name the rules, labels and references on the way', () => {
      const other = new Rule(new Alternation([target, letter]), () => OTHER);

      expect(
        gaps(new Reference(() => new Label(other, new Named('other'))))
      ).toEqual(['/other/choice[1]']);
    });

    it('must not look through a rule a second time', () => {
      const looped: Expression<CodePoint> = new Rule(
        new Alternation([target, new Reference(() => looped)]),
        () => OTHER
      );

      expect(gaps(looped)).toEqual(['/other/choice[1]']);
    });

    it('must find none for any of several targets', () => {
      const SECOND = { name: () => 'second' };

      expect(
        new Gaps([TARGET, SECOND]).from(
          new Alternation([target, new Rule(letter, () => SECOND)])
        )
      ).toEqual([]);
    });
  });
});
