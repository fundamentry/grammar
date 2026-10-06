import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Option, Repetition } from '#project/tree';

import { Matches } from './Matches.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

const end = second.step()?.rest ?? second;

describe('Matches', () => {
  describe('add', () => {
    it('must report a step over a new span as added', () => {
      expect(
        new Matches(start).add({ value: new Option(), rest: second })
      ).toBe(true);
    });

    it('must not report a step over a known span as added', () => {
      const matches = new Matches(start);

      matches.add({ value: new Option(), rest: second });

      expect(matches.add({ value: new Repetition([]), rest: second })).toBe(
        false
      );
    });
  });

  describe('steps', () => {
    it('must keep only the first step for each span, in order', () => {
      const matches = new Matches(start);
      const first = { value: new Option(), rest: second };
      const longer = { value: new Option(), rest: end };

      matches.add(first);
      matches.add({ value: new Repetition([]), rest: second });
      matches.add(longer);

      expect(matches.steps()).toEqual([first, longer]);
    });
  });
});
