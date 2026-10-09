import { assert, describe, expect, it } from 'vitest';

import { Morphism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import {
  Character,
  Choice,
  type Node,
  Nonterminal,
  Option,
} from '#project/tree';

import { Junction } from './Junction.js';
import { Move } from './Move.js';
import { Route } from './Route.js';
import { Slots } from './Slots.js';

const fallback = <T>(result: T) => ({ default: () => result });

const character = (text: string) => new Character(CodePoint.of(text));

const FIRST = { name: () => 'first' };
const SECOND = { name: () => 'second' };

const among = (routes: readonly Route[]) => new Junction(routes);

const choice = (index: number) =>
  Move.choice(index, fallback(new Failure(undefined)));

const optional = (target: Nonterminal.Rule<string>) =>
  Route.to(target).after(
    Move.option(fallback(new Success(new Nonterminal(target, character('a')))))
  );

const first = Route.to(FIRST).after(choice(0));
const second = Route.to(SECOND).after(choice(1));

const taken = (text: string) =>
  new Choice(0, new Nonterminal(FIRST, character(text)));

describe('Junction', () => {
  describe('optic', () => {
    it('must preview the node on the route the tree takes', () => {
      const tree = new Choice(1, new Nonterminal(SECOND, character('b')));
      const previewed = among([first, second]).optic(Slots.edit).preview(tree);

      assert(previewed.ok());
      expect(String(previewed.value())).toBe('b');
    });

    it('must preview nothing where the tree takes none of the routes', () => {
      expect(
        among([first]).optic(Slots.edit).preview(character('a')).ok()
      ).toBe(false);
    });

    it('must modify the node on the route the tree takes', () => {
      const replaced = new Nonterminal(FIRST, character('c'));

      expect(
        among([first, second])
          .optic(Slots.edit)
          .modify(Morphism.of((): Node => replaced))
          .apply(taken('a'))
      ).toEqual(new Choice(0, replaced));
    });

    it('must take the alternative of a node put in place of the one taken', () => {
      const replaced = new Nonterminal(SECOND, character('b'));

      expect(
        among([first, second])
          .optic(Slots.edit)
          .modify(Morphism.of((): Node => replaced))
          .apply(taken('a'))
      ).toEqual(new Choice(1, replaced));
    });

    it('must refuse a node that none of the alternatives admits', () => {
      const replace = among([first])
        .optic(Slots.edit)
        .modify(
          Morphism.of((): Node => new Nonterminal(SECOND, character('b')))
        );

      expect(() => replace.apply(taken('a'))).toThrow(
        new RangeError("'b' cannot take the place of /choice[0]/first")
      );
    });

    it('must leave a tree that takes none of the routes as it is', () => {
      const tree = new Choice(1, character('b'));

      expect(
        among([first])
          .optic(Slots.edit)
          .modify(Morphism.of((): Node => character('c')))
          .apply(tree)
      ).toBe(tree);
    });

    it('must create the node along the route that fits a missing place', () => {
      const created = new Nonterminal(FIRST, character('c'));

      expect(
        among([optional(FIRST)])
          .optic(Slots.edit)
          .modify(Morphism.of((): Node => created))
          .apply(new Option())
      ).toEqual(new Option(created));
    });

    it('must refuse to create a node the route does not admit', () => {
      const create = among([optional(FIRST)])
        .optic(Slots.edit)
        .modify(
          Morphism.of((): Node => new Nonterminal(SECOND, character('b')))
        );

      expect(() => create.apply(new Option())).toThrow(
        new RangeError("'b' cannot take the place of /option/first")
      );
    });
  });
});
