import { describe, expect, it, vi } from 'vitest';

import { Cache } from './Cache.js';

describe('Cache', () => {
  describe('get', () => {
    it('must create a value for a new key', () => {
      expect(new Cache<string, number>().get('a', key => key.length)).toBe(1);
    });

    it('must create a value only once per key', () => {
      const cache = new Cache<string, object>();
      const create = vi.fn(() => ({}));

      const first = cache.get('a', create);

      expect(cache.get('a', create)).toBe(first);
      expect(create).toHaveBeenCalledExactlyOnceWith('a');
    });

    it('must keep keys apart', () => {
      const cache = new Cache<string, string>();

      cache.get('a', () => 'first');

      expect(cache.get('b', () => 'second')).toBe('second');
    });
  });
});
