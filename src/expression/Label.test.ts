import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Character } from '#project/tree';

import { type Expression } from './Expression.js';
import { Label } from './Label.js';
import { Terminal } from './Terminal.js';

describe('Label', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Character, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a label with its element, expectation and the input', () => {
      const element = new Terminal(PartialIso.id<Character>(), new Named('a'));
      const expectation = new Named('a label');
      const input = 'input';

      expect(new Label(element, expectation).accept(visitor, input)).toEqual([
        'label',
        element,
        expectation,
        input,
      ]);
    });
  });
});
