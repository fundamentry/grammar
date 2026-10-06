import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { EndOfInput, Named } from '#project/expectation';

import { Frontier } from './Frontier.js';

const start = Point.of('a!');

const { rest: next } = start.span(value => value === 'a');

const { rest: end } = next.span(() => true);

const digit = new Named('a digit');

const letter = new Named('a letter');

describe('Frontier', () => {
  describe('empty', () => {
    it('must expect nothing at its point', () => {
      const frontier = Frontier.empty(start);

      expect(frontier.at()).toBe(start);
      expect(frontier.expected()).toEqual([]);
    });
  });

  describe('expected', () => {
    it('must expect each distinct expectation once, in order', () => {
      expect(
        Frontier.expected(next, digit, letter, new Named('a digit')).expected()
      ).toEqual([digit, letter]);
    });
  });

  describe('compareReach', () => {
    it('must order frontiers by how far they got', () => {
      expect(
        Frontier.expected(next, digit).compareReach(
          Frontier.expected(start, digit)
        )
      ).toBeGreaterThan(0);
    });

    it('must order an empty frontier before any other, wherever it is', () => {
      expect(
        Frontier.empty(end).compareReach(Frontier.expected(start, digit))
      ).toBeLessThan(0);
      expect(
        Frontier.expected(start, digit).compareReach(Frontier.empty(end))
      ).toBeGreaterThan(0);
    });

    it('must order empty frontiers alike', () => {
      expect(Frontier.empty(start).compareReach(Frontier.empty(end))).toBe(0);
    });
  });

  describe('merge', () => {
    it('must keep the frontier that got further', () => {
      const near = Frontier.expected(start, digit);
      const far = Frontier.expected(next, letter);

      expect(near.merge(far)).toBe(far);
      expect(far.merge(near)).toBe(far);
    });

    it('must combine what was expected at the same point, in order and without repeats', () => {
      const merged = Frontier.expected(next, digit)
        .merge(Frontier.expected(next, letter))
        .merge(Frontier.expected(next, new Named('a digit')));

      expect(merged.expected()).toEqual([digit, letter]);
    });

    it('must leave anything merged with the empty frontier at its start unchanged', () => {
      const frontier = Frontier.expected(start, digit);

      expect(Frontier.empty(start).merge(frontier)).toEqual(frontier);
      expect(frontier.merge(Frontier.empty(start))).toEqual(frontier);
    });

    it('must leave anything merged with an empty frontier further on unchanged', () => {
      const frontier = Frontier.expected(start, digit);

      expect(Frontier.empty(end).merge(frontier)).toEqual(frontier);
      expect(frontier.merge(Frontier.empty(end))).toEqual(frontier);
    });
  });

  describe('relabel', () => {
    it('must replace what was expected', () => {
      const relabelled = Frontier.expected(start, digit, letter).relabel(
        new Named('a value')
      );

      expect(relabelled.expected()).toEqual([new Named('a value')]);
    });

    it('must leave the empty frontier empty', () => {
      expect(Frontier.empty(start).relabel(new Named('a value'))).toEqual(
        Frontier.empty(start)
      );
    });
  });

  describe('mismatch', () => {
    it('must place what was expected at its distance from the origin', () => {
      const mismatch = Frontier.expected(next, digit, letter).mismatch(start);

      expect(mismatch.offset()).toBe(1);
      expect(mismatch.expected()).toEqual([digit, letter]);
    });

    it('must quote the token found at its point', () => {
      expect(String(Frontier.expected(next, digit).mismatch(start))).toBe(
        "Expected a digit, got '!'"
      );
    });

    it('must name the end of input as what was found there', () => {
      expect(
        String(Frontier.expected(end, new EndOfInput()).mismatch(start))
      ).toBe('Expected end of input, got end of input');
    });
  });

  describe('toString', () => {
    it('must render as the mismatch at its point', () => {
      expect(String(Frontier.expected(next, digit))).toBe(
        "Expected a digit, got '!'"
      );
    });
  });

  describe('equals', () => {
    it('must equal a frontier at the same point with the same content', () => {
      expect(
        Frontier.expected(next, digit).equals(
          Frontier.expected(next, new Named('a digit'))
        )
      ).toBe(true);
    });

    it('must not equal a frontier at another point or with other content', () => {
      expect(
        Frontier.expected(next, digit).equals(Frontier.expected(start, digit))
      ).toBe(false);
      expect(
        Frontier.expected(next, digit).equals(Frontier.expected(next, letter))
      ).toBe(false);
      expect(Frontier.expected(next, digit).equals('a digit')).toBe(false);
    });
  });
});
