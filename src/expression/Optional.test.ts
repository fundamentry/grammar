import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Literal } from '#project/tree';

import { type Expression } from './Expression.js';
import { Optional } from './Optional.js';
import { Terminal } from './Terminal.js';

describe('Optional', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as an optional with its element and the input', () => {
      const element = new Terminal(
        PartialIso.id<Literal>(),
        new Named('a literal')
      );
      const input = 'input';

      expect(new Optional(element).accept(visitor, input)).toEqual([
        'optional',
        element,
        input,
      ]);
    });
  });
});
