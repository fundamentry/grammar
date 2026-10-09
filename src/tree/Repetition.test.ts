import { assert, describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { type Node } from './Node.js';
import { Repetition } from './Repetition.js';
import { Sequence } from './Sequence.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));
const COMMA = new Character(CodePoint.of(','));
const SEMICOLON = new Character(CodePoint.of(';'));

class SpecificRepetition extends Repetition<Character> {}

describe('Repetition', () => {
  describe('instanceof', () => {
    it('must recognise an instance of its own class', () => {
      expect(new Repetition([A])).toBeInstanceOf(Repetition);
      expect(new SpecificRepetition([A])).toBeInstanceOf(Repetition);
    });

    it('must not recognise an instance of the base class as a subclass', () => {
      expect(new Repetition([A])).not.toBeInstanceOf(SpecificRepetition);
    });

    it.each([
      ['a non-object', 0],
      ['an object it did not construct', Object.create(Repetition.prototype)],
    ])('must not recognise %s', (_, value) => {
      expect(value).not.toBeInstanceOf(Repetition);
    });
  });

  describe('elements', () => {
    it('must return the elements passed to the constructor', () => {
      const elements = [A, B];

      expect(new Repetition(elements).elements()).toBe(elements);
    });
  });

  describe('separators', () => {
    it('must return the separators passed to the constructor', () => {
      const separators = [COMMA];

      expect(new Repetition([A, B], separators).separators()).toBe(separators);
    });

    it('must have none without them', () => {
      expect(new Repetition([A, B]).separators()).toEqual([]);
    });
  });

  describe('children', () => {
    it('must have its elements as its children', () => {
      expect(new Repetition([A, B]).children()).toEqual([A, B]);
    });

    it('must have its separators between its elements', () => {
      expect(new Repetition([A, B, A], [COMMA, SEMICOLON]).children()).toEqual([
        A,
        COMMA,
        B,
        SEMICOLON,
        A,
      ]);
    });
  });

  describe('map', () => {
    it('must transform every element', () => {
      function toB<N extends Node>(node: N): N;

      function toB(node: Node): Node {
        return node instanceof Character ? B : node;
      }

      expect(new Repetition([A, A]).map(toB)).toEqual(new Repetition([B, B]));
    });

    it('must transform every separator', () => {
      function toB<N extends Node>(node: N): N;

      function toB(node: Node): Node {
        return node === COMMA ? B : node;
      }

      expect(new Repetition([A, A], [COMMA]).map(toB)).toEqual(
        new Repetition([A, A], [B])
      );
    });
  });

  describe('filter', () => {
    it('must keep the elements that pass', () => {
      expect(new Repetition([A, B, A]).filter(node => node === A)).toEqual(
        new Repetition([A, A])
      );
    });

    it('must drop the separator before an element it drops', () => {
      expect(
        new Repetition([A, B, A], [COMMA, SEMICOLON]).filter(node => node !== B)
      ).toEqual(new Repetition([A, A], [SEMICOLON]));
    });

    it('must drop the separator after a first element it drops', () => {
      expect(
        new Repetition([B, A, A], [COMMA, SEMICOLON]).filter(node => node !== B)
      ).toEqual(new Repetition([A, A], [SEMICOLON]));
    });

    it('must drop every separator when it keeps one element', () => {
      expect(
        new Repetition([A, B, B], [COMMA, SEMICOLON]).filter(node => node === A)
      ).toEqual(new Repetition([A], []));
    });
  });

  describe('at', () => {
    it('must preview the element at the index', () => {
      const previewed = Repetition.at<Character>(1).preview(
        new Repetition([A, B])
      );

      assert(previewed.ok());
      expect(previewed.value()).toBe(B);
    });

    it('must count a negative index from the end', () => {
      const previewed = Repetition.at<Character>(-1).preview(
        new Repetition([A, B])
      );

      assert(previewed.ok());
      expect(previewed.value()).toBe(B);
    });

    it('must update the element at the index', () => {
      expect(
        Repetition.at<Character>(0).set(new Repetition([A, A]), B)
      ).toEqual(new Repetition([B, A]));
    });

    it('must keep the separators when it updates an element', () => {
      expect(
        Repetition.at<Character, Character>(1).set(
          new Repetition([A, A], [COMMA]),
          B
        )
      ).toEqual(new Repetition([A, B], [COMMA]));
    });

    it('must pass over an index without an element', () => {
      const repetition = new Repetition([A]);

      expect(Repetition.at<Character>(1).preview(repetition).ok()).toBe(false);
      expect(Repetition.at<Character>(1).set(repetition, B)).toBe(repetition);
    });
  });

  describe('elements lens', () => {
    it('must get the elements', () => {
      const elements = [A, B];

      expect(
        Repetition.elements<Character>().get(new Repetition(elements))
      ).toBe(elements);
    });

    it('must set the elements', () => {
      expect(
        Repetition.elements<Character>().set(new Repetition([A]), [A, B])
      ).toEqual(new Repetition([A, B]));
    });

    it('must keep the separators that still fall between the elements', () => {
      expect(
        Repetition.elements<Character, Character>().set(
          new Repetition([A, B, A], [COMMA, SEMICOLON]),
          [B, A]
        )
      ).toEqual(new Repetition([B, A], [COMMA]));
    });
  });

  describe('equals', () => {
    it('must equal a repetition of equal elements', () => {
      expect(new Repetition([A, B]).equals(new Repetition([A, B]))).toBe(true);
    });

    it('must equal another empty repetition', () => {
      expect(new Repetition([]).equals(new Repetition([]))).toBe(true);
    });

    it('must not equal a repetition with a different element', () => {
      expect(new Repetition([A, B]).equals(new Repetition([A, A]))).toBe(false);
    });

    it('must not equal a repetition of a different length', () => {
      expect(new Repetition([A]).equals(new Repetition([A, A]))).toBe(false);
    });

    it('must not equal a repetition with different separators', () => {
      expect(
        new Repetition([A, B], [COMMA]).equals(
          new Repetition([A, B], [SEMICOLON])
        )
      ).toBe(false);
    });

    it('must not equal a different kind of node with the same elements', () => {
      expect(
        new Repetition([A]).equals(
          new Sequence([A]) as unknown as Repetition<Character>
        )
      ).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its elements in order', () => {
      expect(new Repetition([A, B, A]).toString()).toBe('aba');
    });

    it('must print its separators between its elements', () => {
      expect(new Repetition([A, B, A], [COMMA, SEMICOLON]).toString()).toBe(
        'a,b;a'
      );
    });
  });
});
