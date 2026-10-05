import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { type Literal } from '#project/tree';

import { type Expression } from './Expression.js';
import { Repetition } from './Repetition.js';
import { Terminal } from './Terminal.js';

const element = new Terminal(PartialIso.id<Literal>(), new Named('a literal'));

describe('Repetition', () => {
  describe('constructor', () => {
    it.each([
      Range.open(Integer.of(1), Integer.of(2)),
      Range.atMost(Integer.of(-1)),
    ])("must reject bounds '%s' that contain no count", bounds => {
      expect(() => new Repetition(element, bounds)).toThrow(
        new RangeError(`Invalid repetition bounds: ${String(bounds)}`)
      );
    });
  });

  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    it('must visit as a repetition with its element, bounds and the input', () => {
      const bounds = Range.atLeast(Integer.of(1));
      const input = 'input';

      expect(new Repetition(element, bounds).accept(visitor, input)).toEqual([
        'repetition',
        element,
        bounds,
        input,
      ]);
    });
  });
});
