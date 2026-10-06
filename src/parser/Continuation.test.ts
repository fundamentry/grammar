import { describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { type Node, Option } from '#project/tree';

import { Continuation } from './Continuation.js';
import { Frontier } from './Frontier.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

const label = new Named('a label');

describe('Continuation', () => {
  describe('succeed', () => {
    it('must hand a step to what it was made of', () => {
      const found: Point.Step<string, Node>[] = [];
      const step = { value: new Option(), rest: second };

      Continuation.of<string>(each => found.push(each)).succeed(step);

      expect(found).toEqual([step]);
    });
  });

  describe('with', () => {
    it('must hand a step to what it is given instead', () => {
      const found: string[] = [];

      Continuation.of<string>(() => found.push('original'))
        .with(() => found.push('replacement'))
        .succeed({ value: new Option(), rest: second });

      expect(found).toEqual(['replacement']);
    });

    it('must keep its label', () => {
      const mismatch = Frontier.expected(start, new Named('a'));

      expect(
        Continuation.of<string>(() => undefined)
          .labelled(start, label)
          .with(() => undefined)
          .relabel(mismatch)
      ).toEqual(Frontier.expected(start, label));
    });
  });

  describe('map', () => {
    it('must map a value before handing it on', () => {
      const found: Point.Step<string, Node>[] = [];

      Continuation.of<string>(each => found.push(each))
        .map((value: Node) => new Option(value))
        .succeed({ value: new Option(), rest: second });

      expect(found).toEqual([
        { value: new Option(new Option()), rest: second },
      ]);
    });

    it('must keep its label', () => {
      expect(
        Continuation.of<string>(() => undefined)
          .labelled(start, label)
          .map((value: Node) => value)
          .relabel(Frontier.expected(start, new Named('a')))
      ).toEqual(Frontier.expected(start, label));
    });
  });

  describe('labelled', () => {
    it('must start a label where none starts at the point', () => {
      expect(
        Continuation.of<string>(() => undefined)
          .labelled(second, label)
          .relabel(Frontier.expected(second, new Named('a')))
      ).toEqual(Frontier.expected(second, label));
    });

    it('must keep the label that already starts at the point', () => {
      expect(
        Continuation.of<string>(() => undefined)
          .labelled(start, label)
          .labelled(start, new Named('an inner label'))
          .relabel(Frontier.expected(start, new Named('a')))
      ).toEqual(Frontier.expected(start, label));
    });

    it('must replace a label that starts elsewhere', () => {
      const inner = new Named('an inner label');

      expect(
        Continuation.of<string>(() => undefined)
          .labelled(start, label)
          .labelled(second, inner)
          .relabel(Frontier.expected(second, new Named('a')))
      ).toEqual(Frontier.expected(second, inner));
    });
  });

  describe('relabel', () => {
    it('must leave a mismatch alone without a label', () => {
      const mismatch = Frontier.expected(start, new Named('a'));

      expect(Continuation.of<string>(() => undefined).relabel(mismatch)).toBe(
        mismatch
      );
    });

    it('must not relabel a mismatch past where its label starts', () => {
      const mismatch = Frontier.expected(second, new Named('b'));

      expect(
        Continuation.of<string>(() => undefined)
          .labelled(start, label)
          .relabel(mismatch)
      ).toBe(mismatch);
    });
  });
});
