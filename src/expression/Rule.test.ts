import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Literal } from '#project/tree';

import { type Expression } from './Expression.js';
import { Rule } from './Rule.js';
import { Terminal } from './Terminal.js';

describe('Rule', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a rule with its element, name and the input', () => {
      const element = new Terminal(PartialIso.id<Literal>(), new Named('a'));
      const input = 'input';

      expect(new Rule(element, 'CRLF').accept(visitor, input)).toEqual([
        'rule',
        element,
        'CRLF',
        input,
      ]);
    });
  });
});
