import { describe, expect, it } from 'vitest';

import { View } from './View.js';

describe('View', () => {
  describe('values', () => {
    it('must yield the values it was made from', () => {
      expect(new View(() => [1, 2].values()).values().toArray()).toEqual([
        1, 2,
      ]);
    });
  });

  describe('iterator', () => {
    it('must iterate over the values', () => {
      expect([...new View(() => [1, 2].values())]).toEqual([1, 2]);
    });
  });

  describe('find', () => {
    it('must find the first value', () => {
      expect(new View(() => [1, 2].values()).find()).toBe(1);
    });

    it('must find nothing without values', () => {
      expect(new View(() => [].values()).find()).toBeUndefined();
    });
  });

  describe('map', () => {
    it('must project every value', () => {
      expect(
        new View(() => [1, 2].values())
          .map(value => value * 10)
          .values()
          .toArray()
      ).toEqual([10, 20]);
    });

    it('must hand the projection the value alone', () => {
      expect(
        new View(() => ['10', '10'].values())
          .map(Number.parseInt)
          .values()
          .toArray()
      ).toEqual([10, 10]);
    });

    it('must project only the values pulled', () => {
      const projected: number[] = [];
      const iterator = new View(() => [1, 2, 3].values())
        .map(value => {
          projected.push(value);

          return value;
        })
        .values();

      iterator.next();

      expect(projected).toEqual([1]);
    });
  });
});
