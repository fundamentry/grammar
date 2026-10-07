import { assert, describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
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
import {
  Character,
  Choice,
  Nonterminal,
  Option,
  Sequence,
} from '#project/tree';

import { Routes } from './Routes.js';

const conversion = PartialIso.of<CodePoint, Character, string, string>(
  codePoint => new Success(new Character(codePoint)),
  character => new Success(character.codePoint())
);

const letter = new Terminal(
  conversion,
  new Characters(RangeSet.from([Range.singleton(CodePoint.of('a'))]))
);

const A = new Character(CodePoint.of('a'));

const TARGET = { name: () => 'target' };
const OTHER = { name: () => 'other' };

const target = new Rule(letter, () => TARGET);
const found = new Nonterminal(TARGET, A);

const routes = (expression: Expression<CodePoint>) =>
  new Routes(TARGET, () => new Failure(undefined)).from(expression);

describe('Routes', () => {
  describe('from', () => {
    it('must lead to the target itself', () => {
      const [route] = routes(target);

      assert(route);
      expect(route.preview(found).ok()).toBe(true);
    });

    it('must lead through a concatenation to the element at the index', () => {
      const [route, ...others] = routes(new Concatenation([letter, target]));

      assert(route);
      expect(others).toEqual([]);

      const previewed = route.preview(new Sequence([A, found]));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must lead through an alternation to the alternative at the index', () => {
      const [route] = routes(new Alternation([letter, target]));

      assert(route);

      const previewed = route.preview(new Choice(1, found));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must create the alternative from its default', () => {
      const [route] = new Routes(TARGET, () => new Success(found)).from(
        new Alternation([letter, target])
      );

      assert(route);

      const previewed = route.preview(new Choice(0, A));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must lead through an option to its value', () => {
      const [route] = new Routes(TARGET, () => new Success(found)).from(
        new Optional(target)
      );

      assert(route);

      const previewed = route.preview(new Option());

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must lead through other rules, labels and references', () => {
      const [route] = routes(
        new Rule(
          new Label(new Reference(() => target), new Named('other')),
          () => OTHER
        )
      );

      assert(route);

      const previewed = route.preview(new Nonterminal(OTHER, found));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must not lead through a repetition', () => {
      expect(
        routes(new Repetition(target, Range.atLeast(Integer.of(0))))
      ).toEqual([]);
    });

    it('must not lead through a rule a second time', () => {
      const loop: Expression<CodePoint> = new Rule(
        new Alternation([new Reference(() => loop), target]),
        () => OTHER
      );

      expect(routes(loop)).toHaveLength(1);
    });

    it('must find every route to the target', () => {
      expect(routes(new Concatenation([target, target]))).toHaveLength(2);
    });

    it('must find no route where the target does not occur', () => {
      expect(routes(letter)).toEqual([]);
    });
  });
});
