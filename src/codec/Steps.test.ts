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

  describe('value', () => {
    it('must preview and update the value of a present option', () => {
      const step = Steps.value(new Failure(undefined));

      expect(previewed(step, new Option(A))).toBe(A);
      expect(step.modify(toB).apply(new Option(A))).toEqual(new Option(B));
    });

    it('must preview an absent option as its fallback', () => {
      expect(previewed(Steps.value(new Success(A)), new Option())).toBe(A);
    });

    it('must create an absent option from its fallback when updated', () => {
      expect(
        Steps.value(new Success(A)).modify(toB).apply(new Option())
      ).toEqual(new Option(B));
    });

    it('must leave an absent option absent when its fallback is kept', () => {
      const absent = new Option();

      expect(Steps.value(new Success(B)).modify(toB).apply(absent)).toBe(
        absent
      );
    });

    it('must pass over an absent option without a fallback', () => {
      const absent = new Option();
      const step = Steps.value(new Failure(undefined));

      expect(step.preview(absent).ok()).toBe(false);
      expect(step.modify(toB).apply(absent)).toBe(absent);
    });

    it('must pass over anything but an option', () => {
      const step = Steps.value(new Success(A));

      expect(step.preview(A).ok()).toBe(false);
      expect(step.modify(toB).apply(A)).toBe(A);
    });
  });

  describe('alternative', () => {
    it('must preview and update the alternative taken', () => {
      const node = new Choice(1, A);
      const step = Steps.alternative(1, new Failure(undefined));

      expect(previewed(step, node)).toBe(A);
      expect(step.modify(toB).apply(node)).toEqual(new Choice(1, B));
    });

    it('must take the alternative from its fallback when updated', () => {
      expect(
        Steps.alternative(1, new Success(A)).modify(toB).apply(new Choice(0, A))
      ).toEqual(new Choice(1, B));
    });

    it('must keep another alternative when its fallback is kept', () => {
      const other = new Choice(0, A);

      expect(
        Steps.alternative(1, new Success(B)).modify(toB).apply(other)
      ).toBe(other);
    });

    it('must pass over another alternative without a fallback', () => {
      const other = new Choice(0, A);
      const step = Steps.alternative(1, new Failure(undefined));

      expect(step.preview(other).ok()).toBe(false);
      expect(step.modify(toB).apply(other)).toBe(other);
    });

    it('must pass over anything but a choice', () => {
      expect(Steps.alternative(0, new Success(A)).preview(A).ok()).toBe(false);
    });
  });
});
