import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { type Node, Option } from '#project/tree';

import { Context } from './Context.js';
import { Growth } from './Growth.js';

const start = Point.of('abc');

const at = (offset: number): Point<string> =>
  Array.from({ length: offset }).reduce<Point<string>>(
    point => point.step()?.rest ?? point,
    start
  );

const step = (offset: number): Point.Step<string, Node> => ({
  value: new Option(),
  rest: at(offset),
});

const run = (
  found: (
    seed: readonly Point.Step<string, Node>[]
  ) => Point.Step<string, Node> | undefined
) => {
  const seeds: (readonly Point.Step<string, Node>[])[] = [];
  const events: (string | Point.Step<string, Node>)[] = [];

  Context.run(start, (_, context, continuation) => {
    const growth = new Growth(context, start);

    growth.run(
      (_point, inner, next) => {
        const seed = growth.seed();
        const match = found(seed);

        seeds.push(seed);

        if (match) inner.succeed(next, [match]);
      },
      continuation.with(match => events.push(match)),
      () => events.push('done')
    );
  });

  return { seeds, events };
};

const upTo =
  (limit: number) =>
  ([last]: readonly Point.Step<string, Node>[]) => {
    const offset = last ? last.rest.distanceFrom(start) + 1 : 1;

    return offset <= limit ? step(offset) : undefined;
  };

describe('Growth', () => {
  describe('run', () => {
    it('must pass on every match it grew, longest first, once it is done', () => {
      expect(run(upTo(3)).events).toEqual(['done', step(3), step(2), step(1)]);
    });

    it('must stop after the first pass that grows nothing', () => {
      expect(run(upTo(2)).seeds).toHaveLength(3);
    });

    it('must not grow from a span it found before', () => {
      expect(run(() => step(1)).seeds).toHaveLength(2);
    });

    it('must be done without matches when the first pass finds none', () => {
      expect(run(upTo(0)).events).toEqual(['done']);
    });
  });

  describe('seed', () => {
    it('must seed each pass with what the pass before it grew', () => {
      expect(run(upTo(2)).seeds).toEqual([[], [step(1)], [step(2)]]);
    });
  });
});
