import { assert, describe, expect, it } from 'vitest';

import { Failure } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { Character, Choice, Nonterminal, Sequence } from '#project/tree';

import { Move } from './Move.js';
import { Route } from './Route.js';

const A = new Character(CodePoint.of('a'));

const TARGET = { name: () => 'target' };

describe('Route', () => {
  describe('to', () => {
    it('must lead to the target itself', () => {
      const found = new Nonterminal(TARGET, A);
      const previewed = Route.to(TARGET).optic().preview(found);

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
      expect(String(Route.to(TARGET))).toBe('/target');
    });
  });

  describe('after', () => {
    it('must take the move first, then the route', () => {
      const route = Route.to(TARGET)
        .after(Move.sequence(1))
        .after(Move.choice(0, new Failure(undefined)));
      const found = new Nonterminal(TARGET, A);
      const previewed = route
        .optic()
        .preview(new Choice(0, new Sequence([A, found])));

      assert(previewed.ok());
      expect(previewed.value()).toBe(found);
      expect(String(route)).toBe('/choice[0]/sequence[1]/target');
    });
  });

  describe('excludes', () => {
    const through = (...moves: readonly Move[]) =>
      moves.reduceRight((route, move) => route.after(move), Route.to(TARGET));

    const choice = (index: number) =>
      Move.choice(index, new Failure(undefined));

    it('must hold for routes that part where they choose an alternative', () => {
      expect(
        through(Move.sequence(0), choice(0)).excludes(
          through(Move.sequence(0), choice(1), Move.sequence(1))
        )
      ).toBe(true);
    });

    it('must not hold for routes that part within a sequence', () => {
      expect(
        through(choice(0), Move.sequence(0)).excludes(
          through(choice(0), Move.sequence(1))
        )
      ).toBe(false);
    });

    it('must not depend on which route is asked', () => {
      const shorter = through(Move.sequence(0));
      const longer = through(Move.sequence(0), choice(0));

      expect(longer.excludes(shorter)).toBe(shorter.excludes(longer));
    });
  });

  describe('equals', () => {
    it('must hold for routes with the same moves to the same target', () => {
      const route = Route.to(TARGET).after(Move.sequence(1));

      expect(route.equals(Route.to(TARGET).after(Move.sequence(1)))).toBe(true);
      expect(route.equals(Route.to(TARGET).after(Move.sequence(0)))).toBe(
        false
      );
      expect(
        route.equals(Route.to({ name: () => 'target' }).after(Move.sequence(1)))
      ).toBe(false);
      expect(route.equals('/sequence[1]/target')).toBe(false);
    });
  });
});
