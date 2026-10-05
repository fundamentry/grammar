import { describe, expect, it } from 'vitest';

import { Equatable } from '@fundamentry/trait';

import { Data } from './Data.js';

class Leaf extends Data {
  readonly #text: string;

  constructor(text: string) {
    super();

    this.#text = text;
  }

  override equals(other: unknown): boolean {
    return other instanceof Leaf && this.#text === other.#text;
  }

  override toString(): string {
    return this.#text;
  }
}

describe('Data', () => {
  describe('[Equatable.symbol]', () => {
    it('must make data Equatable', () => {
      expect(Equatable.is(new Leaf('a'))).toBe(true);
    });

    it('must compare through equals', () => {
      expect(Equatable.equals<unknown>(new Leaf('a'), new Leaf('a'))).toBe(
        true
      );
      expect(Equatable.equals<unknown>(new Leaf('a'), new Leaf('b'))).toBe(
        false
      );
    });
  });

  describe('[Symbol.toPrimitive]', () => {
    it('must convert to a string through toString', () => {
      const node = new Leaf('a');

      expect(String(node)).toBe('a');
      expect(`<${String(node)}>`).toBe('<a>');
      expect([node, new Leaf('b')].join('')).toBe('ab');
    });
  });
});
