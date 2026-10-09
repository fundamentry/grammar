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

const fallback = <T>(result: T) => ({ default: () => result });

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
  new Routes([TARGET], () => fallback(new Failure(undefined))).from(expression);

describe('Routes', () => {
  describe('from', () => {
    it('must lead to the target itself', () => {
      const [route] = routes(target);

      assert(route);
      expect(route.optic().preview(found).ok()).toBe(true);
    });

    it('must lead through a concatenation to the element at the index', () => {
      const [route, ...others] = routes(new Concatenation([letter, target]));

      assert(route);
      expect(others).toEqual([]);
      expect(String(route)).toBe('/sequence[1]/target');

      const previewed = route.optic().preview(new Sequence([A, found]));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must lead through an alternation to the alternative at the index', () => {
      const [route] = routes(new Alternation([letter, target]));

      assert(route);

      const previewed = route.optic().preview(new Choice(1, found));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
    });

    it('must create the alternative from its default', () => {
      const [route] = new Routes([TARGET], () =>
        fallback(new Success(found))
      ).from(new Alternation([letter, target]));

      assert(route);

      const other = new Nonterminal(TARGET, new Character(CodePoint.of('b')));

      expect(route.optic().preview(new Choice(0, A)).ok()).toBe(false);
      expect(route.optic().set(new Choice(0, A), other)).toEqual(
        new Choice(1, other)
      );
    });

    it('must lead through an option to its value', () => {
      const [route] = new Routes([TARGET], () =>
        fallback(new Success(found))
      ).from(new Optional(target));

      assert(route);

      const previewed = route.optic().preview(new Option(found));
      const other = new Nonterminal(TARGET, new Character(CodePoint.of('b')));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
      expect(route.optic().set(new Option(), other)).toEqual(new Option(other));
    });

    it('must lead to each of several targets', () => {
      const SECOND = { name: () => 'second' };
      const second = new Rule(letter, () => SECOND);

      expect(
        new Routes([TARGET, SECOND], () => fallback(new Failure(undefined)))
          .from(new Concatenation([target, second]))
          .map(String)
      ).toEqual(['/sequence[0]/target', '/sequence[1]/second']);
    });

    it('must stop at the first target on its way', () => {
      const outer = new Rule(target, () => OTHER);

      expect(
        new Routes([TARGET, OTHER], () => fallback(new Failure(undefined)))
          .from(outer)
          .map(String)
      ).toEqual(['/other']);
    });

    it('must lead through other rules, labels and references', () => {
      const [route] = routes(
        new Rule(
          new Label(new Reference(() => target), new Named('other')),
          () => OTHER
        )
      );

      assert(route);
      expect(String(route)).toBe('/other/target');

      const previewed = route.optic().preview(new Nonterminal(OTHER, found));

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

  describe('exclusive', () => {
    const SECOND = { name: () => 'second' };
    const second = new Rule(letter, () => SECOND);

    const exclusive = (expression: Expression<CodePoint>) =>
      new Routes([TARGET, SECOND], () =>
        fallback(new Failure(undefined))
      ).exclusive(expression);

    it('must return routes that branch only where an alternative is chosen', () => {
      expect(
        exclusive(
          new Alternation([
            new Concatenation([letter, target]),
            new Alternation([target, second]),
          ])
        ).map(String)
      ).toEqual([
        '/choice[0]/sequence[1]/target',
        '/choice[1]/choice[0]/target',
        '/choice[1]/choice[1]/second',
      ]);
    });

    it('must refuse routes that branch within a concatenation', () => {
      expect(() =>
        exclusive(
          new Alternation([letter, new Concatenation([target, second])])
        )
      ).toThrow(
        new RangeError(
          'Routes /choice[1]/sequence[0]/target and /choice[1]/sequence[1]/second can meet in one tree'
        )
      );
    });

    it('must refuse an expression without a route to any target', () => {
      expect(() => exclusive(letter)).toThrow(
        new RangeError('0 routes lead to target or second')
      );
    });
  });
});
