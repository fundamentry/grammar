import { describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { Focus } from './Focus.js';
import { Node } from './Node.js';
import { Nonterminal } from './Nonterminal.js';
import { Option } from './Option.js';
import { Sequence } from './Sequence.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

const DIGIT = { name: (): 'DIGIT' => 'DIGIT' };

type Digit = Nonterminal<'DIGIT', Node>;

const isDigit = (node: Node): node is Digit =>
  node instanceof Nonterminal && node.rule() === DIGIT;

const digit = (elements: Node): Digit => new Nonterminal(DIGIT, elements);

class Unexplored extends Node {
  override map(): Node {
    return this;
  }

  override children(): readonly Node[] {
    throw new Error('Children were explored');
  }

  override equals(other: unknown): boolean {
    return other === this;
  }

  override toString(): string {
    return '?';
  }
}

describe('Focus', () => {
  describe('values', () => {
    it('must yield the outermost focused nodes in document order', () => {
      const first = digit(digit(A));
      const second = digit(B);

      expect(
        Focus.of(new Sequence([first, new Option(second)]), isDigit)
          .values()
          .toArray()
      ).toEqual([first, second]);
    });

    it('must yield nothing when no node is focused', () => {
      expect(
        Focus.of(new Sequence([A, B]), isDigit)
          .values()
          .toArray()
      ).toEqual([]);
    });

    it('must explore the tree only as far as the values pulled', () => {
      const first = digit(A);
      const values = Focus.of(
        new Sequence([first, new Unexplored()]),
        isDigit
      ).values();

      expect(values.next().value).toBe(first);
      expect(() => values.next()).toThrow('Children were explored');
    });
  });

  describe('iterator', () => {
    it('must iterate over the values', () => {
      const first = digit(A);
      const second = digit(B);

      expect([...Focus.of(new Sequence([first, A, second]), isDigit)]).toEqual([
        first,
        second,
      ]);
    });
  });

  describe('find', () => {
    it('must find the first focused node', () => {
      const first = digit(A);

      expect(Focus.of(new Sequence([first, digit(B)]), isDigit).find()).toBe(
        first
      );
    });

    it('must find nothing when no node is focused', () => {
      expect(Focus.of(new Sequence([A]), isDigit).find()).toBeUndefined();
    });
  });

  describe('set', () => {
    it('must replace every focused node', () => {
      const replacement = digit(B);

      expect(
        Focus.of(new Sequence([digit(A), A, digit(A)]), isDigit).set(
          replacement
        )
      ).toEqual(new Sequence([replacement, A, replacement]));
    });

    it('must replace the tree itself when it is focused', () => {
      const replacement = digit(B);

      expect(Focus.of(digit(A), isDigit).set(replacement)).toBe(replacement);
    });

    it('must leave the original tree as it was', () => {
      const tree = new Sequence([digit(A)]);

      Focus.of(tree, isDigit).set(digit(B));

      expect(tree).toEqual(new Sequence([digit(A)]));
    });

    it('must return a tree of the type it was given', () => {
      const tree = new Sequence([digit(A), A] as const);

      expectTypeOf(Focus.of(tree, isDigit).set(digit(B))).toEqualTypeOf<
        Sequence<readonly [Digit, Character]>
      >();
    });
  });

  describe('modify', () => {
    it('must hand each outermost focused node to the update as found', () => {
      const outer = digit(digit(A));
      const updated: Node[] = [];

      Focus.of(new Sequence([outer]), isDigit).modify(node => {
        updated.push(node);

        return node;
      });

      expect(updated).toEqual([outer]);
    });

    it('must keep what the update returns', () => {
      expect(
        Focus.of(new Sequence([digit(A)]), isDigit).modify(() => digit(B))
      ).toEqual(new Sequence([digit(B)]));
    });
  });

  describe('remove', () => {
    it('must make absent the option that holds a focused node', () => {
      expect(
        Focus.of(
          new Sequence([A, new Option(new Sequence([B, digit(A)]))]),
          isDigit
        ).remove()
      ).toEqual(new Sequence([A, new Option()]));
    });

    it('must make absent a focused option itself', () => {
      expect(
        Focus.of(new Sequence([digit(new Option(A))]), isDigit)
          .focus(Nonterminal.elements())
          .remove()
      ).toEqual(new Sequence([digit(new Option())]));
    });

    it('must make absent only the innermost option', () => {
      expect(
        Focus.of(
          new Option(new Sequence([A, new Option(digit(B))])),
          isDigit
        ).remove()
      ).toEqual(new Option(new Sequence([A, new Option()])));
    });

    it('must leave a focused node no option holds as it is', () => {
      const tree = new Sequence([digit(A)]);

      expect(Focus.of(tree, isDigit).remove()).toEqual(tree);
    });

    it('must leave options that hold no focused node as they are', () => {
      const tree = new Sequence([new Option(A), new Option(digit(B))]);

      expect(Focus.of(tree, isDigit).remove()).toEqual(
        new Sequence([new Option(A), new Option()])
      );
    });
  });

  describe('focus', () => {
    it('must narrow each focused node to a part of it', () => {
      expect(
        Focus.of(new Sequence([digit(A), digit(B)]), isDigit)
          .focus(Nonterminal.elements())
          .values()
          .toArray()
      ).toEqual([A, B]);
    });

    it('must skip the focused nodes the part is missing from', () => {
      const isOptional = (
        node: Node
      ): node is Nonterminal<'DIGIT', Option<Character>> =>
        isDigit(node) && node.elements() instanceof Option;

      expect(
        Focus.of(
          new Sequence([digit(new Option()), digit(new Option(B))]),
          isOptional
        )
          .focus(Nonterminal.elements())
          .focus(Option.value())
          .values()
          .toArray()
      ).toEqual([B]);
    });

    it('must set the part within every focused node', () => {
      expect(
        Focus.of(new Sequence([digit(A), A, digit(A)]), isDigit)
          .focus(Nonterminal.elements())
          .set(B)
      ).toEqual(new Sequence([digit(B), A, digit(B)]));
    });
  });
});
