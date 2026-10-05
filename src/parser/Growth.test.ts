import { describe, expect, it, vi } from 'vitest';

import { Point } from '@fundamentry/stream';

import { type Node, Option } from '#project/tree';

import { Context } from './Context.js';
import { Growth } from './Growth.js';
import { type Parser } from './Parser.js';

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

describe('Growth', () => {
  describe('run', () => {
    const grow = (
      growth: Growth<string>,
      limit: number
    ): Parser.Parse<string> =>
      vi.fn<Parser.Parse<string>>((_, context, continuation) => {
        const [seed] = growth.seed();
        const offset = seed ? seed.rest.distanceFrom(start) + 1 : 1;

        if (offset <= limit) context.succeed(continuation, step(offset));
      });

    const run = (growth: Growth<string>, parse: Parser.Parse<string>) => {
      const events: (string | Point.Step<string, Node>)[] = [];

      Context.run(start, (_, context, continuation) =>
        growth.run(
          parse,
          context,
          { ...continuation, succeed: found => events.push(found) },
          () => events.push('done')
        )
      );

      return events;
    };

    it('must pass on every match it grew, longest first, once it is done', () => {
      const growth = new Growth(start);

      expect(run(growth, grow(growth, 3))).toEqual([
        'done',
        step(3),
        step(2),
        step(1),
      ]);
    });

    it('must stop after the first pass that grows nothing', () => {
      const growth = new Growth(start);
      const parse = grow(growth, 2);

      run(growth, parse);

      expect(parse).toHaveBeenCalledTimes(3);
    });

    it('must be done without matches when the first pass finds none', () => {
      const growth = new Growth(start);

      expect(run(growth, grow(growth, 0))).toEqual(['done']);
    });
  });

  describe('seed', () => {
    it('must start without a seed', () => {
      expect(new Growth(start).seed()).toEqual([]);
    });

    it('must seed what the last pass grew', () => {
      const growth = new Growth(start);

      growth.absorb(step(1));
      growth.grew();
      growth.absorb(step(1));
      growth.absorb(step(2));
      growth.grew();

      expect(growth.seed()).toEqual([step(2)]);
    });
  });

  describe('grew', () => {
    it('must report that a pass grew when it found a new span', () => {
      const growth = new Growth(start);

      growth.absorb(step(1));

      expect(growth.grew()).toBe(true);
    });

    it('must report that a pass did not grow when it found no new span', () => {
      const growth = new Growth(start);

      growth.absorb(step(1));
      growth.grew();
      growth.absorb(step(1));

      expect(growth.grew()).toBe(false);
    });
  });

  describe('steps', () => {
    it('must list longer spans before shorter ones', () => {
      const growth = new Growth(start);

      growth.absorb(step(1));
      growth.grew();
      growth.absorb(step(3));
      growth.grew();
      growth.absorb(step(2));
      growth.grew();

      expect(growth.steps()).toEqual([step(3), step(2), step(1)]);
    });
  });
});
