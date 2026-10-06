import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Character } from '#project/tree';

import { Alternation } from './Alternation.js';
import { type Expression } from './Expression.js';
import { Terminal } from './Terminal.js';

describe('Alternation', () => {
  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Character, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as an alternation with its alternatives in order and the input', () => {
      const left = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const middle = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const right = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const input = 'input';

      expect(
        new Alternation([left, middle, right]).accept(visitor, input)
      ).toEqual(['alternation', [left, middle, right], input]);
    });

    it('must not be affected by later changes to the alternatives it was given', () => {
      const left = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const right = new Terminal(
        PartialIso.id<Character>(),
        new Named('a literal')
      );
      const alternatives: [Expression<Character>, Expression<Character>] = [
        left,
        right,
      ];
      const alternation = new Alternation(alternatives);

      alternatives[1] = left;

      const input = 'input';

      expect(alternation.accept(visitor, input)).toEqual([
        'alternation',
        [left, right],
        input,
      ]);
    });
  });
});
