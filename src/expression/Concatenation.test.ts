import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Character } from '#project/tree';

import { Concatenation } from './Concatenation.js';
import { type Expression } from './Expression.js';
import { Terminal } from './Terminal.js';

describe('Concatenation', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Character, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a concatenation with its elements and the input', () => {
      const element = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const input = 'input';

      expect(new Concatenation([element]).accept(visitor, input)).toEqual([
        'concatenation',
        [element],
        input,
      ]);
    });

    it('must not be affected by later changes to the elements it was given', () => {
      const element = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const elements = [element];
      const concatenation = new Concatenation(elements);

      elements.push(element);

      const input = 'input';

      expect(concatenation.accept(visitor, input)).toEqual([
        'concatenation',
        [element],
        input,
      ]);
    });
  });
});
