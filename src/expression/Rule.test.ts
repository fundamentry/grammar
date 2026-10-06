import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Character } from '#project/tree';

import { type Expression } from './Expression.js';
import { Rule } from './Rule.js';
import { Terminal } from './Terminal.js';

describe('Rule', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Character, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a rule with its element, identity and the input', () => {
      const element = new Terminal(PartialIso.id<Character>(), new Named('a'));
      const rule = { name: () => 'CRLF' };
      const input = 'input';

      expect(new Rule(element, () => rule).accept(visitor, input)).toEqual([
        'rule',
        element,
        rule,
        input,
      ]);
    });
  });
});
