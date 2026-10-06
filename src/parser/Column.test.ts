import { describe, expect, it, vi } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Concatenation } from '#project/expression';
import { Option } from '#project/tree';

import { Column } from './Column.js';
import { Context } from './Context.js';
import { Continuation } from './Continuation.js';
import { type Parser } from './Parser.js';

const start = Point.of('ab');

const past: Parser.Parse<string> = (point, context, continuation) => {
  const step = point.step();

  if (step)
    context.succeed(continuation, [{ value: new Option(), rest: step.rest }]);
};

const rule = (
  parse: Parser.Parse<string>,
  grows = false
): Column.Rule<string> => {
  const expression = new Concatenation<string>([]);

  return {
    expression,
    parse,
    corners: grows ? new Set([expression]) : new Set(),
  };
};

const ends = (
  call: (column: Column<string>, found: number[]) => void,
  callers = 1
) => {
  const found: number[][] = Array.from({ length: callers }, () => []);

  Context.run(start, (_, context) => {
    const column = new Column(context, start);

    found.forEach(each => call(column, each));
  });

  return found;
};

const collect = (found: number[]) =>
  Continuation.of((step: Point.Step<string, unknown>) =>
    found.push(step.rest.distanceFrom(start))
  );

describe('Column', () => {
  describe('recall', () => {
    it('must hand on what a rule parses', () => {
      const recalled = rule(past);

      expect(
        ends((column, found) => column.recall(recalled, collect(found)))
      ).toEqual([[1]]);
    });

    it('must hand on what a rule parses to every caller', () => {
      const recalled = rule(past);

      expect(
        ends((column, found) => column.recall(recalled, collect(found)), 2)
      ).toEqual([[1], [1]]);
    });

    it('must parse a rule only once', () => {
      const parse = vi.fn(past);
      const recalled = rule(parse);

      ends((column, found) => column.recall(recalled, collect(found)), 2);

      expect(parse).toHaveBeenCalledOnce();
    });

    it('must hand on what a rule parsed to a caller that comes after it finished', () => {
      const parse = vi.fn(past);
      const recalled = rule(parse);

      expect(
        ends((column, found) =>
          column.recall(
            recalled,
            Continuation.of(() => column.recall(recalled, collect(found)))
          )
        )
      ).toEqual([[1]]);
      expect(parse).toHaveBeenCalledOnce();
    });

    it('must grow a rule that grows until a pass finds nothing new', () => {
      const parse = vi.fn(past);
      const grown = rule(parse, true);

      expect(
        ends((column, found) => column.recall(grown, collect(found)))
      ).toEqual([[1]]);
      expect(parse).toHaveBeenCalledTimes(2);
    });
  });
});
