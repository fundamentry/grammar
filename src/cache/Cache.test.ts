import { describe, expect, it, vi } from 'vitest';

import { Cache } from './Cache.js';

describe('Cache', () => {
  describe('get', () => {
    it('must create a value for a new key', () => {
      expect(
        new Cache<string, number>(new Map()).get('a', key => key.length)
      ).toBe(1);
    });

    it('must create a value only once per key', () => {
      const cache = new Cache<string, object>(new Map());
      const create = vi.fn(() => ({}));

      const first = cache.get('a', create);

      expect(cache.get('a', create)).toBe(first);
      expect(create).toHaveBeenCalledExactlyOnceWith('a');
    });

    it('must keep what it creates in the entries it is given', () => {
      const entries = new WeakMap<object, string>();
      const key = {};

      new Cache(entries).get(key, () => 'created');

      expect(entries.get(key)).toBe('created');
    });

    it('must keep keys apart', () => {
      const cache = new Cache<string, string>(new Map());

      cache.get('a', () => 'first');

      expect(cache.get('b', () => 'second')).toBe('second');
    });
  });
});
