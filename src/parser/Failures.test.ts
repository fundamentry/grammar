import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';

import { Failures } from './Failures.js';
import { Frontier } from './Frontier.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

describe('Failures', () => {
  describe('mismatch', () => {
    it('must be empty at its origin before anything failed', () => {
      expect(new Failures(start).frontier()).toEqual(Frontier.empty(start));
    });
  });

  describe('fail', () => {
    it('must keep the furthest failure', () => {
      const failures = new Failures(start);

      failures.fail(Frontier.expected(second, new Named('b')));
      failures.fail(Frontier.expected(start, new Named('a')));

      expect(failures.frontier()).toEqual(
        Frontier.expected(second, new Named('b'))
      );
    });

    it('must combine failures at the same point', () => {
      const failures = new Failures(start);

      failures.fail(Frontier.expected(start, new Named('a')));
      failures.fail(Frontier.expected(start, new Named('b')));

      expect(failures.frontier()).toEqual(
        Frontier.expected(start, new Named('a'), new Named('b'))
      );
    });
  });
});
