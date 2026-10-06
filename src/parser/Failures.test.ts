import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { Mismatch } from '#project/mismatch';

import { Failures } from './Failures.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

describe('Failures', () => {
  describe('mismatch', () => {
    it('must be empty at its origin before anything failed', () => {
      expect(new Failures(start).mismatch()).toEqual(Mismatch.empty(start));
    });
  });

  describe('fail', () => {
    it('must keep the furthest failure', () => {
      const failures = new Failures(start);

      failures.fail(Mismatch.expected(second, new Named('b')));
      failures.fail(Mismatch.expected(start, new Named('a')));

      expect(failures.mismatch()).toEqual(
        Mismatch.expected(second, new Named('b'))
      );
    });

    it('must combine failures at the same point', () => {
      const failures = new Failures(start);

      failures.fail(Mismatch.expected(start, new Named('a')));
      failures.fail(Mismatch.expected(start, new Named('b')));

      expect(failures.mismatch()).toEqual(
        Mismatch.expected(start, new Named('a'), new Named('b'))
      );
    });
  });
});
