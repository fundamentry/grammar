import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { EndOfInput, Named } from '#project/expectation';

import { Mismatch } from './Mismatch.js';

const start = Point.of('a!');

const { rest: next } = start.span(value => value === 'a');

const { rest: end } = next.span(() => true);

const digit = new Named('a digit');

const letter = new Named('a letter');

describe('Mismatch', () => {
  describe('empty', () => {
    it('must expect nothing and say nothing at its point', () => {
      const mismatch = Mismatch.empty(start);

      expect(mismatch.at()).toBe(start);
      expect(mismatch.expected()).toEqual([]);
      expect(mismatch.messages()).toEqual([]);
      expect(String(mismatch)).toBe('');
    });
  });

  describe('expected', () => {
    it('must expect each distinct expectation once, in order', () => {
      expect(
        Mismatch.expected(next, digit, letter, new Named('a digit')).expected()
      ).toEqual([digit, letter]);
    });
  });

  describe('compareReach', () => {
    it('must order mismatches by how far they got', () => {
      expect(
        Mismatch.expected(next, digit).compareReach(
          Mismatch.expected(start, digit)
        )
      ).toBeGreaterThan(0);
    });

    it('must order an empty mismatch before any other, wherever it is', () => {
      expect(
        Mismatch.empty(end).compareReach(Mismatch.expected(start, digit))
      ).toBeLessThan(0);
      expect(
        Mismatch.expected(start, digit).compareReach(Mismatch.empty(end))
      ).toBeGreaterThan(0);
    });

    it('must order empty mismatches alike', () => {
      expect(Mismatch.empty(start).compareReach(Mismatch.empty(end))).toBe(0);
    });
  });

  describe('merge', () => {
    it('must keep the mismatch that got further', () => {
      const near = Mismatch.expected(start, digit);
      const far = Mismatch.expected(next, letter);

      expect(near.merge(far)).toBe(far);
      expect(far.merge(near)).toBe(far);
    });

    it('must combine what was expected and said at the same point, in order and without repeats', () => {
      const merged = Mismatch.expected(next, digit)
        .merge(Mismatch.expected(next, letter))
        .merge(Mismatch.expected(next, new Named('a digit')))
        .merge(Mismatch.message(next, 'odd'))
        .merge(Mismatch.message(next, 'odd'));

      expect(merged.expected()).toEqual([digit, letter]);
      expect(merged.messages()).toEqual(['odd']);
    });

    it('must leave anything merged with the empty mismatch at its start unchanged', () => {
      const mismatch = Mismatch.expected(start, digit);

      expect(Mismatch.empty(start).merge(mismatch)).toEqual(mismatch);
      expect(mismatch.merge(Mismatch.empty(start))).toEqual(mismatch);
    });

    it('must leave anything merged with an empty mismatch further on unchanged', () => {
      const mismatch = Mismatch.expected(start, digit);

      expect(Mismatch.empty(end).merge(mismatch)).toEqual(mismatch);
      expect(mismatch.merge(Mismatch.empty(end))).toEqual(mismatch);
    });
  });

  describe('relabel', () => {
    it('must replace what was expected and keep what was said', () => {
      const relabelled = Mismatch.expected(start, digit)
        .merge(Mismatch.message(start, 'odd'))
        .relabel(new Named('a value'));

      expect(String(relabelled)).toBe("Expected a value, got 'a'; odd");
    });

    it('must leave the empty mismatch empty', () => {
      expect(Mismatch.empty(start).relabel(new Named('a value'))).toEqual(
        Mismatch.empty(start)
      );
    });
  });

  describe('toString', () => {
    it('must list the alternatives that were expected and what was found', () => {
      expect(
        String(
          Mismatch.expected(next, digit)
            .merge(Mismatch.expected(next, letter))
            .merge(Mismatch.expected(next, new EndOfInput()))
        )
      ).toBe("Expected a digit, a letter, or end of input, got '!'");
    });

    it('must name the end of input as what was found there', () => {
      expect(String(Mismatch.expected(end, digit))).toBe(
        'Expected a digit, got end of input'
      );
    });

    it('must render messages on their own', () => {
      expect(String(Mismatch.message(next, '256 exceeds 255'))).toBe(
        '256 exceeds 255'
      );
    });
  });

  describe('equals', () => {
    it('must equal a mismatch at the same point with the same content', () => {
      expect(
        Mismatch.expected(next, digit).equals(
          Mismatch.expected(next, new Named('a digit'))
        )
      ).toBe(true);
    });

    it('must not equal a mismatch at another point or with other content', () => {
      expect(
        Mismatch.expected(next, digit).equals(Mismatch.expected(start, digit))
      ).toBe(false);
      expect(
        Mismatch.expected(next, digit).equals(Mismatch.expected(next, letter))
      ).toBe(false);
      expect(Mismatch.expected(next, digit).equals('a digit')).toBe(false);
    });
  });
});
