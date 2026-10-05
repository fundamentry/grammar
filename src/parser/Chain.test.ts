import { describe, expect, it } from 'vitest';

import { Chain } from './Chain.js';

describe('Chain', () => {
  describe('toArray', () => {
    it('must be empty for the empty chain', () => {
      expect(Chain.empty<string>().toArray()).toEqual([]);
    });

    it('must list the appended items in order', () => {
      expect(Chain.empty<string>().append('a').append('b').toArray()).toEqual([
        'a',
        'b',
      ]);
    });

    it('must leave the chain it appended to unchanged', () => {
      const prefix = Chain.empty<string>().append('a');

      prefix.append('b');
      prefix.append('c');

      expect(prefix.toArray()).toEqual(['a']);
    });

    it('must be stack-safe on long chains', () => {
      const chain = Array.from({ length: 100_000 }, (_, index) => index).reduce(
        (prefix, item) => prefix.append(item),
        Chain.empty<number>()
      );

      expect(chain.toArray()).toHaveLength(100_000);
    });
  });
});
