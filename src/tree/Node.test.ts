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
