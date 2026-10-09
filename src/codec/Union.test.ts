import { assert, describe, expect, it } from 'vitest';

import { Morphism, Prism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { Mismatch } from '#project/mismatch';
import {
  Character,
  Choice,
  Focus,
  type Node,
  Nonterminal,
} from '#project/tree';

import { Move } from './Move.js';
import { Route } from './Route.js';
import { Union } from './Union.js';
import { write } from './Writer.js';

const character = (text: string) => new Character(CodePoint.of(text));

const member = (name: string, accepts: RegExp): Union.Member => {
  const rule = {
    name: () => name,
    parse: (text: string) =>
      accepts.test(text)
        ? new Success(new Nonterminal(rule, character(text)))
        : new Failure(new Mismatch(0, [new Named(name)], `'${text}'`)),
  };

  return rule;
};

const FIRST = member('first', /^[ac]$/u);
const SECOND = member('second', /^[bc]$/u);

const among = (routes: readonly Route<Union.Member>[]) =>
  new Union(
    routes,
    Prism.fromPredicate(
      (node: Node): node is Node => node instanceof Nonterminal,
      () => undefined
    )
  );

const choice = (index: number) => Move.choice(index, new Failure(undefined));

const first = Route.to(FIRST).after(choice(0));
const second = Route.to(SECOND).after(choice(1));

const taken = (text: string) =>
  new Choice(0, new Nonterminal(FIRST, character(text)));

const written = (
  union: Union<Node>,
  tree: Node,
  update: (text: string) => string
) =>
  union[write](
    Focus.of(tree, (node): node is Node => node instanceof Choice),
    update
  );

describe('Union', () => {
  describe('optic', () => {
    it('must preview the member on the route the tree takes', () => {
      const tree = new Choice(1, new Nonterminal(SECOND, character('b')));
      const previewed = among([first, second]).optic().preview(tree);

      assert(previewed.ok());
      expect(String(previewed.value())).toBe('b');
    });

    it('must preview nothing where the tree takes none of the routes', () => {
      expect(among([first]).optic().preview(character('a')).ok()).toBe(false);
    });

    it('must preview nothing its witness refuses', () => {
      const witness = Prism.fromPredicate(
        (node: Node): node is Node => !(node instanceof Nonterminal),
        () => undefined
      );

      expect(new Union([first], witness).optic().preview(taken('a')).ok()).toBe(
        false
      );
    });

    it('must modify the member on the route the tree takes', () => {
      const replaced = new Nonterminal(FIRST, character('c'));

      expect(
        among([first, second])
          .optic()
          .modify(Morphism.of((): Node => replaced))
          .apply(taken('a'))
      ).toEqual(new Choice(0, replaced));
    });

    it('must take the alternative of a member put in place of the one taken', () => {
      const replaced = new Nonterminal(SECOND, character('b'));

      expect(
        among([first, second])
          .optic()
          .modify(Morphism.of((): Node => replaced))
          .apply(taken('a'))
      ).toEqual(new Choice(1, replaced));
    });

    it('must refuse a node that none of the alternatives admits', () => {
      const replace = among([first])
        .optic()
        .modify(
          Morphism.of((): Node => new Nonterminal(SECOND, character('b')))
        );

      expect(() => replace.apply(taken('a'))).toThrow(
        new RangeError("'b' cannot take the place of /choice[0]/first")
      );
    });

    it('must leave a tree that takes none of the routes as it is', () => {
      const tree = character('a');

      expect(
        among([first])
          .optic()
          .modify(Morphism.of((): Node => character('b')))
          .apply(tree)
      ).toBe(tree);
    });
  });

  describe('write', () => {
    it('must keep the member taken when it accepts the text', () => {
      const result = written(among([first, second]), taken('a'), () => 'c');

      assert(result.ok());
      expect(result.value()).toEqual(
        new Choice(0, new Nonterminal(FIRST, character('c')))
      );
    });

    it('must take an alternative member when the one taken refuses the text', () => {
      const result = written(among([first, second]), taken('a'), () => 'b');

      assert(result.ok());
      expect(result.value()).toEqual(
        new Choice(1, new Nonterminal(SECOND, character('b')))
      );
    });

    it('must hand the update the text of the member taken', () => {
      const result = written(among([first, second]), taken('a'), text =>
        text === 'a' ? 'b' : 'x'
      );

      assert(result.ok());
      expect(String(result.value())).toBe('b');
    });

    it('must report why the member taken refuses text that no member accepts', () => {
      const result = written(among([first, second]), taken('a'), () => 'x');

      assert(!result.ok());
      expect(result.error()).toEqual(
        new Mismatch(0, [new Named('first')], "'x'")
      );
    });

    it('must not take a member on a route that parts earlier', () => {
      const elsewhere = Route.to(SECOND)
        .after(Move.sequence(0))
        .after(choice(1));

      expect(
        written(among([first, elsewhere]), taken('a'), () => 'b').ok()
      ).toBe(false);
    });

    it('must leave a tree that takes none of the routes as it is', () => {
      const tree = new Choice(1, character('b'));
      const result = written(among([first]), tree, () => 'a');

      assert(result.ok());
      expect(result.value()).toBe(tree);
    });
  });
});
