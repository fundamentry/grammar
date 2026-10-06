import { assert, describe, expect, it, vi } from 'vitest';

import { Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { type Node, Option } from '#project/tree';

import { Context } from './Context.js';
import { Continuation } from './Continuation.js';
import { Frontier } from './Frontier.js';
import { type Parser } from './Parser.js';
import { Repetitions } from './Repetitions.js';

const letters: Parser.Parse<string> = (point, context, continuation) => {
  const step = point.step();

  if (step)
    context.succeed(continuation, [{ value: new Option(), rest: step.rest }]);
};

const repeat = (
  bounds: Range<Integer>,
  text: string,
  element: Parser.Parse<string> = letters
) => {
  const counts: number[] = [];
  const start = Point.of(text);
  const parsed = Context.run(start, (point, context) =>
    new Repetitions(bounds).from(
      point,
      context,
      element,
      Continuation.of(({ value }: Point.Step<string, readonly Node[]>) =>
        counts.push(value.length)
      )
    )
  );

  assert(!parsed.ok());

  return { counts, mismatch: parsed.error() };
};

describe('Repetitions', () => {
  describe('from', () => {
    it('must yield longer repetitions before shorter ones', () => {
      expect(repeat(Range.atLeast(Integer.of(0)), 'aaa').counts).toEqual([
        3, 2, 1, 0,
      ]);
    });

    it('must yield no repetition shorter than the minimum or longer than the maximum', () => {
      expect(
        repeat(Range.closed(Integer.of(1), Integer.of(2)), 'aaaa').counts
      ).toEqual([2, 1]);
    });

    it('must yield no repetition at an open bound', () => {
      expect(
        repeat(Range.open(Integer.of(0), Integer.of(3)), 'aaaa').counts
      ).toEqual([2, 1]);
    });

    it('must not repeat a zero-width iteration beyond the minimum', () => {
      const empty: Parser.Parse<string> = (point, context, continuation) =>
        context.succeed(continuation, [{ value: new Option(), rest: point }]);

      expect(repeat(Range.atLeast(Integer.of(2)), 'a', empty).counts).toEqual([
        2,
      ]);
    });

    it('must try each iteration at a point and count once', () => {
      const element = vi.fn(letters);

      repeat(Range.atLeast(Integer.of(0)), 'aaa', element);

      expect(element).toHaveBeenCalledTimes(4);
    });

    it('must report the failures of its iterations', () => {
      const failing: Parser.Parse<string> = (point, context, continuation) => {
        context.fail(
          continuation.relabel(Frontier.expected(point, new Named('a letter')))
        );
        letters(point, context, continuation);
      };

      const { mismatch } = repeat(Range.atLeast(Integer.of(0)), 'a', failing);

      expect(String(mismatch)).toBe('Expected a letter, got end of input');
      expect(mismatch.offset()).toBe(1);
    });
  });
});
