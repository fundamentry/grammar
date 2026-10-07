import { describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { Node } from './Node.js';
import { Nonterminal } from './Nonterminal.js';
import { Option } from './Option.js';
import { Selection } from './Selection.js';
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

describe('Selection', () => {
  describe('values', () => {
    it('must yield the outermost selected nodes in document order', () => {
      const first = digit(digit(A));
      const second = digit(B);

      expect(
        Selection.of(new Sequence([first, new Option(second)]), isDigit)
          .values()
          .toArray()
      ).toEqual([first, second]);
    });

    it('must yield nothing when no node is selected', () => {
      expect(
        Selection.of(new Sequence([A, B]), isDigit)
          .values()
          .toArray()
      ).toEqual([]);
    });

    it('must explore the tree only as far as the values pulled', () => {
      const first = digit(A);
      const values = Selection.of(
        new Sequence([first, new Unexplored()]),
        isDigit
      ).values();

      expect(values.next().value).toBe(first);
      expect(() => values.next()).toThrow('Children were explored');
    });
  });

  describe('find', () => {
    it('must find the first selected node', () => {
      const first = digit(A);

      expect(
        Selection.of(new Sequence([first, digit(B)]), isDigit).find()
      ).toBe(first);
    });

    it('must find nothing when no node is selected', () => {
      expect(Selection.of(new Sequence([A]), isDigit).find()).toBeUndefined();
    });
  });

  describe('set', () => {
    it('must replace every selected node', () => {
      const replacement = digit(B);

      expect(
        Selection.of(new Sequence([digit(A), A, digit(A)]), isDigit).set(
          replacement
        )
      ).toEqual(new Sequence([replacement, A, replacement]));
    });

    it('must replace the tree itself when it is selected', () => {
      const replacement = digit(B);

      expect(Selection.of(digit(A), isDigit).set(replacement)).toBe(
        replacement
      );
    });

    it('must leave the original tree as it was', () => {
      const tree = new Sequence([digit(A)]);

      Selection.of(tree, isDigit).set(digit(B));

      expect(tree).toEqual(new Sequence([digit(A)]));
    });

    it('must return a tree of the type it was given', () => {
      const tree = new Sequence([digit(A), A] as const);

      expectTypeOf(Selection.of(tree, isDigit).set(digit(B))).toEqualTypeOf<
        Sequence<readonly [Digit, Character]>
      >();
    });
  });

  describe('modify', () => {
    it('must hand each outermost selected node to the update as found', () => {
      const outer = digit(digit(A));
      const updated: Node[] = [];

      Selection.of(new Sequence([outer]), isDigit).modify(node => {
        updated.push(node);

        return node;
      });

      expect(updated).toEqual([outer]);
    });

    it('must keep what the update returns', () => {
      expect(
        Selection.of(new Sequence([digit(A)]), isDigit).modify(() => digit(B))
      ).toEqual(new Sequence([digit(B)]));
    });
  });

  describe('focus', () => {
    it('must narrow each selected node to a part of it', () => {
      expect(
        Selection.of(new Sequence([digit(A), digit(B)]), isDigit)
          .focus(Nonterminal.elements())
          .values()
          .toArray()
      ).toEqual([A, B]);
    });

    it('must skip the selected nodes the part is missing from', () => {
      const isOptional = (
        node: Node
      ): node is Nonterminal<'DIGIT', Option<Character>> =>
        isDigit(node) && node.elements() instanceof Option;

      expect(
        Selection.of(
          new Sequence([digit(new Option()), digit(new Option(B))]),
          isOptional
        )
          .focus(Nonterminal.elements())
          .focus(Option.value())
          .values()
          .toArray()
      ).toEqual([B]);
    });

    it('must set the part within every selected node', () => {
      expect(
        Selection.of(new Sequence([digit(A), A, digit(A)]), isDigit)
          .focus(Nonterminal.elements())
          .set(B)
      ).toEqual(new Sequence([digit(B), A, digit(B)]));
    });
  });
});
