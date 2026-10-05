import { describe, expect, it } from 'vitest';

import { Rope } from './Rope.js';

describe('Rope', () => {
  describe('isEmpty', () => {
    it('must be empty when made empty', () => {
      expect(Rope.empty().isEmpty()).toBe(true);
    });

    it('must not be empty when made of an item', () => {
      expect(Rope.of('a').isEmpty()).toBe(false);
    });
  });

  describe('concat', () => {
    it('must return the other rope when this one is empty', () => {
      const rope = Rope.of('a');

      expect(Rope.empty<string>().concat(rope)).toBe(rope);
    });

    it('must return this rope when the other one is empty', () => {
      const rope = Rope.of('a');

      expect(rope.concat(Rope.empty())).toBe(rope);
    });
  });

  describe('[Symbol.iterator]', () => {
    it('must have no items when empty', () => {
      expect([...Rope.empty()]).toEqual([]);
    });

    it('must have the item it was made of', () => {
      expect([...Rope.of('a')]).toEqual(['a']);
    });

    it('must yield the same items when iterated again', () => {
      const rope = Rope.of('a').concat(Rope.of('b'));

      expect([...rope]).toEqual([...rope]);
    });

    it('must keep the items of concatenated ropes in order', () => {
      const rope = Rope.of('a')
        .concat(Rope.of('b').concat(Rope.of('c')))
        .concat(Rope.empty());

      expect([...rope]).toEqual(['a', 'b', 'c']);
    });

    it('must be stack-safe on long concatenations', () => {
      const rope = Array.from({ length: 100_000 }, () => Rope.of('a')).reduce(
        (left, right) => left.concat(right),
        Rope.empty<string>()
      );

      expect([...rope]).toHaveLength(100_000);
    });
  });
});
