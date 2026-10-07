import { describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { type Node } from './Node.js';
import { Option } from './Option.js';
import { Repetition } from './Repetition.js';
import { Sequence } from './Sequence.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

class SpecificSequence extends Sequence<readonly Character[]> {}

describe('Sequence', () => {
  describe('instanceof', () => {
    it('must recognise an instance of its own class', () => {
      expect(new Sequence([A])).toBeInstanceOf(Sequence);
      expect(new SpecificSequence([A])).toBeInstanceOf(Sequence);
    });

    it('must not recognise an instance of the base class as a subclass', () => {
      expect(new Sequence([A])).not.toBeInstanceOf(SpecificSequence);
    });

    it.each([
      ['a non-object', 0],
      ['an object it did not construct', Object.create(Sequence.prototype)],
    ])('must not recognise %s', (_, value) => {
      expect(value).not.toBeInstanceOf(Sequence);
    });
  });

  describe('elements', () => {
    it('must return the elements passed to the constructor', () => {
      const elements = [A, B] as const;

      expect(new Sequence(elements).elements()).toBe(elements);
    });
  });

  describe('children', () => {
    it('must have its elements as its children', () => {
      const elements = [A, B] as const;

      expect(new Sequence(elements).children()).toBe(elements);
    });
  });

  describe('map', () => {
    it('must transform every element in order', () => {
      const rewritten: Node[] = [];
      const record: Node.Transform = node => {
        rewritten.push(node);

        return node;
      };

      new Sequence([A, B] as const).map(record);

      expect(rewritten).toEqual([A, B]);
    });

    it('must keep the rewritten elements', () => {
      function toB<N extends Node>(node: N): N;

      function toB(node: Node): Node {
        return node instanceof Character ? B : node;
      }

      expect(new Sequence([A, new Option(A)] as const).map(toB)).toEqual(
        new Sequence([B, new Option(A)])
      );
    });
  });

  describe('with', () => {
    it('must replace the element at the index', () => {
      expect(new Sequence([A, B] as const).with(1, A)).toEqual(
        new Sequence([A, A])
      );
    });

    it('must leave the original sequence as it was', () => {
      const sequence = new Sequence([A, B] as const);

      sequence.with(1, A);

      expect(sequence).toEqual(new Sequence([A, B]));
    });
  });

  describe('at', () => {
    it('must get the element at the index', () => {
      expect(
        Sequence.at<readonly [Character, Character], 1>(1).get(
          new Sequence([A, B] as const)
        )
      ).toBe(B);
    });

    it('must set the element at the index', () => {
      expect(
        Sequence.at<readonly [Character, Character], 0>(0).set(
          new Sequence([A, B] as const),
          B
        )
      ).toEqual(new Sequence([B, B]));
    });

    it('must type the focus by its index', () => {
      expectTypeOf(
        Sequence.at<readonly [Character, Option<Character>], 1>(1).get(
          new Sequence([A, new Option(B)] as const)
        )
      ).toEqualTypeOf<Option<Character>>();
    });
  });

  describe('equals', () => {
    it('must equal a sequence of equal elements', () => {
      expect(new Sequence([A, B]).equals(new Sequence([A, B]))).toBe(true);
    });

    it('must not equal a sequence with a different element', () => {
      expect(new Sequence([A, B]).equals(new Sequence([A, A]))).toBe(false);
    });

    it('must not equal a sequence of a different length', () => {
      expect(new Sequence([A]).equals(new Sequence([A, B]))).toBe(false);
      expect(new Sequence([A, B]).equals(new Sequence([A]))).toBe(false);
    });

    it('must compare nested nodes structurally', () => {
      expect(
        new Sequence([new Sequence([A]), B]).equals(
          new Sequence([new Sequence([A]), B])
        )
      ).toBe(true);
      expect(
        new Sequence([new Sequence([A]), B]).equals(new Sequence([A, B]))
      ).toBe(false);
    });

    it('must not equal a different kind of node with the same elements', () => {
      expect(
        new Sequence([A]).equals(
          new Repetition([A]) as unknown as Sequence<readonly Character[]>
        )
      ).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its elements in order', () => {
      expect(new Sequence([A, new Sequence([B, A])]).toString()).toBe('aba');
    });
  });
});
