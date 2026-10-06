import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
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
