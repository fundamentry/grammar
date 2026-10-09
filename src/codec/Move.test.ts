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

const A = new Character(CodePoint.of('a'));

describe('Move', () => {
  describe('rule', () => {
    it('must move into the elements of a nonterminal, named by its rule', () => {
      const move = Move.rule('rule');
      const previewed = move
        .step()
        .preview(new Nonterminal({ name: () => 'rule' }, A));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
      expect(String(move)).toBe('rule');
    });
  });

  describe('sequence', () => {
    it('must move to the element of a sequence at the index', () => {
      const move = Move.sequence(1);
      const previewed = move.step().preview(new Sequence([A, A]));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
      expect(String(move)).toBe('sequence[1]');
    });
  });

  describe('choice', () => {
    it('must move to the alternative of a choice at the index', () => {
      const move = Move.choice(1, new Failure(undefined));

      expect(move.step().preview(new Choice(1, A)).ok()).toBe(true);
      expect(move.step().preview(new Choice(0, A)).ok()).toBe(false);
      expect(String(move)).toBe('choice[1]');
    });
  });

  describe('choose', () => {
    it('must take the alternative of a move to an alternative', () => {
      expect(
        Move.choice(1, new Failure(undefined)).choose().set(new Choice(0, A), A)
      ).toEqual(new Choice(1, A));
    });

    it('must take the step of any other move', () => {
      const move = Move.sequence(1);

      expect(move.choose()).toBe(move.step());
    });
  });

  describe('option', () => {
    it('must move to the value of an option, creating it from the fallback', () => {
      const B = new Character(CodePoint.of('b'));
      const move = Move.option(new Success(A));

      expect(move.step().set(new Option(), B)).toEqual(new Option(B));
      expect(String(move)).toBe('option');
    });
  });

  describe('excludes', () => {
    it('must hold for moves to different alternatives', () => {
      const first = Move.choice(0, new Failure(undefined));
      const second = Move.choice(1, new Failure(undefined));

      expect(first.excludes(second)).toBe(true);
      expect(second.excludes(first)).toBe(true);
      expect(first.excludes(Move.choice(0, new Failure(undefined)))).toBe(
        false
      );
    });

    it('must not hold for moves that are not both to alternatives', () => {
      const choice = Move.choice(0, new Failure(undefined));

      expect(choice.excludes(Move.sequence(0))).toBe(false);
      expect(Move.sequence(0).excludes(choice)).toBe(false);
      expect(Move.sequence(0).excludes(Move.sequence(1))).toBe(false);
      expect(Move.option(new Failure(undefined)).excludes(choice)).toBe(false);
      expect(Move.rule('rule').excludes(choice)).toBe(false);
      expect(choice.excludes(undefined)).toBe(false);
    });
  });

  describe('equals', () => {
    it('must hold for moves to the same place', () => {
      expect(Move.sequence(1).equals(Move.sequence(1))).toBe(true);
      expect(Move.sequence(1).equals(Move.sequence(0))).toBe(false);
      expect(
        Move.sequence(0).equals(Move.choice(0, new Failure(undefined)))
      ).toBe(false);
      expect(Move.sequence(0).equals('sequence[0]')).toBe(false);
    });
  });
});
