import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Option, Repetition } from '#project/tree';

import { Spans } from './Spans.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

const end = second.step()?.rest ?? second;

describe('Spans', () => {
  describe('visit', () => {
    it('must report the first step over a span', () => {
      expect(
        new Spans(start).visit({ value: new Option(), rest: second })
      ).toBe(true);
    });

    it('must not report another step over a known span, whatever its value', () => {
      const spans = new Spans(start);

      spans.visit({ value: new Option(), rest: second });

      expect(spans.visit({ value: new Repetition([]), rest: second })).toBe(
        false
      );
    });

    it('must tell spans apart by where they end', () => {
      const spans = new Spans(start);

      spans.visit({ value: new Option(), rest: second });

      expect(spans.visit({ value: new Option(), rest: end })).toBe(true);
    });
  });
});
