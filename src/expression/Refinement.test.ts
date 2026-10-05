import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Literal } from '#project/tree';

import { type Expression } from './Expression.js';
import { Refinement } from './Refinement.js';
import { Terminal } from './Terminal.js';

const element = new Terminal(PartialIso.id<Literal>(), new Named('a literal'));

describe('Refinement', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a refinement with its element, partial conversion and the input', () => {
      const conversion = PartialIso.id<Literal>();

      const input = 'input';

      expect(
        new Refinement(element, conversion).accept(visitor, input)
      ).toEqual(['refinement', element, conversion, input]);
    });
  });
});
