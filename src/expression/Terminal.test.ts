import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Literal } from '#project/tree';

import { type Expression } from './Expression.js';
import { Terminal } from './Terminal.js';

describe('Terminal', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a terminal with its partial conversion and the input', () => {
      const conversion = PartialIso.id<Literal>();
      const expectation = new Named('a literal');
      const input = 'input';

      expect(
        new Terminal(conversion, expectation).accept(visitor, input)
      ).toEqual(['terminal', conversion, expectation, input]);
    });
  });
});
