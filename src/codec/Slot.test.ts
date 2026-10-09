import { assert, describe, expect, it, vi } from 'vitest';

import { Morphism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { Character, Choice, type Node, Option } from '#project/tree';

import { Slot } from './Slot.js';
import { Slots } from './Slots.js';

const fallback = <T>(result: T) => ({ default: () => result });

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

const toB = Morphism.of((): Node => B);

describe('Slot', () => {
  describe('value', () => {
    it('must preview the value of a present option', () => {
      const found = Slot.value(fallback(new Success(B))).preview(new Option(A));

      assert(found.ok());
      expect(found.value()).toBe(A);
    });

    it('must find nothing in an absent option, even with a fallback', () => {
      expect(
        Slot.value(fallback(new Success(A)))
          .preview(new Option())
          .ok()
      ).toBe(false);
    });

    it('must find nothing in anything but an option', () => {
      expect(
        Slot.value(fallback(new Success(A)))
          .preview(A)
          .ok()
      ).toBe(false);
    });
  });

  describe('alternative', () => {
    it('must preview the alternative taken', () => {
      const found = Slot.alternative(1, fallback(new Success(B))).preview(
        new Choice(1, A)
      );

      assert(found.ok());
      expect(found.value()).toBe(A);
    });

    it('must find nothing in another alternative', () => {
      expect(
        Slot.alternative(1, fallback(new Success(A)))
          .preview(new Choice(0, A))
          .ok()
      ).toBe(false);
    });

    it('must find nothing in anything but a choice', () => {
      expect(
        Slot.alternative(0, fallback(new Success(A)))
          .preview(A)
          .ok()
      ).toBe(false);
    });
  });

  describe('step', () => {
    it('must preview what the slot previews', () => {
      const found = Slot.value(fallback(new Failure(undefined)))
        .step(Slots.edit)
        .preview(new Option(A));

      assert(found.ok());
      expect(found.value()).toBe(A);
    });

    it('must update the value of a present option', () => {
      expect(
        Slot.value(fallback(new Failure(undefined)))
          .step(Slots.edit)
          .modify(toB)
          .apply(new Option(A))
      ).toEqual(new Option(B));
    });

    it('must update the alternative taken', () => {
      expect(
        Slot.alternative(1, fallback(new Failure(undefined)))
          .step(Slots.edit)
          .modify(toB)
          .apply(new Choice(1, A))
      ).toEqual(new Choice(1, B));
    });

    it('must create an absent option from its fallback when updated', () => {
      expect(
        Slot.value(fallback(new Success(A)))
          .step(Slots.edit)
          .modify(toB)
          .apply(new Option())
      ).toEqual(new Option(B));
    });

    it('must take the alternative from its fallback when updated', () => {
      expect(
        Slot.alternative(1, fallback(new Success(A)))
          .step(Slots.edit)
          .modify(toB)
          .apply(new Choice(0, A))
      ).toEqual(new Choice(1, B));
    });

    it('must leave an absent option absent when the slots keep its fallback', () => {
      const absent = new Option();

      expect(
        Slot.value(fallback(new Success(B)))
          .step(Slots.edit)
          .modify(toB)
          .apply(absent)
      ).toBe(absent);
    });

    it('must keep another alternative when the slots keep its fallback', () => {
      const other = new Choice(0, A);

      expect(
        Slot.alternative(1, fallback(new Success(B)))
          .step(Slots.edit)
          .modify(toB)
          .apply(other)
      ).toBe(other);
    });

    it('must create an absent option when the slots do not keep its fallback', () => {
      expect(
        Slot.value(fallback(new Success(B)))
          .step(Slots.fill)
          .modify(toB)
          .apply(new Option())
      ).toEqual(new Option(B));
    });

    it('must pass over an absent option without a fallback', () => {
      const absent = new Option();

      expect(
        Slot.value(fallback(new Failure(undefined)))
          .step(Slots.fill)
          .modify(toB)
          .apply(absent)
      ).toBe(absent);
    });

    it('must ask for its fallback only to create an absent option', () => {
      const create = vi.fn(() => new Success(A));
      const step = Slot.value({ default: create }).step(Slots.edit);

      step.preview(new Option());
      step.modify(toB).apply(new Option(A));

      expect(create).not.toHaveBeenCalled();

      step.modify(toB).apply(new Option());

      expect(create).toHaveBeenCalledOnce();
    });

    it('must pass over anything but an option', () => {
      expect(
        Slot.value(fallback(new Success(A)))
          .step(Slots.fill)
          .modify(toB)
          .apply(A)
      ).toBe(A);
    });
  });
});
