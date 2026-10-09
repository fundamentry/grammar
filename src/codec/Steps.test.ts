import { assert, describe, expect, it } from 'vitest';

import { Morphism } from '@fundamentry/category';
import { CodePoint } from '@fundamentry/scalar';

import {
  Character,
  Choice,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Steps } from './Steps.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

const RULE = { name: () => 'rule' };

const toB = Morphism.of((): Node => B);

const previewed = (step: Steps.Step, node: Node) => {
  const result = step.preview(node);

  assert(result.ok());

  return result.value();
};

describe('Steps', () => {
  describe('elements', () => {
    it('must preview and update the elements of a nonterminal', () => {
      const node = new Nonterminal(RULE, A);

      expect(previewed(Steps.elements(), node)).toBe(A);
      expect(Steps.elements().modify(toB).apply(node)).toEqual(
        new Nonterminal(RULE, B)
      );
    });

    it('must pass over anything but a nonterminal', () => {
      expect(Steps.elements().preview(A).ok()).toBe(false);
      expect(Steps.elements().modify(toB).apply(A)).toBe(A);
    });
  });

  describe('at', () => {
    it('must preview and update the element of a sequence at the index', () => {
      const node = new Sequence([A, A]);

      expect(previewed(Steps.at(1), node)).toBe(A);
      expect(Steps.at(1).modify(toB).apply(node)).toEqual(new Sequence([A, B]));
    });

    it('must pass over a sequence without an element at the index', () => {
      const node = new Sequence([A]);

      expect(Steps.at(1).preview(node).ok()).toBe(false);
      expect(Steps.at(1).modify(toB).apply(node)).toBe(node);
    });

    it('must pass over anything but a sequence', () => {
      const node = new Option(A);

      expect(Steps.at(0).preview(node).ok()).toBe(false);
      expect(Steps.at(0).modify(toB).apply(node)).toBe(node);
    });
  });

  describe('element', () => {
    it('must preview and update the element of a repetition at the index', () => {
      const node = new Repetition([A, A]);

      expect(previewed(Steps.element(-1), node)).toBe(A);
      expect(Steps.element(-1).modify(toB).apply(node)).toEqual(
        new Repetition([A, B])
      );
    });

    it('must pass over anything but a repetition', () => {
      const node = new Sequence([A]);

      expect(Steps.element(0).preview(node).ok()).toBe(false);
      expect(Steps.element(0).modify(toB).apply(node)).toBe(node);
    });
  });

  describe('choose', () => {
    it('must preview whichever alternative was taken', () => {
      expect(previewed(Steps.choose(1), new Choice(0, A))).toBe(A);
    });

    it('must take the alternative at the index when updated', () => {
      expect(Steps.choose(1).set(new Choice(0, A), B)).toEqual(
        new Choice(1, B)
      );
    });

    it('must take the alternative even when the value is kept', () => {
      expect(Steps.choose(1).set(new Choice(0, A), A)).toEqual(
        new Choice(1, A)
      );
    });

    it('must pass over anything but a choice', () => {
      const step = Steps.choose(0);

      expect(step.preview(A).ok()).toBe(false);
      expect(step.set(A, B)).toBe(A);
    });
  });
});
