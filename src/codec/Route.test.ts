import { assert, describe, expect, it } from 'vitest';

import { Failure } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { Character, Choice, Nonterminal, Sequence } from '#project/tree';

import { Move } from './Move.js';
import { Route } from './Route.js';

const A = new Character(CodePoint.of('a'));

const TARGET = { name: () => 'target' };

const through = (...moves: readonly Move[]) =>
  moves.reduceRight((route, move) => route.after(move), Route.to(TARGET));

const choice = (index: number) => Move.choice(index, new Failure(undefined));

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

  describe('target', () => {
    it('must be the rule the route leads to', () => {
      expect(through(Move.sequence(0)).target()).toBe(TARGET);
    });
  });

  describe('admits', () => {
    it('must hold for the nodes of its target', () => {
      expect(through().admits(new Nonterminal(TARGET, A))).toBe(true);
    });

    it('must not hold for the nodes of another rule', () => {
      expect(
        through().admits(new Nonterminal({ name: () => 'target' }, A))
      ).toBe(false);
    });

    it('must not hold for anything but a nonterminal', () => {
      expect(through().admits(A)).toBe(false);
    });
  });

  describe('choose', () => {
    it('must take the alternatives of the route where others were taken', () => {
      const found = new Nonterminal(TARGET, A);

      expect(
        through(Move.sequence(1), choice(1))
          .choose()
          .set(new Sequence([A, new Choice(0, A)]), found)
      ).toEqual(new Sequence([A, new Choice(1, found)]));
    });
  });

  describe('alternates', () => {
    it('must hold for routes that part only at their last alternative', () => {
      expect(
        through(Move.sequence(0), choice(0)).alternates(
          through(Move.sequence(0), choice(1))
        )
      ).toBe(true);
    });

    it('must not hold for routes that part before their last move', () => {
      expect(
        through(choice(0), Move.sequence(0)).alternates(
          through(choice(1), Move.sequence(0))
        )
      ).toBe(false);
    });

    it('must not hold for routes that part within a sequence', () => {
      expect(
        through(Move.sequence(0)).alternates(through(Move.sequence(1)))
      ).toBe(false);
    });

    it('must not hold for routes of different lengths', () => {
      expect(
        through(choice(0)).alternates(through(choice(1), Move.sequence(0)))
      ).toBe(false);
    });

    it('must not hold for a route and itself', () => {
      const route = through(choice(0));

      expect(route.alternates(route)).toBe(false);
    });

    it('must not hold for routes without moves', () => {
      expect(through().alternates(through())).toBe(false);
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
