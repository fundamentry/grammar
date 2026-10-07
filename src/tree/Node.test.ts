import { describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { Node } from './Node.js';
import { Nonterminal } from './Nonterminal.js';
import { Option } from './Option.js';
import { Repetition } from './Repetition.js';
import { Sequence } from './Sequence.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

const DIGIT = { name: (): 'DIGIT' => 'DIGIT' };

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

describe('Node', () => {
  describe('Index', () => {
    it('must be the indices of a tuple of nodes', () => {
      expectTypeOf<
        Node.Index<readonly [Character, Option<Character>]>
      >().toEqualTypeOf<0 | 1>();
    });

    it('must be nothing for nodes of unknown length', () => {
      expectTypeOf<Node.Index<readonly Character[]>>().toEqualTypeOf<never>();
    });
  });

  describe('outermost', () => {
    const isDigit = (node: Node): node is Nonterminal<'DIGIT', Node> =>
      node instanceof Nonterminal && node.rule() === DIGIT;

    it('must yield the matching nodes in document order', () => {
      const first = new Nonterminal(DIGIT, A);
      const second = new Nonterminal(DIGIT, B);

      expect(
        Array.from(new Sequence([first, new Option(second)]).outermost(isDigit))
      ).toEqual([first, second]);
    });

    it('must not look inside a matching node', () => {
      const outer = new Nonterminal(DIGIT, new Nonterminal(DIGIT, A));

      expect(Array.from(new Sequence([outer]).outermost(isDigit))).toEqual([
        outer,
      ]);
    });

    it('must yield the node itself when it matches', () => {
      const digit = new Nonterminal(DIGIT, A);

      expect(Array.from(digit.outermost(isDigit))).toEqual([digit]);
    });

    it('must yield nothing when no node matches', () => {
      expect(Array.from(new Sequence([A, B]).outermost(isDigit))).toEqual([]);
    });

    it('must explore the children of a node only once pulled past it', () => {
      const digit = new Nonterminal(DIGIT, A);
      const iterator = new Sequence([digit, new Unexplored()]).outermost(
        isDigit
      );

      expect(iterator.next().value).toBe(digit);
      expect(() => iterator.next()).toThrow('Children were explored');
    });
  });

  describe('nodes', () => {
    it('must yield a leaf alone', () => {
      expect(Array.from(A.nodes())).toEqual([A]);
    });

    it('must yield every node of the subtree in document order', () => {
      const digit = new Nonterminal(DIGIT, A);
      const option = new Option(B);
      const sequence = new Sequence([digit, option]);

      expect(Array.from(sequence.nodes())).toEqual([
        sequence,
        digit,
        A,
        option,
        B,
      ]);
    });

    it('must explore the children of a node only once pulled past it', () => {
      const unexplored = new Unexplored();
      const sequence = new Sequence([A, unexplored]);
      const iterator = sequence.nodes();

      expect(iterator.next().value).toBe(sequence);
      expect(iterator.next().value).toBe(A);
      expect(iterator.next().value).toBe(unexplored);
      expect(() => iterator.next()).toThrow('Children were explored');
    });

    it('must walk a tree deeper than the call stack', () => {
      const depth = 100_000;
      let node: Node = A;

      for (let level = 0; level < depth; level += 1)
        node = new Sequence([node]);

      expect(node.nodes().reduce(count => count + 1, 0)).toBe(depth + 1);
    });

    it('must walk a node with more children than a call takes arguments', () => {
      const width = 200_000;
      const repetition = new Repetition(Array.from({ length: width }, () => A));

      expect(repetition.nodes().reduce(count => count + 1, 0)).toBe(width + 1);
    });
  });
});
