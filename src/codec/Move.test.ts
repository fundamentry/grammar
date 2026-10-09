import { assert, describe, expect, it } from 'vitest';

import { Failure, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import {
  Character,
  Choice,
  Nonterminal,
  Option,
  Sequence,
} from '#project/tree';

import { Move } from './Move.js';
import { Slots } from './Slots.js';

const fallback = <T>(result: T) => ({ default: () => result });

const A = new Character(CodePoint.of('a'));

describe('Move', () => {
  describe('rule', () => {
    it('must move into the elements of a nonterminal, named by its rule', () => {
      const move = Move.rule('rule');
      const previewed = move
        .step(Slots.edit)
        .preview(new Nonterminal({ name: () => 'rule' }, A));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
      expect(String(move)).toBe('rule');
    });
  });

  describe('sequence', () => {
    it('must move to the element of a sequence at the index', () => {
      const move = Move.sequence(1);
      const previewed = move.step(Slots.edit).preview(new Sequence([A, A]));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
      expect(String(move)).toBe('sequence[1]');
    });
  });

  describe('choice', () => {
    it('must move to the alternative of a choice at the index', () => {
      const move = Move.choice(1, fallback(new Failure(undefined)));

      expect(move.step(Slots.edit).preview(new Choice(1, A)).ok()).toBe(true);
      expect(move.step(Slots.edit).preview(new Choice(0, A)).ok()).toBe(false);
      expect(String(move)).toBe('choice[1]');
    });
  });

  describe('choose', () => {
    it('must take the alternative of a move to an alternative', () => {
      expect(
        Move.choice(1, fallback(new Failure(undefined)))
          .choose(Slots.edit)
          .set(new Choice(0, A), A)
      ).toEqual(new Choice(1, A));
    });

    it('must take the step of any other move', () => {
      const B = new Character(CodePoint.of('b'));

      expect(
        Move.sequence(1)
          .choose(Slots.edit)
          .set(new Sequence([A, A]), B)
      ).toEqual(new Sequence([A, B]));
    });
  });

  describe('option', () => {
    it('must move to the value of an option, creating it from the fallback', () => {
      const B = new Character(CodePoint.of('b'));
      const move = Move.option(fallback(new Success(A)));

      expect(move.step(Slots.edit).set(new Option(), B)).toEqual(new Option(B));
      expect(String(move)).toBe('option');
    });
  });

  describe('preview', () => {
    it('must preview the value of a present option', () => {
      const previewed = Move.option(fallback(new Success(A))).preview(
        new Option(A)
      );

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
    });

    it('must find nothing in an absent option, even with a fallback', () => {
      expect(
        Move.option(fallback(new Success(A)))
          .preview(new Option())
          .ok()
      ).toBe(false);
    });

    it('must find nothing in another alternative', () => {
      expect(
        Move.choice(1, fallback(new Success(A)))
          .preview(new Choice(0, A))
          .ok()
      ).toBe(false);
    });

    it('must preview the element of a sequence', () => {
      const previewed = Move.sequence(1).preview(new Sequence([A, A]));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
    });
  });

  describe('blocks', () => {
    it('must be blocked by a choice taken another way', () => {
      expect(
        Move.choice(1, fallback(new Failure(undefined))).blocks(
          new Choice(0, A)
        )
      ).toBe(true);
    });

    it('must not be blocked by a choice taken its way', () => {
      expect(
        Move.choice(0, fallback(new Failure(undefined))).blocks(
          new Choice(0, A)
        )
      ).toBe(false);
    });

    it('must not be blocked by an absent option', () => {
      expect(
        Move.option(fallback(new Failure(undefined))).blocks(new Option())
      ).toBe(false);
    });
  });

  describe('excludes', () => {
    it('must hold for moves to different alternatives', () => {
      const first = Move.choice(0, fallback(new Failure(undefined)));
      const second = Move.choice(1, fallback(new Failure(undefined)));

      expect(first.excludes(second)).toBe(true);
      expect(second.excludes(first)).toBe(true);
      expect(
        first.excludes(Move.choice(0, fallback(new Failure(undefined))))
      ).toBe(false);
    });

    it('must not hold for moves that are not both to alternatives', () => {
      const choice = Move.choice(0, fallback(new Failure(undefined)));

      expect(choice.excludes(Move.sequence(0))).toBe(false);
      expect(Move.sequence(0).excludes(choice)).toBe(false);
      expect(Move.sequence(0).excludes(Move.sequence(1))).toBe(false);
      expect(
        Move.option(fallback(new Failure(undefined))).excludes(choice)
      ).toBe(false);
      expect(Move.rule('rule').excludes(choice)).toBe(false);
      expect(choice.excludes(undefined)).toBe(false);
    });
  });

  describe('equals', () => {
    it('must hold for moves to the same place', () => {
      expect(Move.sequence(1).equals(Move.sequence(1))).toBe(true);
      expect(Move.sequence(1).equals(Move.sequence(0))).toBe(false);
      expect(
        Move.sequence(0).equals(
          Move.choice(0, fallback(new Failure(undefined)))
        )
      ).toBe(false);
      expect(Move.sequence(0).equals('sequence[0]')).toBe(false);
    });
  });
});
